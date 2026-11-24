import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { HttpError, sendCreated, sendOk } from "../../utils/http.js";
import { Role, AdminNotificationType } from "@prisma/client";
import { loadTechnicians } from "../technicians/technicians.routes.js";

export const chatRouter = Router();

type PartnerChatInfo = {
  partnerId: string | null;
  storeName: string | null;
  serviceName: string | null;
  partnerType: "SELLER" | "TECHNICIAN";
  city: string | null;
};

/**
 * Resolve the database User ID for chat persistence.
 * Handles file-backed technician partners whose JWT id may be their technician record id
 * rather than a Prisma User row, ensuring they can always open support chats cleanly.
 */
async function resolveChatUser(authUser: { id: string; email?: string; roles: Role[] }) {
  const byId = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: {
      sellerProfile: {
        include: {
          stores: { select: { name: true, city: true }, take: 1 }
        }
      }
    }
  });
  if (byId) return byId;

  // Try matching by email (e.g., technician whose JWT id came from technicians.json)
  if (authUser.email) {
    const byEmail = await prisma.user.findFirst({
      where: { email: { equals: authUser.email, mode: "insensitive" } },
      include: {
        sellerProfile: {
          include: {
            stores: { select: { name: true, city: true }, take: 1 }
          }
        }
      }
    });
    if (byEmail) return byEmail;
  }

  // Fallback for file-backed technician accounts not yet mirrored in Postgres
  const technicians = loadTechnicians();
  const tech = technicians.find(
    (t) =>
      t.id === authUser.id ||
      (authUser.email && t.email?.toLowerCase() === authUser.email.toLowerCase())
  );
  if (tech) {
    const existingByContact = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: tech.email, mode: "insensitive" } },
          { mobile: tech.mobile }
        ]
      },
      include: {
        sellerProfile: {
          include: {
            stores: { select: { name: true, city: true }, take: 1 }
          }
        }
      }
    });
    if (existingByContact) return existingByContact;

    return prisma.user.create({
      data: {
        name: tech.name || tech.businessName || "Etukas Partner",
        email: tech.email || `${tech.partnerId.toLowerCase()}@etukas.partner`,
        mobile: tech.mobile || `9${Date.now().toString().slice(-9)}`,
        passwordHash: tech.passwordHash || "file-backed-partner",
        roles: [Role.SELLER],
        sellerProfile: {
          create: {
            sellerId: tech.partnerId,
            contactPerson: tech.name || "Partner",
            businessName: tech.businessName || tech.name || "Technician Service",
            verificationStatus:
              tech.verificationStatus === "APPROVED"
                ? "APPROVED"
                : tech.verificationStatus === "REJECTED"
                ? "REJECTED"
                : "PENDING"
          }
        }
      },
      include: {
        sellerProfile: {
          include: {
            stores: { select: { name: true, city: true }, take: 1 }
          }
        }
      }
    });
  }

  return null;
}

function buildPartnerChatInfo(
  user: {
    id: string;
    name: string;
    email: string;
    mobile?: string | null;
    roles: Role[];
    sellerProfile?: {
      sellerId: string | null;
      businessName: string;
      stores?: { name: string; city: string }[];
    } | null;
  } | null | undefined,
  technicians: ReturnType<typeof loadTechnicians>
): PartnerChatInfo | null {
  if (!user) return null;

  const tech = technicians.find(
    (t) =>
      t.id === user.id ||
      (user.sellerProfile?.sellerId && t.partnerId?.toLowerCase() === user.sellerProfile.sellerId.toLowerCase()) ||
      (user.email && t.email?.toLowerCase() === user.email.toLowerCase()) ||
      (user.mobile && t.mobile === user.mobile)
  );

  const hasPartnerRole = user.roles.some(
    (r) => r === Role.SELLER || r === Role.MANUFACTURER
  );

  if (!user.sellerProfile && !tech && !hasPartnerRole) {
    return null;
  }

  const partnerId = user.sellerProfile?.sellerId || tech?.partnerId || null;
  const isTechnician = Boolean(tech || partnerId?.toUpperCase().startsWith("TECH"));
  const primaryStore = user.sellerProfile?.stores?.[0];

  if (isTechnician) {
    const serviceName =
      tech?.businessName ||
      user.sellerProfile?.businessName ||
      (tech?.categories?.length ? tech.categories.join(", ") : null);
    return {
      partnerId,
      storeName: primaryStore?.name || null,
      serviceName: serviceName || null,
      partnerType: "TECHNICIAN",
      city: tech?.city || primaryStore?.city || null
    };
  }

  const storeName = primaryStore?.name || user.sellerProfile?.businessName || null;
  return {
    partnerId,
    storeName,
    serviceName: null,
    partnerType: "SELLER",
    city: primaryStore?.city || null
  };
}

