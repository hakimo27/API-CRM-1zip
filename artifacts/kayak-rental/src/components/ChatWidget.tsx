import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, ChevronDown } from "lucide-react";
import { useCreateChatSession, useGetChatMessages, useSendChatMessage, getGetChatMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CHAT_QUICK_REPLIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(() =>
    localStorage.getItem("chat_session_token"),
  );
  const [sessionId, setSessionId] = useState<number | null>(() => {
    const id = localStorage.getItem("chat_session_id");
    return id ? parseInt(id) : null;
  });
  const [lastMessageId, setLastMessageId] = useState<number | undefined>(undefined);
  const [inputText, setInputText] = useState("");
  const [localMessages, setLocalMessages] = useState<
    Array<{ id: number; sender: string; content: string; createdAt: string }>
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const createSession = useCreateChatSession();
  const sendMessage = useSendChatMessage();

  const { data: messages } = useGetChatMessages(
    sessionToken ?? "none",
    { query: { since: lastMessageId } },
    {
      query: {
        enabled: !!sessionToken && open,
        refetchInterval: 5000,
        queryKey: getGetChatMessagesQueryKey(sessionToken ?? "none", { since: lastMessageId }),
        onSuccess: (data: any) => {
          if (data && data.length > 0) {
            setLocalMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const newMsgs = data.filter((m: any) => !existingIds.has(m.id));
              if (newMsgs.length === 0) return prev;
              const maxId = Math.max(...data.map((m: any) => m.id));
              setLastMessageId(maxId);
              return [...prev, ...newMsgs];
            });
          }
        },
      },
    },
  );

  useEffect(() => {
    if (messages && messages.length > 0) {
      setLocalMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newMsgs = messages.filter((m) => !existingIds.has(m.id));
        if (newMsgs.length === 0) return prev;
        return [...prev, ...newMsgs];
      });
      const maxId = Math.max(...messages.map((m) => m.id));
      if (!lastMessageId || maxId > lastMessageId) {
        setLastMessageId(maxId);
      }
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  async function openChat() {
    setOpen(true);
    if (!sessionToken) {
      const data = await createSession.mutateAsync({});
      localStorage.setItem("chat_session_token", data.sessionToken);
      localStorage.setItem("chat_session_id", String(data.id));
      setSessionToken(data.sessionToken);
      setSessionId(data.id);
    }
  }

  async function send(text: string) {
    if (!text.trim() || !sessionToken) return;
    const content = text.trim();
    setInputText("");

    const optimistic = {
      id: Date.now(),
      sender: "customer",
      content,
      createdAt: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, optimistic]);

    try {
      await sendMessage.mutateAsync({ sessionId: sessionToken, data: { content } });
    } catch (e) {
      console.error("Send failed", e);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={openChat}
          className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all hover:scale-105"
          aria-label="Открыть чат"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 flex flex-col rounded-2xl shadow-2xl overflow-hidden bg-white border border-gray-200">
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">Чат с менеджером</div>
              <div className="text-blue-200 text-xs">Обычно отвечаем за 15 минут</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-blue-700 rounded transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-48 max-h-80 bg-gray-50">
            {localMessages.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-4">
                Начните диалог с менеджером
              </div>
            )}
            {localMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex", msg.sender === "customer" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                    msg.sender === "customer"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm",
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-3 py-2 border-t border-gray-100 flex flex-wrap gap-1.5">
            {CHAT_QUICK_REPLIES.slice(0, 3).map((r) => (
              <button
                key={r}
                onClick={() => send(r)}
                className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1 hover:bg-blue-100 transition-colors"
              >
                {r}
              </button>
            ))}
          </div>

          <div className="p-3 flex gap-2 border-t border-gray-100 bg-white">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(inputText)}
              placeholder="Сообщение..."
              className="flex-1 text-sm border border-gray-200 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => send(inputText)}
              disabled={!inputText.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-full w-9 h-9 flex items-center justify-center shrink-0 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
