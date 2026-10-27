import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  Filter,
  Headphones,
  Loader2,
  Lock,
  MessageCircle,
  RotateCcw,
  Search,
  Send,
  User as UserIcon
} from "lucide-react";
import { marketplaceApi, type ChatMessage, type ChatSession } from "../../services/api";

interface Props {
  initialSessionId?: string | null;
}

export function AdminLiveChat({ initialSessionId }: Props) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialSessionId || null);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");
  const [search, setSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialSessionId) {
      setSelectedSessionId(initialSessionId);
    }
  }, [initialSessionId]);

  // Fetch all chat sessions (polling every 4s)
  const { data: sessions = [], isLoading: loadingSessions } = useQuery<ChatSession[]>({
    queryKey: ["admin", "chat", "sessions"],
    queryFn: () => marketplaceApi.adminChatSessions(),
    refetchInterval: 4000
  });

  // Auto-select first session if none selected
  useEffect(() => {
    if (!selectedSessionId && sessions.length > 0) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  // Messages in selected session (polling every 3s)
  const { data: messages = [], isLoading: loadingMessages } = useQuery<ChatMessage[]>({
    queryKey: ["admin", "chat", "messages", selectedSessionId],
    queryFn: () => marketplaceApi.adminChatMessages(selectedSessionId!),
    enabled: Boolean(selectedSessionId),
    refetchInterval: 3000
  });

  // Mark session read when opened
  useEffect(() => {
    if (selectedSessionId) {
      void marketplaceApi.adminMarkSessionRead(selectedSessionId).then(() => {
        queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
      });
    }
  }, [selectedSessionId, queryClient]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      marketplaceApi.adminChatSendMessage(selectedSessionId!, content),
    onSuccess: (newMsg) => {
      setReplyText("");
      queryClient.setQueryData<ChatMessage[]>(
        ["admin", "chat", "messages", selectedSessionId],
        (prev) => [...(prev ?? []), newMsg]
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "chat", "sessions"] });
    }
  });

  // Close session mutation
  const closeMutation = useMutation({
    mutationFn: (id: string) => marketplaceApi.adminCloseSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "chat", "sessions"] });
    }
  });

  const handleSend = () => {
    const trimmed = replyText.trim();
    if (!trimmed || !selectedSessionId || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  const filteredSessions = sessions.filter((s) => {
    if (filterStatus !== "ALL" && s.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = s.user?.name.toLowerCase().includes(q);
      const matchEmail = s.user?.email.toLowerCase().includes(q);
      const matchSubject = s.subject.toLowerCase().includes(q);
      return matchName || matchEmail || matchSubject;
    }
    return true;
  });

  return (
    <div className="flex flex-col lg:flex-row h-[700px] rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Sessions Sidebar */}
      <div
        className={`w-full lg:w-96 flex flex-col border-r border-gray-200 bg-gray-50/50 ${
          selectedSessionId ? "hidden lg:flex" : "flex"
        }`}
      >
        {/* Sidebar Header & Search */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Headphones size={20} className="text-etukas-red" />
              <h3 className="font-extrabold text-base text-gray-900">User Inquiries & Live Chat</h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-etukas-red">
              {sessions.filter((s) => s.status === "OPEN").length} Active
            </span>
          </div>

          {/* Search Input */}
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, email or subject..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-etukas-red transition"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1.5">
            {(["ALL", "OPEN", "CLOSED"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  filterStatus === status
                    ? "bg-etukas-red text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {status === "ALL" ? "All Chats" : status === "OPEN" ? "Open" : "Closed"}
              </button>
            ))}
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {loadingSessions ? (
            <div className="p-8 text-center text-gray-400">
              <Loader2 size={24} className="mx-auto mb-2 animate-spin text-etukas-red" />
              <p className="text-xs">Loading chat sessions...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <MessageCircle size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-xs font-medium">No chat sessions found</p>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isSelected = session.id === selectedSessionId;
              const lastMsg = session.messages?.[0];
              const isPartner = session.user?.roles.some((r) => r === "SELLER" || r === "MANUFACTURER");

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`w-full p-4 text-left transition flex items-start gap-3 ${
                    isSelected ? "bg-rose-50/70 border-l-4 border-etukas-red" : "hover:bg-gray-100/70"
                  }`}
                >
                  <div
                    className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                      isPartner
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {session.user?.name.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-gray-900 truncate">
                        {session.user?.name || "Customer"}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {new Date(session.updatedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          isPartner
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {isPartner ? "Partner" : "Buyer"}
                      </span>
                      {session.status === "CLOSED" && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                          Closed
                        </span>
                      )}
                    </div>

                    <p className="mt-1.5 text-xs text-gray-600 truncate">
                      {lastMsg ? lastMsg.content : session.subject}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Conversation View */}
      <div className={`flex-1 flex flex-col bg-white ${!selectedSessionId ? "hidden lg:flex" : "flex"}`}>
        {selectedSession ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSessionId(null)}
                  className="lg:hidden p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="h-10 w-10 rounded-full bg-rose-100 text-etukas-red flex items-center justify-center font-bold text-sm">
                  {selectedSession.user?.name.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm text-gray-900">
                      {selectedSession.user?.name}
                    </h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selectedSession.status === "OPEN"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {selectedSession.status === "OPEN" ? "Live Chat" : "Closed"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {selectedSession.user?.email} · Roles:{" "}
                    {selectedSession.user?.roles.join(", ") || "CUSTOMER"}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div>
                {selectedSession.status === "OPEN" ? (
                  <button
                    type="button"
                    onClick={() => closeMutation.mutate(selectedSession.id)}
                    disabled={closeMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-red-600 transition"
                  >
                    <Lock size={13} /> Close Chat
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 font-medium">Session Closed</span>
                )}
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#f9fafb]">
              {loadingMessages ? (
                <div className="p-8 text-center text-gray-400">
                  <Loader2 size={24} className="mx-auto mb-2 animate-spin text-etukas-red" />
                  <p className="text-xs">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <MessageCircle size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-xs font-medium">No messages yet in this session</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isAdmin = msg.senderRole === "ADMIN";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[11px] text-gray-400">
                        <span className="font-semibold text-gray-600">
                          {isAdmin ? "Admin (You)" : msg.sender?.name || selectedSession.user?.name}
                        </span>
                        <span>·</span>
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs ${
                          isAdmin
                            ? "bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-br-xs"
                            : "bg-white text-gray-900 border border-gray-200 rounded-bl-xs"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input Box */}
            <div className="p-3 sm:p-4 border-t border-gray-200 bg-white">
              {selectedSession.status === "CLOSED" ? (
                <div className="p-3 bg-gray-50 rounded-xl text-center text-xs text-gray-500">
                  This chat session is closed. You can review earlier messages above.
                </div>
              ) : (
                <div className="flex gap-2 items-end">
                  <textarea
                    id="admin-chat-reply-input"
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={`Reply to ${selectedSession.user?.name || "user"}... (Press Enter to send)`}
                    className="flex-1 resize-none rounded-xl border border-gray-200 p-3 text-sm focus:border-etukas-red focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                  <button
                    id="admin-chat-send-btn"
                    type="button"
                    onClick={handleSend}
                    disabled={!replyText.trim() || sendMutation.isPending}
                    className="h-11 px-4 rounded-xl bg-etukas-red hover:bg-rose-700 text-white font-semibold text-sm inline-flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50"
                  >
                    {sendMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Send size={15} />
                        <span className="hidden sm:inline">Send</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
            <Headphones size={48} className="mb-3 text-gray-300" />
            <h4 className="font-bold text-gray-700 text-base">Select a chat conversation</h4>
            <p className="text-xs text-gray-400 max-w-sm mt-1">
              Choose a live inquiry or doubt from customers or partners in the list to start responding.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
