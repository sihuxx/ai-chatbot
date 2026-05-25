import ChatWidget from "@/components/ChatWidget";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* 네비게이션 */}
      <nav className="fixed top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AI 학습 허브
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">기능 소개</a>
            <a href="#personas" className="hover:text-blue-600 transition-colors">AI 도우미</a>
            <a href="#faq" className="hover:text-blue-600 transition-colors">FAQ</a>
          </div>
        </div>
      </nav>

      {/* 히어로 섹션 */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Claude AI 기반 · 실시간 스트리밍 응답
          </div>
          <h1 className="text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
            당신만의
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {" "}AI 도우미
            </span>
            와<br />지금 대화해보세요
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            학습 질문부터 취업 상담까지, 전문 AI 도우미들이 24시간 도와드립니다.
            우측 하단 버튼을 클릭해 시작하세요.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => {
                const btn = document.querySelector("[aria-label='챗봇 열기']") as HTMLElement;
                btn?.click();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              지금 시작하기 →
            </button>
            <a
              href="#features"
              className="bg-white hover:bg-gray-50 text-gray-700 px-8 py-3.5 rounded-xl font-semibold text-lg border border-gray-200 transition-all"
            >
              기능 알아보기
            </a>
          </div>
        </div>
      </section>

      {/* 기능 소개 */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            왜 AI 학습 허브인가요?
          </h2>
          <p className="text-center text-gray-500 mb-12">
            Claude AI의 강력한 언어 이해력으로 수준 높은 상담을 제공합니다
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "⚡",
                title: "실시간 스트리밍",
                desc: "타이핑하듯 실시간으로 답변이 나타납니다. 긴 답변도 기다림 없이 읽을 수 있어요.",
              },
              {
                icon: "📂",
                title: "대화 이력 저장",
                desc: "로그인하면 모든 대화가 저장됩니다. 언제든지 과거 상담 내용을 다시 확인하세요.",
              },
              {
                icon: "🎭",
                title: "전문 페르소나",
                desc: "학습 도우미, 취업 상담사, 사이트 안내봇 중 상황에 맞는 AI를 선택하세요.",
              },
              {
                icon: "🔒",
                title: "안전한 대화",
                desc: "내 대화는 나만 볼 수 있습니다. 철저한 권한 관리로 개인정보를 보호합니다.",
              },
              {
                icon: "📱",
                title: "마크다운 지원",
                desc: "코드 블록, 표, 목록 등 마크다운 형식으로 구조화된 답변을 받을 수 있어요.",
              },
              {
                icon: "🆓",
                title: "비로그인도 OK",
                desc: "회원가입 없이도 바로 이용 가능합니다. 더 많은 기능은 로그인 후 사용하세요.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all"
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {f.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 페르소나 소개 */}
      <section id="personas" className="py-20 px-6 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            AI 도우미 소개
          </h2>
          <p className="text-center text-gray-500 mb-12">
            목적에 맞는 전문 AI를 선택하세요
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                emoji: "📚",
                name: "학습 도우미",
                persona: "루미",
                tags: ["프로그래밍", "수학", "영어", "자격증"],
                desc: "학습 관련 모든 질문에 친절하게 답변드립니다. 개념 설명부터 실습 예제까지!",
              },
              {
                emoji: "💼",
                name: "취업 상담사",
                persona: "잡이 (Job-i)",
                tags: ["이력서", "면접 준비", "직무 분석", "커리어"],
                desc: "취업 준비의 모든 단계를 함께합니다. 이력서 첨삭부터 면접 코칭까지!",
              },
              {
                emoji: "🗺️",
                name: "사이트 안내",
                persona: "루미",
                tags: ["메뉴 안내", "콘텐츠 추천", "FAQ"],
                desc: "원하는 콘텐츠를 빠르게 찾아드립니다. 사이트 이용 관련 모든 질문 환영!",
              },
            ].map((p) => (
              <div
                key={p.name}
                className="bg-white p-6 rounded-2xl shadow-sm border border-white hover:shadow-md transition-all"
              >
                <div className="text-5xl mb-4 text-center">{p.emoji}</div>
                <h3 className="text-lg font-bold text-gray-900 text-center mb-1">
                  {p.name}
                </h3>
                <p className="text-blue-600 text-sm text-center font-medium mb-3">
                  "{p.persona}"
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                  {p.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-gray-500 text-sm text-center leading-relaxed">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            자주 묻는 질문
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "로그인 없이도 이용할 수 있나요?",
                a: "네, 비로그인으로도 바로 챗봇을 이용할 수 있습니다. 단, 대화 이력은 브라우저 세션이 끝나면 삭제됩니다. 이력 저장을 원하시면 로그인하세요.",
              },
              {
                q: "어떤 AI 모델을 사용하나요?",
                a: "Anthropic의 Claude Sonnet 4 모델을 사용합니다. 뛰어난 한국어 이해력과 코드 생성 능력을 갖춘 최신 AI입니다.",
              },
              {
                q: "대화 이력은 어디에 저장되나요?",
                a: "로그인 사용자의 대화는 서버 데이터베이스에 안전하게 암호화되어 저장됩니다. 본인만 조회할 수 있으며, 1년 후 자동 삭제됩니다.",
              },
              {
                q: "페르소나는 어떻게 전환하나요?",
                a: "채팅창 상단의 탭(📚 학습 도우미 / 💼 취업 상담사 / 🗺️ 사이트 안내)을 클릭하면 즉시 전환됩니다. 페르소나 변경 시 새 대화가 시작됩니다.",
              },
            ].map((faq, i) => (
              <details
                key={i}
                className="border border-gray-200 rounded-xl overflow-hidden group"
              >
                <summary className="px-6 py-4 cursor-pointer font-medium text-gray-900 hover:bg-gray-50 list-none flex items-center justify-between">
                  {faq.q}
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <div className="px-6 pb-4 text-gray-600 text-sm leading-relaxed border-t border-gray-100">
                  <div className="pt-3">{faq.a}</div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-6 text-center text-sm">
        <p className="mb-2">
          <span className="text-white font-semibold">AI 학습 허브</span> — Powered by Claude AI
        </p>
        <p>© 2026 All rights reserved.</p>
      </footer>

      {/* 챗봇 위젯 */}
      <ChatWidget />
    </main>
  );
}
