import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { marketplaceApi, type ChatMessage, type ChatSession, getStoredUser, type User } from "../../services/api";
import { isPartnerUser } from "../../lib/authRoles";
import { MessageCircle, X, Send, ChevronDown, Loader2, Headphones, LogIn, AlertCircle, CheckCheck } from "lucide-react";

export const OPEN_SUPPORT_CHAT_EVENT = "etukas_open_support_chat";

export function UserChatWidget() {
  const [storedUser, setStoredUser] = useState<User | null>(() => getStoredUser());
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["auth", "me", storedUser?.id ?? "guest"],
    queryFn: marketplaceApi.me,
    initialData: storedUser ?? undefined,
    enabled: Boolean(storedUser),
    retry: false
  });
  const user = currentUser ?? storedUser;
  const partnerAccount = isPartnerUser(user);
  const userName = user?.name ? user.name.trim().split(/\s+/)[0] : "there";

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [text, setText] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [popIn, setPopIn] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Stay reactive to login/logout/account switching so chat sessions never leak across accounts
  useEffect(() => {
    const syncAuth = () => {
      const next = getStoredUser();
      setStoredUser((prev) => {
        if (prev?.id !== next?.id) {
          setSessionId(null);
          setText("");
          setErrorMessage(null);
          void queryClient.invalidateQueries({ queryKey: ["chat", "my-sessions"] });
        }
        return next;
      });
    };
    window.addEventListener("etukas_auth_change", syncAuth);
    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener("etukas_auth_change", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, [queryClient]);

  // Show chat bubble after app load with a pop animation (desktop/tablet)
  useEffect(() => {
    let popTimer: ReturnType<typeof setTimeout> | null = null;
    const showTimer = setTimeout(() => {
      setIsVisible(true);
      popTimer = setTimeout(() => setPopIn(true), 30);
    }, 1800);
    return () => {
      clearTimeout(showTimer);
      if (popTimer) clearTimeout(popTimer);
    };
  }, []);

  const pollInterval = isOpen && !isMinimized && sessionId ? 4000 : undefined;

  // Query existing messages for the active session
  const messages = useQuery<ChatMessage[]>({
    queryKey: ["chat", "messages", sessionId],
    queryFn: ({ signal }) => marketplaceApi.chatMessages(sessionId!, { signal }),
    enabled: Boolean(sessionId && isOpen && user),
    refetchInterval: pollInterval,
    refetchIntervalInBackground: false
  });

  // Query user's sessions to resume an existing OPEN session immediately
  const userSessions = useQuery<ChatSession[]>({
    queryKey: ["chat", "my-sessions", user?.id ?? "guest"],
    queryFn: ({ signal }) => marketplaceApi.chatMySessions({ signal }),
    enabled: Boolean(user && isOpen),
    retry: 1
  });

  // Only auto-select an OPEN session (never trap the user inside a CLOSED session)
  useEffect(() => {
    if (userSessions.data && !sessionId) {
      const openSession = userSessions.data.find((s) => s.status === "OPEN");
      if (openSession) {
        setSessionId(openSession.id);
      }
    }
  }, [userSessions.data, sessionId]);

  const chatSubject = partnerAccount ? "Partner Support Chat" : "Support Chat";

  // Mutation to initialize or resume an open support session
  const startSession = useMutation({
    mutationFn: () => marketplaceApi.chatStartSession(chatSubject),
    onSuccess: (session: ChatSession) => {
      setSessionId(session.id);
      setErrorMessage(null);
      if (session.messages && session.messages.length > 0) {
        queryClient.setQueryData(["chat", "messages", session.id], session.messages);
      }
      void queryClient.invalidateQueries({ queryKey: ["chat", "my-sessions"] });
    },
    onError: (err: unknown) => {
      console.warn("Could not auto-start chat session:", err);
      const message = err instanceof Error ? err.message : "Could not connect to support right now.";
      setErrorMessage(message);
    }
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.data, isOpen]);

  // Focus textarea when chat window opens
  useEffect(() => {
    if (isOpen && !isMinimized && user) {
      const focusTimer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(focusTimer);
    }
  }, [isOpen, isMinimized, user]);

  const handleOpen = useCallback(() => {
    setIsVisible(true);
    setPopIn(true);
    setIsOpen(true);
    setIsMinimized(false);
    setErrorMessage(null);
    if (user && !sessionId && !startSession.isPending) {
      startSession.mutate();
    }
  }, [user, sessionId, startSession]);

  useEffect(() => {
    const onOpenSupportChat = () => handleOpen();
    window.addEventListener(OPEN_SUPPORT_CHAT_EVENT, onOpenSupportChat);
    return () => window.removeEventListener(OPEN_SUPPORT_CHAT_EVENT, onOpenSupportChat);
  }, [handleOpen]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending || !user) return;

    setIsSending(true);
    setErrorMessage(null);

    try {
      let activeSessionId = sessionId;

      if (!activeSessionId) {
        const session = await marketplaceApi.chatStartSession(chatSubject);
        activeSessionId = session.id;
        setSessionId(session.id);
      }

      let newMsg: ChatMessage;
      try {
        newMsg = await marketplaceApi.chatSendMessage(activeSessionId, trimmed);
      } catch (sendErr: unknown) {
        // If an admin closed the previous session while the window was open, start a fresh open session automatically
        const msg = sendErr instanceof Error ? sendErr.message.toLowerCase() : "";
        if (msg.includes("closed") || msg.includes("not found")) {
          const freshSession = await marketplaceApi.chatStartSession(chatSubject);
          activeSessionId = freshSession.id;
          setSessionId(freshSession.id);
          newMsg = await marketplaceApi.chatSendMessage(activeSessionId, trimmed);
        } else {
          throw sendErr;
        }
      }

      queryClient.setQueryData<ChatMessage[]>(["chat", "messages", activeSessionId], (prev) => [
        ...(prev ?? []),
        newMsg
      ]);
      setText("");
      void queryClient.invalidateQueries({ queryKey: ["chat", "my-sessions"] });
    } catch (err: unknown) {
      console.error("Failed to send support message:", err);
      const errMsg =
        err instanceof Error
          ? err.message
          : "Failed to send message. Please check your connection and try again.";
      setErrorMessage(errMsg);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const hasUnread = messages.data?.some((m) => m.senderRole === "ADMIN" && !m.readAt);
  const messageList = messages.data ?? [];
  const showFallbackGreeting = !messages.isLoading && messageList.length === 0;

  const getMessageStatusColor = (msg: ChatMessage) => {
    if (msg.senderRole !== "USER") return "transparent";
    return msg.readAt ? "#c7f9ff" : "rgba(255,255,255,0.7)";
  };

  const headerTitle = partnerAccount ? "Etukas Partner Support" : "Etukas Support Team";
  const partnerSubtitle = partnerAccount
    ? [user?.sellerId ? `ID: ${user.sellerId}` : null, "Support Team is active"].filter(Boolean).join(" · ")
    : "Support Team is active";

  return (
    <div className="fixed bottom-[86px] right-3 z-[9999] md:right-[18px]">
      {/* Floating Chat Bubble Button (desktop/tablet only; mobile uses Header Support icon) */}
      {isVisible && (!isOpen || isMinimized) && (
        <div className="hidden md:block">
          <button
            id="user-chat-open-btn"
            type="button"
            onClick={handleOpen}
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #e11d48, #be123c)",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 6px 28px rgba(225,29,72,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              animation: popIn ? "chatPopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" : "none",
              transform: popIn ? undefined : "scale(0)",
              transition: "box-shadow 0.2s"
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            title={partnerAccount ? "Chat with Etukas Partner Support" : "Chat with Support Team"}
          >
            <MessageCircle size={27} color="#fff" />
            {hasUnread && (
              <span style={{
                position: "absolute", top: "2px", right: "2px",
                width: "15px", height: "15px", borderRadius: "50%",
                background: "#22c55e", border: "2.5px solid white",
                animation: "pulse 2s infinite"
              }} />
            )}
          </button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && !isMinimized && (
        <div style={{
          width: "min(360px, calc(100vw - 24px))",
          maxHeight: "min(540px, calc(100dvh - 110px))",
          height: "500px",
          borderRadius: "20px",
          boxShadow: "0 12px 50px rgba(0,0,0,0.22)",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid rgba(225,29,72,0.15)"
        }}>
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #e11d48, #be123c)",
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
              <div style={{
                width: "38px", height: "38px", borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0
              }}>
                <Headphones size={20} color="#fff" />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: "15px", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {headerTitle}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", display: "inline-block", flexShrink: 0 }} />
                  <p style={{ color: "rgba(255,255,255,0.88)", fontSize: "12px", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {partnerSubtitle}
                  </p>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "8px", cursor: "pointer", padding: "6px", color: "#fff", display: "flex" }}
                title="Minimize"
                aria-label="Minimize support chat"
              >
                <ChevronDown size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "8px", cursor: "pointer", padding: "6px", color: "#fff", display: "flex" }}
                title="Close"
                aria-label="Close support chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Content Area */}
          {!user ? (
            <div style={{ padding: "36px 20px", textAlign: "center", background: "#f8f9fb", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
              <div style={{ width: "58px", height: "58px", borderRadius: "50%", background: "#ffe4e6", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <Headphones size={30} color="#e11d48" />
              </div>
              <h3 style={{ fontSize: "17px", fontWeight: 700, margin: "0 0 8px", color: "#111827" }}>Support Team Chat</h3>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 20px", lineHeight: "1.5", maxWidth: "280px" }}>
                Sign in to connect directly with the Etukas Support Team to resolve your doubts, ask about products, orders, or partner onboarding.
              </p>
              <Link
                to="/login"
                id="user-chat-signin-btn"
                onClick={() => setIsOpen(false)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  width: "100%",
                  maxWidth: "260px",
                  padding: "12px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #e11d48, #be123c)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "14px",
                  textDecoration: "none",
                  boxShadow: "0 4px 12px rgba(225,29,72,0.3)"
                }}
              >
                <LogIn size={16} /> Sign in to Chat
              </Link>
            </div>
          ) : (
            <>
              {/* Message Stream */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#f8f9fb" }}>
                {/* Show fallback welcome only when no messages exist yet (avoids duplicating the server welcome message) */}
                {showFallbackGreeting && (
                  <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "14px" }}>
                    <div style={{
                      width: "30px", height: "30px", borderRadius: "50%",
                      background: "linear-gradient(135deg,#e11d48,#be123c)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginRight: "8px", flexShrink: 0, fontSize: "11px", color: "#fff", fontWeight: 700
                    }}>
                      <Headphones size={15} color="#fff" />
                    </div>
                    <div style={{
                      maxWidth: "82%",
                      padding: "12px 14px",
                      borderRadius: "18px 18px 18px 4px",
                      background: "#fff",
                      color: "#1f2937",
                      fontSize: "13.5px",
                      lineHeight: "1.5",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      border: "1px solid rgba(225,29,72,0.12)"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 700, color: "#be123c", fontSize: "11.5px" }}>Support Team</span>
                        <span style={{ fontSize: "10px", color: "#9ca3af" }}>· Just now</span>
                      </div>
                      {partnerAccount
                        ? `Hi ${userName}! 👋 Welcome to Etukas Partner Support. Ask us anything about your store, products, bookings, orders, or payouts.`
                        : `Hi ${userName}! 👋 Welcome to Etukas Support. How can our support team help you today?`}
                    </div>
                  </div>
                )}

                {messages.isLoading && messageList.length === 0 && (
                  <div style={{ display: "flex", justifyContent: "center", padding: "24px 0", color: "#9ca3af" }}>
                    <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "#e11d48" }} />
                  </div>
                )}

                {/* Conversation messages */}
                {messageList.map((msg) => {
                  const isUser = msg.senderRole === "USER";
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        justifyContent: isUser ? "flex-end" : "flex-start",
                        marginBottom: "12px"
                      }}
                    >
                      {!isUser && (
                        <div style={{
                          width: "30px", height: "30px", borderRadius: "50%",
                          background: "linear-gradient(135deg,#e11d48,#be123c)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          marginRight: "8px", flexShrink: 0, fontSize: "11px", color: "#fff", fontWeight: 700
                        }}>
                          <Headphones size={15} color="#fff" />
                        </div>
                      )}
                      <div style={{
                        maxWidth: "76%",
                        padding: "10px 14px",
                        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        background: isUser
                          ? "linear-gradient(135deg,#e11d48,#be123c)"
                          : "#fff",
                        color: isUser ? "#fff" : "#1f2937",
                        fontSize: "14px",
                        lineHeight: "1.5",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                        border: isUser ? "none" : "1px solid #f1f5f9",
                        wordBreak: "break-word"
                      }}>
                        {!isUser && (
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#be123c", marginBottom: "3px" }}>
                            Support Team
                          </div>
                        )}
                        <div>{msg.content}</div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px", marginTop: "6px" }}>
                          <span style={{ fontSize: "10px", opacity: 0.7 }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {isUser && (
                            <CheckCheck
                              size={12}
                              strokeWidth={2.4}
                              style={{ opacity: 1, color: getMessageStatusColor(msg) }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {errorMessage && (
                  <div role="alert" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", background: "#fef2f2", color: "#991b1b", borderRadius: "8px", fontSize: "12px", margin: "8px 0" }}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div style={{ padding: "12px 14px", borderTop: "1px solid #f1f5f9", background: "#fff", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                  <textarea
                    ref={textareaRef}
                    id="user-chat-input"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder={partnerAccount ? "Message Partner Support team..." : "Type your message to support team..."}
                    rows={2}
                    style={{
                      flex: 1,
                      resize: "none",
                      border: "1.5px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "10px 12px",
                      fontSize: "14px",
                      outline: "none",
                      fontFamily: "inherit",
                      lineHeight: "1.4",
                      transition: "border-color 0.2s",
                      background: "#fff",
                      color: "#111827",
                      pointerEvents: "auto"
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#e11d48"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; }}
                  />
                  <button
                    id="user-chat-send-btn"
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={!text.trim() || isSending}
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg,#e11d48,#be123c)",
                      border: "none",
                      cursor: !text.trim() || isSending ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      opacity: (!text.trim() || isSending) ? 0.5 : 1,
                      transition: "opacity 0.2s"
                    }}
                    title="Send message"
                    aria-label="Send message"
                  >
                    {isSending ? (
                      <Loader2 size={18} color="#fff" style={{ animation: "spin 1s linear infinite" }} />
                    ) : (
                      <Send size={18} color="#fff" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes chatPopIn {
          0%   { transform: scale(0) rotate(-10deg); opacity: 0; }
          60%  { transform: scale(1.15) rotate(4deg); opacity: 1; }
          80%  { transform: scale(0.92) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
