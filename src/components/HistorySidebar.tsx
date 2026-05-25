"use client";
import { useEffect, useState } from "react";
import { personas } from "@/lib/personas";
import type { Conversation } from "@/types";

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (conv: Conversation) => void;
  currentConversationId?: string | null;
}

export default function HistorySidebar({
  isOpen,
  onClose,
  onSelectConversation,
  currentConversationId,
}: HistorySidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchConversations();
  }, [isOpen]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("이 대화를 삭제하시겠습니까?")) return;
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSelect = async (conv: Conversation) => {
    const res = await fetch(`/api/conversations/${conv.id}`);
    if (res.ok) {
      const data = await res.json();
      onSelectConversation(data.conversation);
    }
    onClose();
  };

  const personaEmoji = (type: string) =>
    personas[type as keyof typeof personas]?.emoji || "💬";

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) {
      return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    }
    if (diff < 86400000 * 7) {
      return ["일", "월", "화", "수", "목", "금", "토"][d.getDay()] + "요일";
    }
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  return (
    <>
      {/* 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={onClose}
        />
      )}
      {/* 사이드바 */}
      <div
        className={`fixed left-0 top-0 h-full w-72 bg-white shadow-2xl z-40 flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold">대화 이력</h2>
            <p className="text-blue-100 text-xs mt-0.5">
              {conversations.length}개의 대화
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              불러오는 중...
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-2">
              <span className="text-3xl">💬</span>
              <span>대화 이력이 없습니다</span>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelect(conv)}
                className={`mx-2 my-1 px-3 py-3 rounded-xl cursor-pointer group transition-all hover:bg-blue-50 ${
                  currentConversationId === conv.id
                    ? "bg-blue-50 border border-blue-200"
                    : "hover:border hover:border-blue-100"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5 flex-shrink-0">
                    {personaEmoji(conv.personaType)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {conv.title}
                      </p>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {formatDate(conv.updatedAt)}
                      </span>
                    </div>
                    {(conv as any).messages?.[0] && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {(conv as any).messages[0].content}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDelete(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all text-sm flex-shrink-0"
                    title="삭제"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 새 대화 버튼 */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            + 새 대화 시작
          </button>
        </div>
      </div>
    </>
  );
}
