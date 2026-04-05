import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { MessageSquare, X, Send, ChevronDown, Loader2, Clock, CheckCircle2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhoneInput } from "./PhoneInput";

const SESSION_KEY = "baidabase_chat_session_id";

interface ChatMessage {
  id: number;
  sender: string;
  content: string;
  createdAt: string;
}

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

interface ChatWidgetProps {
  enabled?: boolean;
  greeting?: string;
  placeholder?: string;
  collectName?: boolean;
  collectPhone?: boolean;
  collectEmail?: boolean;
  offlineFormEnabled?: boolean;
  offlineMessageText?: string;
  requireName?: boolean;
  requirePhone?: boolean;
  requireEmail?: boolean;
  workingHoursJson?: string;
  timezone?: string;
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

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const DEFAULT_WORKING_HOURS: Record<string, DaySchedule> = {
  mon: { enabled: true, start: "10:00", end: "19:00" },
  tue: { enabled: true, start: "10:00", end: "19:00" },
  wed: { enabled: true, start: "10:00", end: "19:00" },
  thu: { enabled: true, start: "10:00", end: "19:00" },
  fri: { enabled: true, start: "10:00", end: "19:00" },
  sat: { enabled: true, start: "11:00", end: "17:00" },
  sun: { enabled: false, start: "00:00", end: "00:00" },
};

function isWithinWorkingHours(
  workingHoursJson: string | undefined,
  timezone: string = "Europe/Moscow"
): boolean {
  if (!workingHoursJson) return true;

  let schedule: Record<string, DaySchedule>;
  try {
    schedule = { ...DEFAULT_WORKING_HOURS, ...JSON.parse(workingHoursJson) };
  } catch {
    return true;
  }

  try {
    const now = new Date();
    const tzDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    const dayKey = DAY_KEYS[tzDate.getDay()];
    const day = schedule[dayKey];
    if (!day || !day.enabled) return false;

    const [startH, startM] = day.start.split(":").map(Number);
    const [endH, endM] = day.end.split(":").map(Number);
    const nowMins = tzDate.getHours() * 60 + tzDate.getMinutes();
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    return nowMins >= startMins && nowMins < endMins;
  } catch {
    return true;
  }
}

const QUICK_REPLIES = ["Аренда байдарки", "Цены и тарифы", "Доставка", "Туры"];

function useAutoResizeTextarea(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [value]);
  return ref;
}

