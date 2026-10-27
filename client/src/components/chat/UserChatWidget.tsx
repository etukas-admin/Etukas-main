import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { marketplaceApi, type ChatMessage, type ChatSession, getStoredUser } from "../../services/api";
import { MessageCircle, X, Send, ChevronDown, Loader2, Headphones, LogIn } from "lucide-react";

export function UserChatWidget() {
  const user = getStoredUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [text, setText] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const pollInterval = isOpen && sessionId ? 4000 : undefined;

  const messages = useQuery<ChatMessage[]>({
    queryKey: ["chat", "messages", sessionId],
    queryFn: () => marketplaceApi.chatMessages(sessionId!),
    enabled: Boolean(sessionId && isOpen && user),
    refetchInterval: pollInterval
  });

  const startSession = useMutation({
    mutationFn: () => marketplaceApi.chatStartSession("Support Chat"),
    onSuccess: (session: ChatSession) => {
      setSessionId(session.id);
      queryClient.setQueryData(["chat", "messages", session.id], session.messages ?? []);
    }
  });

  const sendMessage = useMutation({
    mutationFn: (content: string) => marketplaceApi.chatSendMessage(sessionId!, content),
    onSuccess: (msg: ChatMessage) => {
      queryClient.setQueryData<ChatMessage[]>(["chat", "messages", sessionId], (prev) => [...(prev ?? []), msg]);
      setText("");
    }
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.data]);

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    if (user && !sessionId) startSession.mutate();
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || sendMessage.isPending || !sessionId) return;
    sendMessage.mutate(trimmed);
  };

  const hasUnread = messages.data?.some((m) => m.senderRole === "ADMIN" && !m.readAt);

  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999 }}>
      {/* Chat bubble button */}
      {(!isOpen || isMinimized) && (
        <button
          id="user-chat-open-btn"
          onClick={handleOpen}
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #e11d48, #be123c)",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 24px rgba(225,29,72,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            transition: "transform 0.2s, box-shadow 0.2s"
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.1)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          title="Chat with support"
        >
          <MessageCircle size={26} color="#fff" />
          {hasUnread && (
            <span style={{
              position: "absolute", top: "2px", right: "2px",
              width: "14px", height: "14px", borderRadius: "50%",
              background: "#22c55e", border: "2px solid white",
              animation: "pulse 2s infinite"
            }} />
          )}
        </button>
      )}

      {/* Chat window */}
      {isOpen && !isMinimized && (
        <div style={{
          width: "360px",
          maxHeight: "520px",
          borderRadius: "20px",
          boxShadow: "0 8px 48px rgba(0,0,0,0.2)",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid rgba(225,29,72,0.12)"
        }}>
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #e11d48, #be123c)",
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
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
                <p style={{ color: "#fff", fontWeight: 700, fontSize: "15px", margin: 0 }}>Etukas Support</p>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", margin: 0 }}>We typically reply in minutes</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              <button onClick={() => setIsMinimized(true)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "8px", cursor: "pointer", padding: "6px", color: "#fff", display: "flex" }}>
                <ChevronDown size={16} />
              </button>
              <button onClick={() => setIsOpen(false)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "8px", cursor: "pointer", padding: "6px", color: "#fff", display: "flex" }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Content */}
          {!user ? (
            <div style={{ padding: "32px 20px", textAlign: "center", background: "#f8f9fb" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#ffe4e6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Headphones size={28} color="#e11d48" />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 8px", color: "#111827" }}>Direct Support Chat</h3>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 20px", lineHeight: "1.5" }}>
                Sign in to connect directly with Etukas Administrators & Support team to resolve your doubts, ask about products, orders, or partner onboarding.
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
              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px", minHeight: "280px", maxHeight: "320px", background: "#f8f9fb" }}>
                {startSession.isPending && (
                  <div style={{ textAlign: "center", color: "#9ca3af", fontSize: "13px", paddingTop: "40px" }}>
                    <Loader2 size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
                    <p>Connecting to support...</p>
                  </div>
                )}
                {messages.data?.length === 0 && !startSession.isPending && (
                  <div style={{ textAlign: "center", padding: "32px 16px" }}>
                    <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "linear-gradient(135deg,#fce4ec,#fce7f3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                      <MessageCircle size={24} color="#e11d48" />
                    </div>
                    <p style={{ color: "#374151", fontWeight: 600, margin: "0 0 4px" }}>How can we help?</p>
                    <p style={{ color: "#9ca3af", fontSize: "13px", margin: 0 }}>Send a message to get started. Our team will respond shortly.</p>
                  </div>
                )}
                {messages.data?.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      justifyContent: msg.senderRole === "USER" ? "flex-end" : "flex-start",
                      marginBottom: "12px"
                    }}
                  >
                    {msg.senderRole === "ADMIN" && (
                      <div style={{
                        width: "28px", height: "28px", borderRadius: "50%",
                        background: "linear-gradient(135deg,#e11d48,#be123c)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        marginRight: "8px", flexShrink: 0, fontSize: "11px", color: "#fff", fontWeight: 700
                      }}>
                        E
                      </div>
                    )}
                    <div style={{
                      maxWidth: "72%",
                      padding: "10px 14px",
                      borderRadius: msg.senderRole === "USER" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background: msg.senderRole === "USER"
                        ? "linear-gradient(135deg,#e11d48,#be123c)"
                        : "#fff",
                      color: msg.senderRole === "USER" ? "#fff" : "#1f2937",
                      fontSize: "14px",
                      lineHeight: "1.5",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
                    }}>
                      {msg.content}
                      <div style={{ fontSize: "10px", marginTop: "4px", opacity: 0.65, textAlign: "right" }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: "12px 14px", borderTop: "1px solid #f1f5f9", background: "#fff" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                  <textarea
                    id="user-chat-input"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type your message..."
                    rows={2}
                    disabled={!sessionId || sendMessage.isPending}
                    style={{
                      flex: 1, resize: "none", border: "1.5px solid #e5e7eb",
                      borderRadius: "12px", padding: "10px 12px", fontSize: "14px",
                      outline: "none", fontFamily: "inherit", lineHeight: "1.4",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#e11d48"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; }}
                  />
                  <button
                    id="user-chat-send-btn"
                    onClick={handleSend}
                    disabled={!text.trim() || sendMessage.isPending || !sessionId}
                    style={{
                      width: "42px", height: "42px", borderRadius: "12px",
                      background: "linear-gradient(135deg,#e11d48,#be123c)",
                      border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, opacity: (!text.trim() || sendMessage.isPending || !sessionId) ? 0.5 : 1,
                      transition: "opacity 0.2s"
                    }}
                  >
                    {sendMessage.isPending ? <Loader2 size={18} color="#fff" style={{ animation: "spin 1s linear infinite" }} /> : <Send size={18} color="#fff" />}
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
      `}</style>
    </div>
  );
}
