import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Handshake, MessageCircle, MessageSquareText, ShieldAlert, X } from "lucide-react";
import { marketplaceApi, type AdminNotification } from "../../services/api";

interface Props {
  onNavigate: (section: string, detailId?: string) => void;
}

export function AdminNotificationsDropdown({ onNavigate }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Poll notifications every 5s
  const { data: notifications = [] } = useQuery<AdminNotification[]>({
    queryKey: ["admin", "notifications"],
    queryFn: () => marketplaceApi.adminNotifications(),
    refetchInterval: 5000
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const markRead = useMutation({
    mutationFn: (ids?: string[]) => marketplaceApi.adminMarkNotificationsRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications", "count"] });
    }
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = (n: AdminNotification) => {
    if (!n.readAt) {
      markRead.mutate([n.id]);
    }
    setIsOpen(false);

    if (n.type === "CHAT_MESSAGE") {
      const sessionId = (n.metadata as { sessionId?: string })?.sessionId;
      onNavigate("enquiries", sessionId);
    } else if (n.type === "NEW_PARTNER") {
      onNavigate("partners");
    } else if (n.type === "PARTNER_ENQUIRY") {
      const enquiryId = (n.metadata as { enquiryId?: string })?.enquiryId;
      onNavigate("enquiries", enquiryId);
    }
  };

  const getIcon = (type: AdminNotification["type"]) => {
    switch (type) {
      case "CHAT_MESSAGE":
        return <MessageCircle size={17} className="text-rose-600" />;
      case "NEW_PARTNER":
        return <Handshake size={17} className="text-emerald-600" />;
      case "PARTNER_ENQUIRY":
        return <MessageSquareText size={17} className="text-blue-600" />;
      default:
        return <ShieldAlert size={17} className="text-amber-600" />;
    }
  };

  const formatTime = (iso: string) => {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Icon Button */}
      <button
        id="admin-notifications-btn"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-etukas-red hover:bg-rose-50/50 hover:text-etukas-red focus:outline-none"
        title="Admin Notifications"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white shadow ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          id="admin-notifications-dropdown"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-gray-200 bg-white shadow-2xl z-50 overflow-hidden text-gray-900 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-gray-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markRead.mutate()}
                  disabled={markRead.isPending}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-semibold text-gray-700">No notifications yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Customer chats, partner enquiries, and new registrations will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    className={`flex w-full items-start gap-3 p-3.5 text-left transition hover:bg-gray-50 ${
                      isUnread ? "bg-rose-50/40" : "bg-white"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-xs ${
                        isUnread ? "bg-rose-100/70" : "bg-gray-100"
                      }`}
                    >
                      {getIcon(n.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-bold ${isUnread ? "text-gray-900" : "text-gray-700"}`}>
                          {n.title}
                        </span>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                          {formatTime(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {n.body}
                      </p>
                    </div>
                    {isUnread && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-600" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
