import { useState } from "react";
import { useAdminListChatSessions, useAdminReplyChatSession, useGetChatMessages, getAdminListChatSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export default function AdminChatPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

  const { data: sessions } = useAdminListChatSessions({});
  const { data: messages } = useGetChatMessages(selectedToken || "none", {}, {
    query: { enabled: !!selectedToken, refetchInterval: 5000 },
  });
  const sendReply = useAdminReplyChatSession();

  const handleSend = async () => {
    if (!reply.trim() || !selectedSessionId) return;
    setSending(true);
    try {
      await sendReply.mutateAsync({ id: selectedSessionId, data: { content: reply.trim() } });
      setReply("");
      await queryClient.invalidateQueries({ queryKey: getAdminListChatSessionsQueryKey({}) });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (d: string) => {
    try { return format(parseISO(d), "HH:mm", { locale: ru }); } catch { return ""; }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-5">Чат с клиентами</h1>

      <div className="flex gap-5 h-[600px]">
        {/* Sessions list */}
        <div className="w-64 shrink-0 bg-white rounded-xl border border-gray-200 overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">
            Диалоги ({sessions?.length ?? 0})
          </div>
          {sessions && sessions.length > 0 ? (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSelectedSessionId(s.id); setSelectedToken(s.sessionToken); }}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-gray-50 transition-colors hover:bg-gray-50",
                  selectedSessionId === s.id ? "bg-blue-50 border-blue-100" : "",
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {s.customerName ?? `Клиент #${s.id}`}
                  </span>
                  {s.unreadCount > 0 && (
                    <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                      {s.unreadCount}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400">{s.status === "open" ? "Открыт" : s.status}</div>
              </button>
            ))
          ) : (
            <div className="text-center py-12 text-gray-400 text-sm">Нет диалогов</div>
          )}
        </div>

        {/* Chat window */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
          {selectedSessionId ? (
            <>
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <div className="text-sm font-semibold text-gray-700">
                  {sessions?.find((s) => s.id === selectedSessionId)?.customerName ?? `Диалог #${selectedSessionId}`}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages?.map((msg) => (
                  <div key={msg.id} className={cn("flex", msg.sender === "manager" ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2 text-sm",
                      msg.sender === "manager"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : msg.sender === "bot"
                        ? "bg-gray-200 text-gray-700 rounded-bl-sm italic"
                        : "bg-gray-100 text-gray-800 rounded-bl-sm",
                    )}>
                      <div>{msg.content}</div>
                      <div className={cn("text-xs mt-1", msg.sender === "manager" ? "text-blue-200" : "text-gray-400")}>
                        {formatTime(msg.createdAt)} · {msg.sender === "manager" ? "Вы" : msg.sender === "bot" ? "Бот" : "Клиент"}
                      </div>
                    </div>
                  </div>
                ))}
                {(!messages || messages.length === 0) && (
                  <div className="text-center text-gray-400 text-sm py-8">Сообщений пока нет</div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100 flex gap-2">
                <input
                  type="text"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Ответить клиенту..."
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSend}
                  disabled={!reply.trim() || sending}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl w-10 flex items-center justify-center transition-colors"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <div className="text-sm">Выберите диалог слева</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
