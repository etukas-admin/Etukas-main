import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { HttpError, sendCreated, sendOk } from "../../utils/http.js";
import { Role, AdminNotificationType } from "@prisma/client";

export const chatRouter = Router();

// ─── User routes (authenticated, any role) ─────────────────────────────────

/** Create or reuse an open chat session */
chatRouter.post("/sessions", requireAuth, async (req, res, next) => {
  try {
    const { subject } = z.object({ subject: z.string().trim().max(200).optional() }).parse(req.body);
    // Return existing open session if one exists
    let session = await prisma.chatSession.findFirst({
      where: { userId: req.user!.id, status: "OPEN" },
      include: { messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true, roles: true } } } } }
    });
    if (!session) {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } });
      const firstName = user?.name ? user.name.trim().split(" ")[0] : "there";
      const adminUser = await prisma.user.findFirst({
        where: { roles: { has: Role.ADMIN } },
        select: { id: true }
      });

      session = await prisma.chatSession.create({
        data: {
          userId: req.user!.id,
          subject: subject ?? "Support Chat",
          messages: {
            create: {
              senderId: adminUser?.id ?? req.user!.id,
              senderRole: "ADMIN",
              content: `Hi ${firstName}! 👋 Welcome to Etukas Support. How can our support team help you today?`
            }
          }
        },
        include: { messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { id: true, name: true, roles: true } } } } }
      });

      // Notify admins about new chat session
      await prisma.adminNotification.create({
        data: {
          type: AdminNotificationType.CHAT_MESSAGE,
          title: "New Chat Session",
          body: `${user?.name ?? "A user"} started a new support chat`,
          metadata: { sessionId: session.id, userId: req.user!.id }
        }
      });
    }
    return sendOk(res, session);
  } catch (error) {
    next(error);
  }
});

/** Get user's own sessions */
chatRouter.get("/sessions", requireAuth, async (req, res, next) => {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: req.user!.id },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { name: true, roles: true } } }
        }
      },
      orderBy: { updatedAt: "desc" }
    });
    return sendOk(res, sessions);
  } catch (error) {
    next(error);
  }
});

/** Get messages in a session (user can only see their own) */
chatRouter.get("/sessions/:id/messages", requireAuth, async (req, res, next) => {
  try {
    const session = await prisma.chatSession.findUnique({ where: { id: req.params.id } });
    if (!session) throw new HttpError(404, "SESSION_NOT_FOUND", "Chat session not found");
    const isAdmin = req.user!.roles.includes(Role.ADMIN);
    if (!isAdmin && session.userId !== req.user!.id) {
      throw new HttpError(403, "FORBIDDEN", "You do not have access to this chat session");
    }
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: req.params.id },
      include: { sender: { select: { id: true, name: true, roles: true } } },
      orderBy: { createdAt: "asc" }
    });
    // Mark unread admin messages as read (for user)
    if (!isAdmin) {
      await prisma.chatMessage.updateMany({
        where: { sessionId: req.params.id, readAt: null, senderRole: "ADMIN" },
        data: { readAt: new Date() }
      });
    }
    return sendOk(res, messages);
  } catch (error) {
    next(error);
  }
});

/** Send a message */
chatRouter.post("/sessions/:id/messages", requireAuth, async (req, res, next) => {
  try {
    const { content } = z.object({ content: z.string().trim().min(1).max(2000) }).parse(req.body);
    const session = await prisma.chatSession.findUnique({ where: { id: req.params.id } });
    if (!session) throw new HttpError(404, "SESSION_NOT_FOUND", "Chat session not found");
    if (session.status === "CLOSED") throw new HttpError(400, "SESSION_CLOSED", "This chat session is closed");
    const isAdmin = req.user!.roles.includes(Role.ADMIN);
    if (!isAdmin && session.userId !== req.user!.id) {
      throw new HttpError(403, "FORBIDDEN", "You do not have access to this chat session");
    }
    const senderRole = isAdmin ? "ADMIN" : "USER";
    const message = await prisma.chatMessage.create({
      data: { sessionId: session.id, senderId: req.user!.id, senderRole, content },
      include: { sender: { select: { id: true, name: true, roles: true } } }
    });
    // Update session updatedAt
    await prisma.chatSession.update({ where: { id: session.id }, data: { updatedAt: new Date() } });

    // If user sends message, create admin notification
    if (!isAdmin) {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } });
      await prisma.adminNotification.create({
        data: {
          type: AdminNotificationType.CHAT_MESSAGE,
          title: "New Chat Message",
          body: `${user?.name ?? "A user"}: ${content.slice(0, 100)}`,
          metadata: { sessionId: session.id, userId: req.user!.id }
        }
      });
    }
    return sendCreated(res, message);
  } catch (error) {
    next(error);
  }
});

// ─── Admin chat routes ─────────────────────────────────────────────────────

const adminChatRouter = Router();
adminChatRouter.use(requireAuth, requireRole(Role.ADMIN));

/** Get all chat sessions */
adminChatRouter.get("/sessions", async (_req, res, next) => {
  try {
    const sessions = await prisma.chatSession.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, roles: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { name: true, roles: true } } }
        }
      },
      orderBy: { updatedAt: "desc" }
    });
    return sendOk(res, sessions);
  } catch (error) {
    next(error);
  }
});

/** Close a chat session */
adminChatRouter.patch("/sessions/:id/close", async (req, res, next) => {
  try {
    const session = await prisma.chatSession.update({
      where: { id: req.params.id },
      data: { status: "CLOSED" }
    });
    return sendOk(res, session);
  } catch (error) {
    next(error);
  }
});

/** Get all admin notifications */
adminChatRouter.get("/notifications", async (req, res, next) => {
  try {
    const unreadOnly = req.query.unread === "true";
    const notifications = await prisma.adminNotification.findMany({
      where: unreadOnly ? { readAt: null } : {},
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return sendOk(res, notifications);
  } catch (error) {
    next(error);
  }
});

/** Mark notification(s) as read */
adminChatRouter.patch("/notifications/read", async (req, res, next) => {
  try {
    const { ids } = z.object({ ids: z.array(z.string()).optional() }).parse(req.body);
    if (ids && ids.length > 0) {
      await prisma.adminNotification.updateMany({
        where: { id: { in: ids }, readAt: null },
        data: { readAt: new Date() }
      });
    } else {
      // Mark all as read
      await prisma.adminNotification.updateMany({
        where: { readAt: null },
        data: { readAt: new Date() }
      });
    }
    return sendOk(res, { success: true });
  } catch (error) {
    next(error);
  }
});

/** Get unread notification count */
adminChatRouter.get("/notifications/count", async (_req, res, next) => {
  try {
    const count = await prisma.adminNotification.count({ where: { readAt: null } });
    return sendOk(res, { count });
  } catch (error) {
    next(error);
  }
});

/** Mark messages as read (admin reading user messages) */
adminChatRouter.patch("/sessions/:id/read", async (req, res, next) => {
  try {
    await prisma.chatMessage.updateMany({
      where: { sessionId: req.params.id, readAt: null, senderRole: "USER" },
      data: { readAt: new Date() }
    });
    return sendOk(res, { success: true });
  } catch (error) {
    next(error);
  }
});

export { adminChatRouter };