function formatPartnerLabel(
  userName: string | null | undefined,
  partnerInfo: PartnerChatInfo | null
): string {
  const baseName = userName?.trim() || "A user";
  if (!partnerInfo) return baseName;
  const parts: string[] = [];
  if (partnerInfo.partnerId) parts.push(partnerInfo.partnerId);
  const business = partnerInfo.storeName || partnerInfo.serviceName;
  if (business) parts.push(business);
  return parts.length > 0 ? `${baseName} (${parts.join(" · ")})` : baseName;
}

// ─── User routes (authenticated, any role) ─────────────────────────────────

/** Create or reuse an open chat session */
chatRouter.post("/sessions", requireAuth, async (req, res, next) => {
  try {
    const { subject } = z.object({ subject: z.string().trim().max(200).optional() }).parse(req.body ?? {});
    const resolvedUser = await resolveChatUser(req.user!);
    if (!resolvedUser) {
      throw new HttpError(404, "USER_NOT_FOUND", "Unable to locate your account for support chat.");
    }

    const technicians = loadTechnicians();
    const partnerInfo = buildPartnerChatInfo(resolvedUser, technicians);

    // Return existing open session if one exists
    let session = await prisma.chatSession.findFirst({
      where: { userId: resolvedUser.id, status: "OPEN" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: { select: { id: true, name: true, roles: true } } }
        }
      }
    });

    if (!session) {
      const firstName = resolvedUser.name ? resolvedUser.name.trim().split(/\s+/)[0] : "there";
      const adminUser = await prisma.user.findFirst({
        where: { roles: { has: Role.ADMIN } },
        select: { id: true }
      });

      const defaultSubject = partnerInfo ? "Partner Support Chat" : "Support Chat";
      const welcomeText = partnerInfo
        ? `Hi ${firstName}! 👋 Welcome to Etukas Partner Support. How can we help with your ${
            partnerInfo.partnerType === "TECHNICIAN" ? "service profile or bookings" : "store, products, or orders"
          } today?`
        : `Hi ${firstName}! 👋 Welcome to Etukas Support. How can our support team help you today?`;

      session = await prisma.chatSession.create({
        data: {
          userId: resolvedUser.id,
          subject: subject || defaultSubject,
          messages: {
            create: {
              senderId: adminUser?.id ?? resolvedUser.id,
              senderRole: "ADMIN",
              content: welcomeText
            }
          }
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            include: { sender: { select: { id: true, name: true, roles: true } } }
          }
        }
      });

      // Notify admins about new chat session (including Partner ID & Store/Service Name for partners)
      const label = formatPartnerLabel(resolvedUser.name, partnerInfo);
      await prisma.adminNotification.create({
        data: {
          type: AdminNotificationType.CHAT_MESSAGE,
          title: partnerInfo ? "New Partner Support Chat" : "New Chat Session",
          body: `${label} started a new support chat`,
          metadata: {
            sessionId: session.id,
            userId: resolvedUser.id,
            ...(partnerInfo ? { partnerId: partnerInfo.partnerId, storeName: partnerInfo.storeName || partnerInfo.serviceName } : {})
          }
        }
      });
    }

    return sendOk(res, { ...session, partnerInfo });
  } catch (error) {
    next(error);
  }
});

