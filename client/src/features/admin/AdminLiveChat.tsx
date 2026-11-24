import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Headphones,
  Loader2,
  Lock,
  MessageCircle,
  Search,
  Send,
  Store,
  Wrench
} from "lucide-react";
import { marketplaceApi, type ChatMessage, type ChatSession } from "../../services/api";

interface Props {
  initialSessionId?: string | null;
}

function isPartnerChatSession(session: ChatSession): boolean {
  if (session.partnerInfo) return true;
  return Boolean(
    session.user?.roles?.some((r) => r === "SELLER" || r === "MANUFACTURER" || r === "PARTNER")
  );
}

function getPartnerBusinessLabel(session: ChatSession): string | null {
  return session.partnerInfo?.storeName || session.partnerInfo?.serviceName || null;
}

export function AdminLiveChat({ initialSessionId }: Props) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialSessionId || null);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");
  const [filterAudience, setFilterAudience] = useState<"ALL" | "PARTNERS" | "BUYERS">("ALL");
  const [search, setSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialSessionId) {
      setSelectedSessionId(initialSessionId);
    }
  }, [initialSessionId]);

  // Fetch all chat sessions (polling every 8s, disabled in background)
  const { data: sessions = [], isLoading: loadingSessions } = useQuery<ChatSession[]>({
    queryKey: ["admin", "chat", "sessions"],
    queryFn: ({ signal }) => marketplaceApi.adminChatSessions({ signal }),
    refetchInterval: 8000,
    refetchIntervalInBackground: false
  });

  // Auto-select first session on desktop if none selected
  useEffect(() => {
    if (!selectedSessionId && sessions.length > 0 && typeof window !== "undefined" && window.innerWidth >= 1024) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  // Messages in selected session (polling every 5s, disabled in background)
  const { data: messages = [], isLoading: loadingMessages } = useQuery<ChatMessage[]>({
    queryKey: ["admin", "chat", "messages", selectedSessionId],
    queryFn: ({ signal }) => marketplaceApi.adminChatMessages(selectedSessionId!, { signal }),
    enabled: Boolean(selectedSessionId),
    refetchInterval: 5000,
    refetchIntervalInBackground: false
  });

  // Mark session read when opened
  useEffect(() => {
    if (selectedSessionId) {
      void marketplaceApi
        .adminMarkSessionRead(selectedSessionId)
        .then(() => {
          void queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
          void queryClient.invalidateQueries({ queryKey: ["admin", "chat", "sessions"] });
        })
        .catch(() => {});
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
      setSendError(null);
      queryClient.setQueryData<ChatMessage[]>(
        ["admin", "chat", "messages", selectedSessionId],
        (prev) => [...(prev ?? []), newMsg]
      );
      void queryClient.invalidateQueries({ queryKey: ["admin", "chat", "sessions"] });
    },
    onError: (err: unknown) => {
      setSendError(err instanceof Error ? err.message : "Failed to send reply. Please try again.");
    }
  });

  // Close session mutation
  const closeMutation = useMutation({
    mutationFn: (id: string) => marketplaceApi.adminCloseSession(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "chat", "sessions"] });
    }
  });

  const handleSend = () => {
    const trimmed = replyText.trim();
    if (!trimmed || !selectedSessionId || sendMutation.isPending) return;
    setSendError(null);
    sendMutation.mutate(trimmed);
  };

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const selectedIsPartner = selectedSession ? isPartnerChatSession(selectedSession) : false;
  const selectedBusinessName = selectedSession ? getPartnerBusinessLabel(selectedSession) : null;

  const filteredSessions = sessions.filter((s) => {
    if (filterStatus !== "ALL" && s.status !== filterStatus) return false;
    const isPartner = isPartnerChatSession(s);
    if (filterAudience === "PARTNERS" && !isPartner) return false;
    if (filterAudience === "BUYERS" && isPartner) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (s.user?.name ?? "").toLowerCase().includes(q);
      const matchEmail = (s.user?.email ?? "").toLowerCase().includes(q);
      const matchSubject = (s.subject ?? "").toLowerCase().includes(q);
      const matchPartnerId = (s.partnerInfo?.partnerId ?? "").toLowerCase().includes(q);
      const matchStore = (s.partnerInfo?.storeName ?? "").toLowerCase().includes(q);
      const matchService = (s.partnerInfo?.serviceName ?? "").toLowerCase().includes(q);
      return (
        matchName ||
        matchEmail ||
        matchSubject ||
        matchPartnerId ||
        matchStore ||
        matchService
      );
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
        <div className="p-4 border-b border-gray-200 bg-white space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Headphones size={20} className="text-etukas-red" />
              <h3 className="font-extrabold text-base text-gray-900">Support &amp; Partner Live Chat</h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-etukas-red">
              {sessions.filter((s) => s.status === "OPEN").length} Active
            </span>
          </div>

          {/* Search Input (supports name, email, Partner ID, store/service name, subject) */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, Partner ID, store/service..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-etukas-red transition"
            />
          </div>

          {/* Audience Filter (All / Partners / Buyers) */}
          <div className="flex gap-1.5">
            {(
              [
                ["ALL", "All"],
                ["PARTNERS", "Partners"],
                ["BUYERS", "Customers"]
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilterAudience(key)}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg border transition ${
                  filterAudience === key
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Status Filter Pills */}
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
                {status === "ALL" ? "All Status" : status === "OPEN" ? "Open" : "Closed"}
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
              const isPartner = isPartnerChatSession(session);
              const businessLabel = getPartnerBusinessLabel(session);
              const partnerId = session.partnerInfo?.partnerId;
              const isTech = session.partnerInfo?.partnerType === "TECHNICIAN";
              const avatarInitial = (businessLabel || session.user?.name || "U").trim().charAt(0).toUpperCase() || "U";
              const unreadCount = session.unreadCount ?? 0;

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => {
                    setSelectedSessionId(session.id);
                    setSendError(null);
                  }}
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
                    {avatarInitial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-gray-900 truncate">
                        {businessLabel || session.user?.name || "Customer"}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {unreadCount > 0 && (
                          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-etukas-red px-1 text-[10px] font-extrabold text-white">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">
                          {new Date(session.updatedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Show contact person under business name for partner chats */}
                    {businessLabel && session.user?.name && (
                      <p className="text-[11px] text-gray-500 truncate">
                        {session.user.name}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span
                        className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          isPartner
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {isPartner ? (isTech ? "Technician" : "Partner") : "Buyer"}
                      </span>
                      {partnerId && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200">
                          {partnerId}
                        </span>
                      )}
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
            <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedSessionId(null)}
                  className="lg:hidden p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 shrink-0"
                  aria-label="Back to chat list"
                >
                  <ArrowLeft size={16} />
                </button>
                <div
                  className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                    selectedIsPartner
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-etukas-red"
                  }`}
                >
                  {(selectedBusinessName || selectedSession.user?.name || "U").trim().charAt(0).toUpperCase() || "U"}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-extrabold text-sm text-gray-900 truncate">
                      {selectedBusinessName || selectedSession.user?.name || "Customer"}
                    </h4>
                    {selectedSession.partnerInfo?.partnerId && (
                      <span className="inline-flex items-center rounded-md bg-orange-100 border border-orange-200 px-2 py-0.5 font-mono text-[11px] font-extrabold text-orange-800">
                        Partner ID: {selectedSession.partnerInfo.partnerId}
                      </span>
                    )}
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
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                    {selectedBusinessName && (
                      <span className="inline-flex items-center gap-1 font-semibold text-gray-700">
                        {selectedSession.partnerInfo?.partnerType === "TECHNICIAN" ? (
                          <Wrench size={12} className="text-orange-600" />
                        ) : (
                          <Store size={12} className="text-orange-600" />
                        )}
                        {selectedSession.user?.name}
                      </span>
                    )}
                    {selectedSession.partnerInfo?.city && (
                      <span>· {selectedSession.partnerInfo.city}</span>
                    )}
                    {selectedSession.user?.email && <span>· {selectedSession.user.email}</span>}
                    {selectedSession.user?.mobile && <span>· {selectedSession.user.mobile}</span>}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="shrink-0">
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
                          {isAdmin
                            ? "Support Team (You)"
                            : selectedBusinessName
                            ? `${msg.sender?.name || selectedSession.user?.name} (${selectedBusinessName})`
                            : msg.sender?.name || selectedSession.user?.name || "User"}
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
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs break-words ${
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
            <div className="p-3 sm:p-4 border-t border-gray-200 bg-white space-y-2">
              {sendError && (
                <div role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 border border-red-200">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{sendError}</span>
                </div>
              )}
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
                    placeholder={`Reply to ${selectedBusinessName || selectedSession.user?.name || "user"}... (Press Enter to send)`}
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
