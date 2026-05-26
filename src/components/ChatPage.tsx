"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import { v4 as uuidv4 } from "uuid";
import { personas, PersonaType } from "@/lib/personas";
import AuthModal from "./AuthModal";
import type { Message, Conversation } from "@/types";

export default function ChatPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [personaType, setPersonaType] = useState<PersonaType>("learning");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionToken] = useState(() => uuidv4());
  const [showAuth, setShowAuth] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentPersona = personas[personaType];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const fetchConversations = useCallback(async () => {
    if (!session) return;
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } finally {
      setLoadingHistory(false);
    }
  }, [session]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: uuidv4(), role: "user", content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, conversationId, personaType, sessionToken }),
      });

      if (!res.ok || !res.body) throw new Error("API error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "meta") {
              setConversationId(data.conversationId);
            } else if (data.type === "text") {
              accumulated += data.content;
              setStreamingText(accumulated);
            } else if (data.type === "done") {
              if (accumulated) {
                setMessages((prev) => [...prev, {
                  id: uuidv4(), role: "assistant", content: accumulated,
                  createdAt: new Date().toISOString(),
                }]);
                setStreamingText("");
              }
              fetchConversations();
            } else if (data.type === "error") {
              setMessages((prev) => [...prev, {
                id: uuidv4(), role: "assistant",
                content: `⚠️ ${data.content}`,
                createdAt: new Date().toISOString(),
              }]);
              setStreamingText("");
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: uuidv4(), role: "assistant",
        content: "⚠️ 연결에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
        createdAt: new Date().toISOString(),
      }]);
      setStreamingText("");
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId, personaType, sessionToken, fetchConversations]);

  const handleSelectConversation = async (conv: Conversation) => {
    const res = await fetch(`/api/conversations/${conv.id}`);
    if (res.ok) {
      const data = await res.json();
      const c = data.conversation;
      setConversationId(c.id);
      setPersonaType((c.personaType as PersonaType) || "learning");
      setMessages(
        (c.messages || []).map((m: any) => ({
          ...m, createdAt: m.createdAt || new Date().toISOString(),
        }))
      );
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("이 대화를 삭제하시겠습니까?")) return;
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (conversationId === id) handleNewChat();
  };

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setStreamingText("");
    inputRef.current?.focus();
  };

  const handlePersonaChange = (p: PersonaType) => {
    setPersonaType(p);
    handleNewChat();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000)
      return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    if (diff < 86400000 * 7)
      return ["일", "월", "화", "수", "목", "금", "토"][d.getDay()] + "요일";
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  const personaEmoji = (type: string) =>
    personas[type as keyof typeof personas]?.emoji || "💬";

  const gradients: Record<PersonaType, string> = {
    learning: "from-blue-500 to-indigo-500",
    career: "from-violet-500 to-purple-500",
    guide: "from-emerald-500 to-teal-500",
  };

  const suggests: Record<PersonaType, string[]> = {
    learning: ["JavaScript 클로저 쉽게 설명해줘", "파이썬 리스트 컴프리헨션 예제", "CSS Flexbox vs Grid 차이"],
    career: ["신입 개발자 이력서 팁 알려줘", "면접에서 자기소개 어떻게 하지?", "포트폴리오 구성하는 법"],
    guide: ["이 사이트에서 뭘 할 수 있어?", "학습 도우미는 어떤 거야?", "대화 이력은 어떻게 볼 수 있어?"],
  };

  return (
    <>
      <AuthModal isOpen={showAuth} onClose={() => { setShowAuth(false); fetchConversations(); }} />

      <div className="h-screen flex app-bg">
        {/* ══════ 사이드바 ══════ */}
        <aside className={`${sidebarOpen ? "w-72" : "w-0"} flex-shrink-0 glass-sidebar flex flex-col transition-all duration-300 overflow-hidden`}>
          {/* 로고 + 새 대화 */}
          <div className="px-4 pt-5 pb-4 flex-shrink-0">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200/40">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <span className="font-bold text-[15px] text-gray-800 tracking-tight">AI 학습 허브</span>
            </div>
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-indigo-300/30 hover:shadow-indigo-400/40 hover:-translate-y-0.5 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              새 대화
            </button>
          </div>

          {/* 페르소나 선택 */}
          <div className="px-3 py-3 flex-shrink-0">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">AI 도우미</p>
            <div className="space-y-1">
              {(Object.keys(personas) as PersonaType[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePersonaChange(p)}
                  className={`sidebar-item w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm ${
                    personaType === p
                      ? "active font-semibold text-indigo-700"
                      : "text-gray-600"
                  }`}
                >
                  <span className="text-base">{personas[p].emoji}</span>
                  <div className="text-left">
                    <p className="leading-tight">{personas[p].name}</p>
                    {personaType === p && (
                      <p className="text-[11px] text-indigo-400 font-normal mt-0.5">{personas[p].description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-gray-200/60 to-transparent" />

          {/* 대화 이력 */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">대화 이력</p>
            {!session ? (
              <div className="text-center py-10 px-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400 mb-2">로그인하면<br />대화가 저장됩니다</p>
                <button
                  onClick={() => setShowAuth(true)}
                  className="text-sm text-indigo-500 font-semibold hover:text-indigo-600 transition-colors"
                >
                  로그인하기 →
                </button>
              </div>
            ) : loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">아직 대화가 없습니다</p>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`sidebar-item group flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer ${
                      conversationId === conv.id ? "active" : ""
                    }`}
                  >
                    <span className="text-sm mt-0.5 flex-shrink-0">{personaEmoji(conv.personaType)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate font-medium">{conv.title}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(conv.updatedAt)}</p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 mt-1 text-gray-400 hover:text-red-400 transition-all flex-shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 하단 프로필 */}
          <div className="px-4 py-3 flex-shrink-0">
            <div className="h-px bg-gradient-to-r from-transparent via-gray-200/60 to-transparent mb-3" />
            {session ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {(session.user?.name || "U")[0]}
                  </div>
                  <span className="text-sm text-gray-700 font-medium truncate max-w-[120px]">
                    {session.user?.name || session.user?.email}
                  </span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="text-xs text-gray-400 hover:text-red-400 transition-colors font-medium"
                >
                  나가기
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="w-full py-2.5 text-sm text-indigo-500 font-semibold hover:bg-indigo-50/50 rounded-xl transition-colors"
              >
                로그인 / 회원가입
              </button>
            )}
          </div>
        </aside>

        {/* ══════ 메인 ══════ */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 헤더 */}
          <header className="h-14 px-4 flex items-center justify-between glass-header flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="w-9 h-9 rounded-xl glass hover:bg-white/60 flex items-center justify-center transition-all"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradients[personaType]} flex items-center justify-center text-base shadow-md`}>
                  {currentPersona.emoji}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800 leading-tight">{currentPersona.name}</p>
                  <p className="text-[11px] text-gray-400 font-medium">{currentPersona.description}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50/60 backdrop-blur px-3 py-1.5 rounded-full border border-emerald-100/60">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-semibold text-emerald-600">온라인</span>
            </div>
          </header>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">
              {/* 웰컴 */}
              {messages.length === 0 && !streamingText && (
                <div className="text-center py-16">
                  <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${gradients[personaType]} flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl`}>
                    {currentPersona.emoji}
                  </div>
                  <h2 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">
                    무엇이든 물어보세요
                  </h2>
                  <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed mb-10">
                    {currentPersona.name}가 도와드립니다. 아래 질문을 클릭하거나 직접 입력해보세요.
                  </p>
                  <div className="flex flex-wrap gap-2.5 justify-center max-w-lg mx-auto">
                    {suggests[personaType].map((q) => (
                      <button
                        key={q}
                        onClick={() => setInput(q)}
                        className="suggest-btn px-4 py-2.5 text-sm text-gray-600 rounded-2xl font-medium"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 메시지 */}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradients[personaType]} flex items-center justify-center text-sm flex-shrink-0 mt-1 shadow-md`}>
                      {currentPersona.emoji}
                    </div>
                  )}
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-sm text-white flex-shrink-0 mt-1 shadow-md font-bold">
                      {session?.user?.name?.[0] || "나"}
                    </div>
                  )}
                  <div className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "msg-user" : "msg-ai"}`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-pre:bg-gray-900 prose-pre:text-gray-100">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* 스트리밍 */}
              {streamingText && (
                <div className="flex gap-3">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradients[personaType]} flex items-center justify-center text-sm flex-shrink-0 mt-1 shadow-md`}>
                    {currentPersona.emoji}
                  </div>
                  <div className="max-w-[75%] px-4 py-3 msg-ai text-sm leading-relaxed">
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{streamingText}</ReactMarkdown>
                    </div>
                    <span className="streaming-cursor" />
                  </div>
                </div>
              )}

              {/* 로딩 */}
              {loading && !streamingText && (
                <div className="flex gap-3">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradients[personaType]} flex items-center justify-center text-sm flex-shrink-0 mt-1 shadow-md`}>
                    {currentPersona.emoji}
                  </div>
                  <div className="msg-ai px-5 py-4 flex gap-1.5 items-center">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* 입력 */}
          <div className="px-4 py-4 flex-shrink-0">
            <div className="max-w-3xl mx-auto">
              <div className="glass-input flex items-end gap-3 rounded-2xl px-4 py-3 shadow-lg shadow-indigo-100/20 focus-within:shadow-indigo-200/30 focus-within:border-indigo-200/50 transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`${currentPersona.name}에게 메시지를 입력하세요...`}
                  rows={1}
                  disabled={loading}
                  className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-800 placeholder-gray-400 max-h-32 leading-relaxed"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r ${gradients[personaType]} disabled:opacity-25 flex items-center justify-center transition-all hover:shadow-lg active:scale-95 shadow-md`}
                  aria-label="전송"
                >
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <p className="text-center text-[11px] text-gray-400/80 mt-2.5">
                AI의 답변은 참고용입니다 · Powered by Groq + Llama
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