/** Get user's own sessions */
chatRouter.get("/sessions", requireAuth, async (req, res, next) => {
  try {
    const resolvedUser = await resolveChatUser(req.user!);
    if (!resolvedUser) return sendOk(res, []);

    const sessions = await prisma.chatSession.findMany({
      where: { userId: resolvedUser.id },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { id: true, name: true, roles: true } } }
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
    if (!isAdmin) {
      const resolvedUser = await resolveChatUser(req.user!);
      if (!resolvedUser || session.userId !== resolvedUser.id) {
        throw new HttpError(403, "FORBIDDEN", "You do not have access to this chat session");
      }
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
    let senderId = req.user!.id;
    let resolvedUser: Awaited<ReturnType<typeof resolveChatUser>> = null;

    if (!isAdmin) {
      resolvedUser = await resolveChatUser(req.user!);
      if (!resolvedUser || session.userId !== resolvedUser.id) {
        throw new HttpError(403, "FORBIDDEN", "You do not have access to this chat session");
      }
      senderId = resolvedUser.id;
    }

    const senderRole = isAdmin ? "ADMIN" : "USER";
    const message = await prisma.chatMessage.create({
      data: { sessionId: session.id, senderId, senderRole, content },
      include: { sender: { select: { id: true, name: true, roles: true } } }
    });

    // Update session updatedAt
    await prisma.chatSession.update({ where: { id: session.id }, data: { updatedAt: new Date() } });

    // If user/partner sends message, create admin notification with partner details when applicable
    if (!isAdmin && resolvedUser) {
      const technicians = loadTechnicians();
      const partnerInfo = buildPartnerChatInfo(resolvedUser, technicians);
      const label = formatPartnerLabel(resolvedUser.name, partnerInfo);

      await prisma.adminNotification.create({
        data: {
          type: AdminNotificationType.CHAT_MESSAGE,
          title: partnerInfo ? "Partner Support Message" : "New Chat Message",
          body: `${label}: ${content.slice(0, 120)}`,
          metadata: {
            sessionId: session.id,
            userId: resolvedUser.id,
            ...(partnerInfo ? { partnerId: partnerInfo.partnerId, storeName: partnerInfo.storeName || partnerInfo.serviceName } : {})
          }
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

/** Get all chat sessions enriched with Partner ID, Store/Service name, and unread count */
adminChatRouter.get("/sessions", async (_req, res, next) => {
  try {
    const technicians = loadTechnicians();
    const sessions = await prisma.chatSession.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
            roles: true,
            sellerProfile: {
              select: {
                sellerId: true,
                businessName: true,
                businessType: true,
                verificationStatus: true,
                stores: {
                  select: { name: true, city: true },
                  take: 1
                }
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { id: true, name: true, roles: true } } }
        },
        _count: {
          select: {
            messages: {
              where: { senderRole: "USER", readAt: null }
            }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    const enriched = sessions.map((session) => {
      const partnerInfo = buildPartnerChatInfo(session.user, technicians);
      return {
        id: session.id,
        userId: session.userId,
        subject: session.subject,
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messages: session.messages,
        unreadCount: session._count?.messages ?? 0,
        user: session.user
          ? {
              id: session.user.id,
              name: session.user.name,
              email: session.user.email,
              mobile: session.user.mobile,
              roles: session.user.roles
            }
          : undefined,
        partnerInfo
      };
    });

    return sendOk(res, enriched);
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
    const { ids } = z.object({ ids: z.array(z.string()).optional() }).parse(req.body ?? {});
    if (ids && ids.length > 0) {
      await prisma.adminNotification.updateMany({
        where: { id: { in: ids }, readAt: null },
        data: { readAt: new Date() }
      });
    } else {
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
    const now = new Date();
    await prisma.chatMessage.updateMany({
      where: { sessionId: req.params.id, readAt: null, senderRole: "USER" },
      data: { readAt: now }
    });
    return sendOk(res, { success: true });
  } catch (error) {
    next(error);
  }
});

export { adminChatRouter };
