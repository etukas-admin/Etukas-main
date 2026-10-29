import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { marketplaceApi, type ChatMessage, type ChatSession, getStoredUser } from "../../services/api";
import { MessageCircle, X, Send, ChevronDown, Loader2, Headphones, LogIn, AlertCircle, CheckCheck } from "lucide-react";

export function UserChatWidget() {
  const storedUser = getStoredUser();
  const { data: currentUser } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: marketplaceApi.me,
    initialData: storedUser ?? undefined,
    retry: false
  });
  const user = currentUser ?? storedUser;
  const userName = user?.name ? user.name.trim().split(" ")[0] : "there";

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
  const queryClient = useQueryClient();

  // Show chat bubble after app load with a pop animation
  useEffect(() => {
    const showTimer = setTimeout(() => {
      setIsVisible(true);
      // Trigger pop animation shortly after becoming visible
      setTimeout(() => setPopIn(true), 30);
    }, 2000);
    return () => clearTimeout(showTimer);
  }, []);
  const pollInterval = isOpen && sessionId ? 4000 : undefined;

  // Query existing messages
  const messages = useQuery<ChatMessage[]>({
    queryKey: ["chat", "messages", sessionId],
    queryFn: () => marketplaceApi.chatMessages(sessionId!),
    enabled: Boolean(sessionId && isOpen && user),
    refetchInterval: pollInterval
  });

  // Query user's sessions to resume an open one immediately
  const userSessions = useQuery<ChatSession[]>({
    queryKey: ["chat", "my-sessions"],
    queryFn: marketplaceApi.chatMySessions,
    enabled: Boolean(user && isOpen),
    retry: 1
  });

  // Automatically pick existing open session or set from userSessions
  useEffect(() => {
    if (userSessions.data && userSessions.data.length > 0 && !sessionId) {
      const openSession = userSessions.data.find((s) => s.status === "OPEN") ?? userSessions.data[0];
      if (openSession) {
        setSessionId(openSession.id);
      }
    }
  }, [userSessions.data, sessionId]);

  // Mutation to initialize support session
  const startSession = useMutation({
    mutationFn: () => marketplaceApi.chatStartSession("Support Chat"),
    onSuccess: (session: ChatSession) => {
      setSessionId(session.id);
      queryClient.setQueryData(["chat", "messages", session.id], session.messages ?? []);
      queryClient.invalidateQueries({ queryKey: ["chat", "my-sessions"] });
    },
    onError: (err: any) => {
      console.warn("Could not auto-start chat session:", err);
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
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isMinimized, user]);

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setErrorMessage(null);
    if (user && !sessionId) {
      startSession.mutate();
    }
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setErrorMessage(null);

    try {
      let activeSessionId = sessionId;

      // If session not ready yet, initialize on the fly before sending
      if (!activeSessionId) {
        const session = await marketplaceApi.chatStartSession("Support Chat");
        activeSessionId = session.id;
        setSessionId(session.id);
      }

      const newMsg = await marketplaceApi.chatSendMessage(activeSessionId, trimmed);
      queryClient.setQueryData<ChatMessage[]>(["chat", "messages", activeSessionId], (prev) => [
        ...(prev ?? []),
        newMsg
      ]);
      setText("");

      // Refresh session lists
      queryClient.invalidateQueries({ queryKey: ["chat", "my-sessions"] });
    } catch (err: any) {
      console.error("Failed to send support message:", err);
      setErrorMessage(err?.message || "Failed to send message. Please check your connection and try again.");
    } finally {
      setIsSending(false);
      // Refocus input
      textareaRef.current?.focus();
    }
  };

  const hasUnread = messages.data?.some((m) => m.senderRole === "ADMIN" && !m.readAt);

  const getMessageStatusColor = (msg: ChatMessage) => {
    if (msg.senderRole !== "USER") return "transparent";
    return msg.readAt ? "#c7f9ff" : "rgba(255,255,255,0.7)";
  };

  return (
    <div style={{ position: "fixed", bottom: "86px", right: "18px", zIndex: 9999 }}>
      {/* Floating Chat Bubble Button */}
      {isVisible && (!isOpen || isMinimized) && (
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
          title="Chat with Support Team"
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
      )}

      {/* Chat Window */}
      {isOpen && !isMinimized && (
        <div style={{
          width: "360px",
          maxHeight: "540px",
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
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "38px", height: "38px", borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Headphones size={20} color="#fff" />
              </div>
              <div>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: "15px", margin: 0 }}>Etukas Support Team</p>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                  <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "12px", margin: 0 }}>Support Team is active</p>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "8px", cursor: "pointer", padding: "6px", color: "#fff", display: "flex" }}
                title="Minimize"
              >
                <ChevronDown size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "8px", cursor: "pointer", padding: "6px", color: "#fff", display: "flex" }}
                title="Close"
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
                {/* Automatic Welcome Hi message from Support Team with user name */}
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
                    Hi {userName}! 👋 Welcome to Etukas Support. How can our support team help you today? Feel free to ask any doubts regarding products, orders, or partner onboarding.
                  </div>
                </div>

                {/* Conversation messages */}
                {messages.data?.map((msg) => {
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
                        border: isUser ? "none" : "1px solid #f1f5f9"
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
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", background: "#fef2f2", color: "#991b1b", borderRadius: "8px", fontSize: "12px", margin: "8px 0" }}>
                    <AlertCircle size={15} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area - NEVER DISABLED for typing */}
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
                        handleSend();
                      }
                    }}
                    placeholder="Type your message to support team..."
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
                    onClick={handleSend}
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
