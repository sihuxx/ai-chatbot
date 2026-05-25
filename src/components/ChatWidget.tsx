"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import { v4 as uuidv4 } from "uuid";
import { personas, PersonaType } from "@/lib/personas";
import AuthModal from "./AuthModal";
import HistorySidebar from "./HistorySidebar";
import type { Message, Conversation } from "@/types";

export default function ChatWidget() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [personaType, setPersonaType] = useState<PersonaType>("learning");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionToken] = useState(() => uuidv4());
  const [showAuth, setShowAuth] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentPersona = personas[personaType];

  // 스크롤 하단 이동
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // 엔터키 전송 (Shift+Enter = 줄바꿈)
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
      id: uuidv4(),
      role: "user",
      content: trimmed,
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
        body: JSON.stringify({
          message: trimmed,
          conversationId,
          personaType,
          sessionToken,
        }),
      });

      if (!res.ok || !res.body) throw new Error("API 오류");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let newConvId: string | null = null;

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
              newConvId = data.conversationId;
              setConversationId(data.conversationId);
            } else if (data.type === "text") {
              accumulated += data.content;
              setStreamingText(accumulated);
            } else if (data.type === "done") {
              if (accumulated) {
                const aiMsg: Message = {
                  id: uuidv4(),
                  role: "assistant",
                  content: accumulated,
                  createdAt: new Date().toISOString(),
                };
                setMessages((prev) => [...prev, aiMsg]);
                setStreamingText("");
              }
            } else if (data.type === "error") {
              const errMsg: Message = {
                id: uuidv4(),
                role: "assistant",
                content: `⚠️ ${data.content}`,
                createdAt: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, errMsg]);
              setStreamingText("");
            }
          } catch {}
        }
      }
    } catch (err) {
      const errMsg: Message = {
        id: uuidv4(),
        role: "assistant",
        content: "⚠️ 연결에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
      setStreamingText("");
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId, personaType, sessionToken]);

  const handleSelectConversation = (conv: Conversation) => {
    setConversationId(conv.id);
    setPersonaType((conv.personaType as PersonaType) || "learning");
    setMessages(
      (conv.messages || []).map((m) => ({
        ...m,
        createdAt: m.createdAt || new Date().toISOString(),
      }))
    );
    setIsOpen(true);
  };

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setStreamingText("");
  };

  const handlePersonaChange = (p: PersonaType) => {
    setPersonaType(p);
    handleNewChat();
  };

  return (
    <>
      {/* Auth Modal */}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />

      {/* History Sidebar */}
      <HistorySidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        onSelectConversation={handleSelectConversation}
        currentConversationId={conversationId}
      />

      {/* 플로팅 버튼 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-20 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 shadow-2xl flex items-center justify-center text-white text-3xl hover:scale-110 transition-transform"
          aria-label="챗봇 열기"
        >
          {currentPersona.emoji}
        </button>
      )}

      {/* 채팅 윈도우 */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-20 w-[380px] h-[620px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* 사이드바 (로그인 시만) */}
                {session && (
                  <button
                    onClick={() => setShowSidebar(true)}
                    className="text-white/80 hover:text-white text-lg"
                    title="대화 이력"
                  >
                    ☰
                  </button>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{currentPersona.emoji}</span>
                    <span className="text-white font-bold text-sm">
                      {currentPersona.name}
                    </span>
                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                  </div>
                  <p className="text-blue-100 text-xs">{currentPersona.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* 새 대화 */}
                <button
                  onClick={handleNewChat}
                  className="text-white/80 hover:text-white text-sm"
                  title="새 대화"
                >
                  ✏️
                </button>
                {/* 로그인/로그아웃 */}
                {session ? (
                  <button
                    onClick={() => signOut()}
                    className="text-white/70 hover:text-white text-xs bg-white/10 px-2 py-1 rounded"
                  >
                    로그아웃
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAuth(true)}
                    className="text-white/70 hover:text-white text-xs bg-white/10 px-2 py-1 rounded"
                  >
                    로그인
                  </button>
                )}
                {/* 닫기 */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/70 hover:text-white text-xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            {/* 페르소나 탭 */}
            <div className="flex gap-1 mt-2">
              {(Object.keys(personas) as PersonaType[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePersonaChange(p)}
                  className={`flex-1 py-1 text-xs rounded-lg font-medium transition-all ${
                    personaType === p
                      ? "bg-white text-blue-700"
                      : "text-blue-100 hover:bg-white/10"
                  }`}
                >
                  {personas[p].emoji} {personas[p].name}
                </button>
              ))}
            </div>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
            {/* 웰컴 메시지 */}
            {messages.length === 0 && !streamingText && (
              <div className="text-center py-8">
                <div className="text-5xl mb-3">{currentPersona.emoji}</div>
                <p className="text-gray-700 font-semibold">
                  안녕하세요! {currentPersona.name}입니다
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {currentPersona.description}
                </p>
                {!session && (
                  <p className="text-xs text-blue-500 mt-3 bg-blue-50 px-3 py-2 rounded-lg">
                    💡{" "}
                    <button
                      onClick={() => setShowAuth(true)}
                      className="underline"
                    >
                      로그인
                    </button>
                    하면 대화 이력이 저장됩니다
                  </p>
                )}
              </div>
            )}

            {/* 메시지 목록 */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <span className="text-lg mr-2 mt-1 flex-shrink-0">
                    {currentPersona.emoji}
                  </span>
                )}
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-code:text-blue-700 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* 스트리밍 중 */}
            {streamingText && (
              <div className="flex justify-start">
                <span className="text-lg mr-2 mt-1 flex-shrink-0">
                  {currentPersona.emoji}
                </span>
                <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-bl-sm bg-white text-gray-800 text-sm shadow-sm border border-gray-100 leading-relaxed">
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{streamingText}</ReactMarkdown>
                  </div>
                  <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5 rounded-sm" />
                </div>
              </div>
            )}

            {/* 로딩 (스트리밍 전) */}
            {loading && !streamingText && (
              <div className="flex justify-start">
                <span className="text-lg mr-2 mt-1">{currentPersona.emoji}</span>
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 입력 영역 */}
          <div className="px-3 py-3 border-t border-gray-100 bg-white flex-shrink-0">
            <div className="flex items-end gap-2 bg-gray-100 rounded-xl px-3 py-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`${currentPersona.name}에게 질문하세요... (Enter 전송)`}
                rows={1}
                disabled={loading}
                className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-800 placeholder-gray-400 max-h-24"
                style={{ lineHeight: "1.5" }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 rounded-lg flex items-center justify-center transition-colors"
                aria-label="전송"
              >
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-1.5">
              AI 답변은 참고용입니다 · Powered by Claude
            </p>
          </div>
        </div>
      )}
    </>
  );
}
