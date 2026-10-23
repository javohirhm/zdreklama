import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
  AlertCircle,
  ArrowUp,
  Boxes,
  Building2,
  CornerDownLeft,
  FolderKanban,
  KeyRound,
  LoaderCircle,
  Package,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { api } from "../api";
import type { AgentMessage } from "../types";
import { PageHeader } from "../components/Logo";
import { useToast } from "../components/ToastProvider";
import { lang, t } from "../i18n";

const STORAGE_KEY = "zd_agent_conversation_v1";
const MAX_STORED_MESSAGES = 60;

interface ChatEntry extends AgentMessage {
  id: string;
}

function newMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function completedMessages(messages: ChatEntry[]): ChatEntry[] {
  const completed: ChatEntry[] = [];
  for (let index = 0; index < messages.length - 1; index += 1) {
    const entry = messages[index];
    const next = messages[index + 1];
    if (entry.role === "user" && next.role === "assistant") {
      completed.push(entry, next);
      index += 1;
    }
  }
  return completed;
}

function loadStoredMessages(): ChatEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    const result: ChatEntry[] = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      if (
        (record.role === "user" || record.role === "assistant") &&
        typeof record.content === "string" &&
        record.content.trim()
      ) {
        result.push({
          id: typeof record.id === "string" ? record.id : newMessageId(),
          role: record.role,
          content: record.content,
        });
      }
    }
    return result.slice(-MAX_STORED_MESSAGES);
  } catch {
    return [];
  }
}

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function MessageBody({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="agent-rich">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n");
        const meaningful = lines.filter((line) => line.trim());
        const isBullet = meaningful.length > 0 && meaningful.every((line) => /^\s*[-*•]\s+/.test(line));
        const isNumbered = meaningful.length > 0 && meaningful.every((line) => /^\s*\d+[.)]\s+/.test(line));

        if (isBullet) {
          return (
            <ul key={blockIndex}>
              {meaningful.map((line, index) => (
                <li key={index}>{renderInline(line.replace(/^\s*[-*•]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }

        if (isNumbered) {
          return (
            <ol key={blockIndex}>
              {meaningful.map((line, index) => (
                <li key={index}>{renderInline(line.replace(/^\s*\d+[.)]\s+/, ""))}</li>
              ))}
            </ol>
          );
        }

        const heading = meaningful.length === 1 ? meaningful[0].match(/^#{1,4}\s+(.+)$/) : null;
        if (heading) return <h4 key={blockIndex}>{renderInline(heading[1])}</h4>;

        return (
          <p key={blockIndex}>
            {lines.map((line, index) => (
              <span className="agent-line" key={index}>
                {renderInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function AgentPage() {
  const location = useLocation();
  const toast = useToast();
  const [messages, setMessages] = useState<ChatEntry[]>(loadStoredMessages);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);

  const configQuery = useQuery({
    queryKey: ["agent-config"],
    queryFn: api.agentConfig,
    staleTime: 60_000,
  });

  const config = configQuery.data;
  const configured = Boolean(config?.configured);
  const configError =
    !config && configQuery.error
      ? configQuery.error instanceof Error
        ? configQuery.error.message
        : t("Could not load agent settings.")
      : null;

  useEffect(() => {
    try {
      const completed = completedMessages(messages).slice(-MAX_STORED_MESSAGES);
      if (completed.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Local storage can be unavailable in private browsing. Chat still works.
    }
  }, [messages]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
  }, [draft, configured]);

  useEffect(() => {
    const element = bodyRef.current;
    if (!element) return;
    element.scrollTop = messages.length ? element.scrollHeight : 0;
  }, [messages, loading, chatError, configured]);

  const sendQuestion = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question || loading || !configured) return;

      const userEntry: ChatEntry = { id: newMessageId(), role: "user", content: question };
      const history = [...completedMessages(messages).slice(-19), userEntry].map(({ role, content }) => ({ role, content }));

      setDraft("");
      setChatError(null);
      setMessages((current) => [...current, userEntry]);
      setLoading(true);
      requestRef.current += 1;
      const requestId = requestRef.current;

      try {
        const result = await api.agentChat({
          messages: history,
          locale: lang,
          page: location.pathname,
        });
        if (requestRef.current !== requestId) return;
        setMessages((current) => [
          ...current,
          { id: newMessageId(), role: "assistant", content: result.reply },
        ]);
      } catch (error) {
        if (requestRef.current !== requestId) return;
        setChatError(error instanceof Error ? error.message : t("The AI agent could not answer. Try again."));
      } finally {
        if (requestRef.current === requestId) setLoading(false);
      }
    },
    [configured, loading, location.pathname, messages]
  );

  const clearConversation = () => {
    requestRef.current += 1;
    setMessages([]);
    setChatError(null);
    setLoading(false);
    setDraft("");
    toast.success(t("Conversation cleared"));
  };

  const suggestions = [
    { icon: TrendingUp, label: t("How is the business doing this month?") },
    { icon: FolderKanban, label: t("Which orders are open and what is still due?") },
    { icon: Package, label: t("What products and tools do we have?") },
    { icon: Boxes, label: t("Which materials are low in stock?") },
    { icon: Users, label: t("How much did we pay the team?") },
    { icon: Building2, label: t("Who are our biggest clients?") },
  ];

  const statusText = configQuery.isLoading
    ? t("Checking DeepSeek configuration…")
    : configError
      ? t("Live data · configuration unavailable")
      : configured
        ? t("DeepSeek connected from the server environment")
        : t("Live data · DeepSeek not connected");

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            {t("Workspace")} <span style={{ color: "var(--color-line-strong)" }}>/</span> {t("AI agent")}
          </>
        }
        title={
          <>
            {t("Ask the business,")} <em>{t("right now.")}</em>
          </>
        }
        subtitle={t(
          "Ask about money, orders, production, stock, clients, or the team. Every answer is built from a live server-side snapshot."
        )}
      />

      <section className="card agent-page-card animate-up" style={{ animationDelay: "50ms" }}>
        <div className="agent-page-bar">
          <span className={`agent-live-dot ${configured ? "" : "off"}`} />
          <span className="agent-status-copy">{statusText}</span>
          <span className="agent-page-meta">
            <span className="agent-model">{config?.model || "deepseek-chat"}</span>
            <span className="agent-readonly">
              <ShieldCheck size={12} /> {t("Read-only")}
            </span>
            <button
              type="button"
              className="agent-bar-btn"
              onClick={clearConversation}
              disabled={!messages.length && !chatError}
              aria-label={t("Clear conversation")}
              title={t("Clear conversation")}
            >
              <Trash2 size={13} />
            </button>
          </span>
        </div>

        <div className="agent-page-body" ref={bodyRef}>
          {configQuery.isLoading ? (
            <div className="agent-center-state">
              <LoaderCircle className="spin" size={22} />
              <span>{t("Preparing the live workspace…")}</span>
            </div>
          ) : configError ? (
            <div className="agent-center-state">
              <div className="agent-state-icon error">
                <AlertCircle size={20} />
              </div>
              <strong>{t("Could not load agent settings.")}</strong>
              <span>{configError}</span>
              <button type="button" className="btn btn-secondary" onClick={() => void configQuery.refetch()}>
                {t("Try again")}
              </button>
            </div>
          ) : !configured ? (
            <div className="agent-center-state">
              <div className="agent-state-icon">
                <KeyRound size={20} />
              </div>
              <strong>{t("DeepSeek is not configured")}</strong>
              <span>
                {t(
                  "Set DEEPSEEK_API_KEY in the server environment and restart. The platform uses its own key; no key is entered in the browser."
                )}
              </span>
              <code className="agent-env-key">DEEPSEEK_API_KEY</code>
            </div>
          ) : messages.length === 0 ? (
            <div className="agent-empty">
              <div className="agent-empty-mark">
                <Sparkles size={24} />
              </div>
              <h3>{t("Ask anything about ZD REKLAMA")}</h3>
              <p>
                {t(
                  "I can read the live ledger, orders, products, stock, clients, and team. Ask in Uzbek, Russian, or English."
                )}
              </p>
              <div className="agent-suggestions">
                {suggestions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.label} type="button" className="agent-suggestion" onClick={() => void sendQuestion(item.label)}>
                      <Icon size={15} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="agent-privacy">
                <ShieldCheck size={12} />
                <span>{t("Each question reads a live server-side snapshot and sends it to DeepSeek to answer.")}</span>
              </div>
            </div>
          ) : (
            <div className="agent-thread" role="log" aria-live="polite">
              {messages.map((message) => (
                <div className={`agent-message ${message.role}`} key={message.id}>
                  {message.role === "assistant" ? (
                    <>
                      <div className="agent-avatar assistant">
                        <Sparkles size={13} />
                      </div>
                      <div className="agent-message-main">
                        <div className="agent-message-label">{t("ZD Agent")}</div>
                        <div className="agent-bubble">
                          <MessageBody text={message.content} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="agent-message-main">
                        <div className="agent-message-label">{t("You")}</div>
                        <div className="agent-bubble user">{message.content}</div>
                      </div>
                      <div className="agent-avatar user">
                        <User size={13} />
                      </div>
                    </>
                  )}
                </div>
              ))}

              {loading && (
                <div className="agent-message assistant">
                  <div className="agent-avatar assistant">
                    <Sparkles size={13} />
                  </div>
                  <div className="agent-message-main">
                    <div className="agent-message-label">{t("ZD Agent")}</div>
                    <div className="agent-bubble agent-typing" aria-label={t("Thinking through the live data…")}>
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}

              {chatError && (
                <div className="agent-error" role="alert">
                  <AlertCircle size={15} />
                  <div>
                    <strong>{t("The agent could not answer")}</strong>
                    <span>{chatError}</span>
                  </div>
                  <div className="agent-error-actions">
                    <button type="button" className="agent-text-button" onClick={() => setChatError(null)}>
                      {t("Dismiss")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {configured && !configError && (
          <div className="agent-page-footer">
            <form
              className="agent-composer"
              onSubmit={(event) => {
                event.preventDefault();
                void sendQuestion(draft);
              }}
            >
              <div className="agent-composer-row">
                <textarea
                  ref={textareaRef}
                  className="agent-input"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      void sendQuestion(draft);
                    }
                  }}
                  rows={1}
                  maxLength={4000}
                  placeholder={t("Ask about money, orders, stock, team…")}
                  aria-label={t("Ask the AI agent")}
                />
                <button
                  type="submit"
                  className="agent-send"
                  disabled={loading || !draft.trim()}
                  aria-label={t("Send")}
                  title={t("Send")}
                >
                  {loading ? <LoaderCircle className="spin" size={16} /> : <ArrowUp size={17} />}
                </button>
              </div>
              <div className="agent-composer-hint">
                <span>
                  <CornerDownLeft size={10} /> {t("Enter to send · Shift+Enter for a new line")}
                </span>
                <span>{t("Live data · UZS")}</span>
              </div>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