export default function ChatWidget({
  enabled = true,
  greeting = "Здравствуйте! Чем можем помочь?",
  placeholder = "Сообщение...",
  collectName = false,
  collectPhone = false,
  collectEmail = false,
  offlineFormEnabled = false,
  offlineMessageText = "Сейчас мы вне рабочего времени. Оставьте контакты — мы свяжемся с вами в рабочие часы.",
  requireName = false,
  requirePhone = false,
  requireEmail = false,
  workingHoursJson,
  timezone = "Europe/Moscow",
}: ChatWidgetProps) {
  const isOnline = useMemo(
    () => isWithinWorkingHours(workingHoursJson, timezone),
    [workingHoursJson, timezone]
  );

  const needsPreForm = collectName || collectPhone || collectEmail;
  const storedId = getStoredSessionId();
  const hasExistingSession = storedId !== null;

  const [open, setOpen] = useState(false);

  const initialPhase = (): "pre-chat" | "chat" | "offline" | "offline-success" => {
    if (!isOnline && offlineFormEnabled) return "offline";
    if (needsPreForm && !hasExistingSession) return "pre-chat";
    return "chat";
  };

  const [phase, setPhase] = useState<"pre-chat" | "chat" | "offline" | "offline-success">(initialPhase);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadError, setLeadError] = useState("");

  const [offlineName, setOfflineName] = useState("");
  const [offlinePhone, setOfflinePhone] = useState("");
  const [offlineEmail, setOfflineEmail] = useState("");
  const [offlineMsg, setOfflineMsg] = useState("");
  const [offlineError, setOfflineError] = useState("");
  const [offlineSubmitting, setOfflineSubmitting] = useState(false);

  const [sessionId, setSessionId] = useState<number | null>(storedId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useAutoResizeTextarea(inputText);

  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const stored = getStoredSessionId();
    if (stored !== null) {
      setSessionId(stored);
      setPhase("chat");
    } else if (!isOnline && offlineFormEnabled) {
      setPhase("offline");
    } else if (needsPreForm) {
      setPhase("pre-chat");
    } else {
      setPhase("chat");
    }
  }, [isOnline, offlineFormEnabled, needsPreForm]);

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

  useEffect(() => {
    if (!open) return;
    const handleResize = () => {
      if (messagesContainerRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      }
    };
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => window.visualViewport?.removeEventListener("resize", handleResize);
  }, [open]);

  async function openChat() {
    setOpen(true);
    if (phase === "chat" && !sessionId) {
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

  async function submitOfflineForm(e: React.FormEvent) {
    e.preventDefault();
    setOfflineError("");
    if (requireName && !offlineName.trim()) { setOfflineError("Введите имя"); return; }
    if (requirePhone && !offlinePhone.trim()) { setOfflineError("Введите телефон"); return; }
    if (requireEmail && !offlineEmail.trim()) { setOfflineError("Введите email"); return; }
    if (!offlineMsg.trim()) { setOfflineError("Введите сообщение"); return; }

    setOfflineSubmitting(true);
    try {
      await apiFetch("/chat/offline-request", {
        method: "POST",
        body: JSON.stringify({
          name: offlineName || undefined,
          phone: offlinePhone || undefined,
          email: offlineEmail || undefined,
          message: offlineMsg,
          sourcePage: window.location.pathname,
        }),
      });
      setPhase("offline-success");
    } catch (e) {
      console.error("Offline request error:", e);
      setOfflineError("Ошибка отправки. Попробуйте позже.");
    } finally {
      setOfflineSubmitting(false);
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      const isMobile = window.innerWidth < 640;
      if (!isMobile) {
        e.preventDefault();
        send(inputText);
      }
    }
  }

  if (!enabled) return null;

  const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  const headerSubtitle = isOnline
    ? "Обычно отвечаем за 15 минут"
    : "Сейчас вне рабочего времени";

  return (
    <>
      {!open && (
        <button
          onClick={openChat}
          className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
          aria-label="Открыть чат"
          style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20 sm:hidden"
            onClick={() => setOpen(false)}
          />

          {/* Chat window — full screen on mobile, popup on desktop */}
          <div
            className={cn(
              "fixed z-50 flex flex-col bg-white",
              "inset-0 sm:inset-auto",
              "sm:bottom-6 sm:right-6 sm:w-96 sm:max-h-[600px]",
              "sm:rounded-2xl sm:shadow-2xl sm:border sm:border-gray-200",
              "overflow-hidden"
            )}
            style={{
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {/* Header */}
            <div className={cn(
              "text-white px-4 py-3.5 flex items-center gap-3 flex-shrink-0",
              isOnline ? "bg-blue-600" : "bg-gray-600"
            )}
              style={{ paddingTop: "calc(0.875rem + env(safe-area-inset-top))" }}
            >
              <button
                onClick={() => setOpen(false)}
                className={cn("sm:hidden p-1.5 rounded-full transition-colors", isOnline ? "hover:bg-blue-700" : "hover:bg-gray-700")}
                aria-label="Закрыть"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">Чат с менеджером</div>
                <div className={cn("text-xs", isOnline ? "text-blue-200" : "text-gray-300")}>
                  {headerSubtitle}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className={cn("hidden sm:flex p-1 rounded transition-colors", isOnline ? "hover:bg-blue-700" : "hover:bg-gray-700")}
                aria-label="Свернуть"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {/* Offline: show form */}
            {phase === "offline" && offlineFormEnabled && (
              <form onSubmit={submitOfflineForm} className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">{offlineMessageText}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Ваше имя{requireName ? " *" : ""}
                  </label>
                  <input value={offlineName} onChange={e => setOfflineName(e.target.value)}
                    placeholder="Иван" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Телефон{requirePhone ? " *" : ""}
                  </label>
                  <PhoneInput value={offlinePhone} onChange={setOfflinePhone} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Email{requireEmail ? " *" : ""}
                  </label>
                  <input type="email" value={offlineEmail} onChange={e => setOfflineEmail(e.target.value)}
                    placeholder="email@example.ru" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Сообщение *</label>
                  <textarea value={offlineMsg} onChange={e => setOfflineMsg(e.target.value)}
                    placeholder="Опишите ваш вопрос..." rows={4}
                    className={inputCls + " resize-none"} />
                </div>
                {offlineError && <p className="text-xs text-red-600">{offlineError}</p>}
                <button type="submit" disabled={offlineSubmitting}
                  className="w-full py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {offlineSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Отправить заявку
                </button>
              </form>
            )}

            {/* Offline: no form, just message */}
            {phase === "offline" && !offlineFormEnabled && (
              <div className="flex-1 p-5 space-y-3">
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">{offlineMessageText}</p>
                </div>
                <p className="text-xs text-center text-gray-400">Попробуйте написать нам позже</p>
              </div>
            )}

            {/* Offline form success */}
            {phase === "offline-success" && (
              <div className="flex-1 p-6 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Заявка отправлена</h3>
                <p className="text-sm text-gray-500">Мы получили ваше обращение и свяжемся с вами в рабочее время.</p>
              </div>
            )}

            {/* Pre-chat form */}
            {phase === "pre-chat" && (
              <form onSubmit={submitPreChat} className="flex-1 overflow-y-auto p-4 space-y-3">
                {greeting && (
                  <p className="text-sm text-gray-600 mb-1">{greeting}</p>
                )}
                {collectName && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ваше имя</label>
                    <input value={leadName} onChange={e => setLeadName(e.target.value)}
                      placeholder="Иван" className={inputCls} />
                  </div>
                )}
                {collectPhone && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Телефон</label>
                    <PhoneInput value={leadPhone} onChange={setLeadPhone} className={inputCls} />
                  </div>
                )}
                {collectEmail && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input type="email" value={leadEmail} onChange={e => setLeadEmail(e.target.value)}
                      placeholder="email@example.ru" className={inputCls} />
                  </div>
                )}
                {leadError && <p className="text-xs text-red-600">{leadError}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Начать диалог
                </button>
              </form>
            )}

            {/* Chat messages */}
            {phase === "chat" && (
              <>
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 overscroll-contain"
                  style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
                >
                  {loading && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    </div>
                  )}

                  {!loading && messages.length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-4">
                      {greeting || "Начните диалог с менеджером"}
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex", msg.sender === "customer" ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                        msg.sender === "customer"
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm",
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick replies */}
                <div className="px-3 py-2 border-t border-gray-100 flex flex-wrap gap-1.5 flex-shrink-0 bg-white">
                  {QUICK_REPLIES.map((r) => (
                    <button key={r} onClick={() => send(r)} disabled={sending || loading}
                      className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1.5 hover:bg-blue-100 active:bg-blue-200 transition-colors disabled:opacity-50">
                      {r}
                    </button>
                  ))}
                </div>

                {sendError && <p className="px-3 text-xs text-red-600 flex-shrink-0">{sendError}</p>}

                {/* Composer */}
                <div className="px-3 pb-3 pt-2 flex items-end gap-2 border-t border-gray-100 bg-white flex-shrink-0">
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={loading}
                    rows={1}
                    className={cn(
                      "flex-1 text-sm border border-gray-200 rounded-2xl px-4 py-3",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                      "disabled:opacity-50 resize-none overflow-hidden leading-snug",
                      "min-h-[46px] max-h-[120px]"
                    )}
                    style={{ lineHeight: "1.4" }}
                  />
                  <button
                    onClick={() => send(inputText)}
                    disabled={!inputText.trim() || sending || loading}
                    className={cn(
                      "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
                      "disabled:bg-gray-300 text-white rounded-full",
                      "w-11 h-11 flex items-center justify-center shrink-0 transition-colors"
                    )}
                    aria-label="Отправить"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
