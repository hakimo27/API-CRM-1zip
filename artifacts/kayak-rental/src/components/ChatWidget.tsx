import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SESSION_KEY = "baidabase_chat_session_id";

interface ChatMessage {
  id: number;
  sender: string;
  content: string;
  createdAt: string;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch("/api" + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function resolveSessionId(): Promise<number> {
  const stored = localStorage.getItem(SESSION_KEY);
  if (stored) {
    const id = parseInt(stored, 10);
    if (!isNaN(id)) {
      try {
        await apiFetch<ChatMessage[]>(`/chat/sessions/${id}/messages/public`);
        return id;
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }
  const session = await apiFetch<{ id: number; status: string }>("/chat/sessions", {
    method: "POST",
    body: JSON.stringify({ channel: "web", metadata: { page: window.location.pathname } }),
  });
  localStorage.setItem(SESSION_KEY, String(session.id));
  return session.id;
}

const QUICK_REPLIES = ["Аренда байдарки", "Цены и тарифы", "Доставка", "Туры"];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    const id = stored ? parseInt(stored, 10) : NaN;
    return isNaN(id) ? null : id;
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async (sid: number) => {
    try {
      const data = await apiFetch<ChatMessage[]>(`/chat/sessions/${sid}/messages/public`);
      setMessages(data);
    } catch (e) {
      console.warn("Chat: failed to fetch messages", e);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open && sessionId) {
      fetchMessages(sessionId);
      pollRef.current = setInterval(() => fetchMessages(sessionId), 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, sessionId, fetchMessages]);

  async function openChat() {
    setOpen(true);
    if (!sessionId) {
      setLoading(true);
      try {
        const sid = await resolveSessionId();
        setSessionId(sid);
        await fetchMessages(sid);
      } catch (e) {
        console.error("Chat: failed to init session", e);
      } finally {
        setLoading(false);
      }
    }
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || !sessionId) return;
    setInputText("");

    const optimistic: ChatMessage = {
      id: Date.now(),
      sender: "customer",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);

    try {
      await apiFetch(`/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content, sender: "customer" }),
      });
      await fetchMessages(sessionId);
    } catch (e) {
      console.error("Chat: failed to send", e);
    } finally {
      setSending(false);
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
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              </div>
            )}

            {!loading && messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-4">
                Начните диалог с менеджером
              </div>
            )}

            {messages.map((msg) => (
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
            {QUICK_REPLIES.map((r) => (
              <button
                key={r}
                onClick={() => send(r)}
                disabled={sending || loading}
                className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1 hover:bg-blue-100 transition-colors disabled:opacity-50"
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
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(inputText)}
              placeholder="Сообщение..."
              disabled={loading}
              className="flex-1 text-sm border border-gray-200 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              onClick={() => send(inputText)}
              disabled={!inputText.trim() || sending || loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-full w-9 h-9 flex items-center justify-center shrink-0 transition-colors"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
