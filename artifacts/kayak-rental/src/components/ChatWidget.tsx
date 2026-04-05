import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhoneInput } from "./PhoneInput";

const SESSION_KEY = "baidabase_chat_session_id";

interface ChatMessage {
  id: number;
  sender: string;
  content: string;
  createdAt: string;
}

interface ChatWidgetProps {
  enabled?: boolean;
  greeting?: string;
  placeholder?: string;
  collectName?: boolean;
  collectPhone?: boolean;
  collectEmail?: boolean;
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

function getStoredSessionId(): number | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    const id = stored ? parseInt(stored, 10) : NaN;
    return isNaN(id) ? null : id;
  } catch {
    return null;
  }
}

async function createSession(customerName?: string, customerPhone?: string, customerEmail?: string): Promise<number> {
  const session = await apiFetch<{ id: number; status: string }>("/chat/sessions", {
    method: "POST",
    body: JSON.stringify({
      channel: "web",
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      customerEmail: customerEmail || undefined,
      metadata: {
        page: window.location.pathname,
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
      },
    }),
  });
  localStorage.setItem(SESSION_KEY, String(session.id));
  return session.id;
}

async function validateSession(id: number): Promise<boolean> {
  try {
    await apiFetch<ChatMessage[]>(`/chat/sessions/${id}/messages/public`);
    return true;
  } catch {
    return false;
  }
}

const QUICK_REPLIES = ["Аренда байдарки", "Цены и тарифы", "Доставка", "Туры"];

export default function ChatWidget({
  enabled = true,
  greeting = "Здравствуйте! Чем можем помочь?",
  placeholder = "Сообщение...",
  collectName = false,
  collectPhone = false,
  collectEmail = false,
}: ChatWidgetProps) {
  const needsPreForm = collectName || collectPhone || collectEmail;

  // Determine initial phase: if there's an existing session, skip pre-chat form
  const storedId = getStoredSessionId();
  const hasExistingSession = storedId !== null;

  const [open, setOpen] = useState(false);
  // CRITICAL: phase depends on both needsPreForm AND whether an existing session exists
  // If existing session → "chat" always (no need to re-collect info)
  // If no session AND needsPreForm → "pre-chat"
  // If no session AND !needsPreForm → "chat" (session created on open)
  const [phase, setPhase] = useState<"pre-chat" | "chat">(
    needsPreForm && !hasExistingSession ? "pre-chat" : "chat"
  );
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadError, setLeadError] = useState("");

  const [sessionId, setSessionId] = useState<number | null>(storedId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync phase when needsPreForm changes (handles late-loading settings)
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const stored = getStoredSessionId();
    if (stored !== null) {
      // Has existing session - always go to chat phase, regardless of needsPreForm
      setSessionId(stored);
      setPhase("chat");
    } else if (needsPreForm) {
      setPhase("pre-chat");
    } else {
      setPhase("chat");
    }
  }, [needsPreForm]);

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
    if (open && sessionId && phase === "chat") {
      fetchMessages(sessionId);
      pollRef.current = setInterval(() => fetchMessages(sessionId), 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, sessionId, phase, fetchMessages]);

  async function openChat() {
    setOpen(true);
    if (phase === "chat" && !sessionId) {
      // No pre-form needed and no session — create one now
      setLoading(true);
      try {
        const stored = getStoredSessionId();
        if (stored) {
          const valid = await validateSession(stored);
          if (valid) {
            setSessionId(stored);
            await fetchMessages(stored);
            setLoading(false);
            return;
          } else {
            localStorage.removeItem(SESSION_KEY);
          }
        }
        const sid = await createSession();
        setSessionId(sid);
        await fetchMessages(sid);
      } catch (e) {
        console.error("Chat: failed to init session", e);
      } finally {
        setLoading(false);
      }
    }
  }

  async function submitPreChat(e: React.FormEvent) {
    e.preventDefault();
    setLeadError("");
    if (collectName && !leadName.trim()) { setLeadError("Введите имя"); return; }
    if (collectPhone && !leadPhone.trim()) { setLeadError("Введите телефон"); return; }
    if (collectEmail && !leadEmail.trim()) { setLeadError("Введите email"); return; }

    setLoading(true);
    try {
      // Check if there's already a valid session in localStorage
      const stored = getStoredSessionId();
      if (stored) {
        const valid = await validateSession(stored);
        if (valid) {
          setSessionId(stored);
          await fetchMessages(stored);
          setPhase("chat");
          setLoading(false);
          return;
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
      const sid = await createSession(
        leadName || undefined,
        leadPhone || undefined,
        leadEmail || undefined,
      );
      setSessionId(sid);
      await fetchMessages(sid);
      setPhase("chat");
    } catch (e) {
      console.error("Chat: failed to init session", e);
      setLeadError("Ошибка соединения. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || !sessionId) return;
    setInputText("");
    setSendError("");

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
      setMessages((prev) => prev.filter(m => m.id !== optimistic.id));
      setSendError("Не удалось отправить. Попробуйте ещё раз.");
    } finally {
      setSending(false);
    }
  }

  if (!enabled) return null;

  const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

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
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">Чат с менеджером</div>
              <div className="text-blue-200 text-xs">Обычно отвечаем за 15 минут</div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-blue-700 rounded transition-colors">
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Pre-chat form */}
          {phase === "pre-chat" && (
            <form onSubmit={submitPreChat} className="p-4 space-y-3">
              {greeting && (
                <p className="text-sm text-gray-600 mb-1">{greeting}</p>
              )}
              {collectName && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ваше имя</label>
                  <input
                    value={leadName}
                    onChange={e => setLeadName(e.target.value)}
                    placeholder="Иван"
                    className={inputCls}
                  />
                </div>
              )}
              {collectPhone && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Телефон</label>
                  <PhoneInput
                    value={leadPhone}
                    onChange={setLeadPhone}
                    className={inputCls}
                  />
                </div>
              )}
              {collectEmail && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={leadEmail}
                    onChange={e => setLeadEmail(e.target.value)}
                    placeholder="email@example.ru"
                    className={inputCls}
                  />
                </div>
              )}
              {leadError && (
                <p className="text-xs text-red-600">{leadError}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Начать диалог
              </button>
            </form>
          )}

          {/* Chat messages */}
          {phase === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-48 max-h-80 bg-gray-50">
                {loading && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  </div>
                )}

                {!loading && messages.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-4">
                    {greeting || 'Начните диалог с менеджером'}
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

              {sendError && (
                <p className="px-3 text-xs text-red-600">{sendError}</p>
              )}

              <div className="p-3 flex gap-2 border-t border-gray-100 bg-white">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(inputText)}
                  placeholder={placeholder}
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
            </>
          )}
        </div>
      )}
    </>
  );
}
