# 🚀 AI 챗봇 배포 가이드

> **추천 방법:** Vercel(프론트+API) + Turso(SQLite 클라우드) → **완전 무료**

---

## ✅ 배포 전 체크리스트

- [ ] `ANTHROPIC_API_KEY` 발급 완료
- [ ] GitHub 계정 있음
- [ ] Vercel 계정 있음 (GitHub으로 가입 가능)
- [ ] Turso 계정 있음 (GitHub으로 가입 가능)

---

## STEP 1 — GitHub에 코드 올리기

```bash
# 프로젝트 폴더에서 실행
cd C:\Users\user\Desktop\ai-chatbot

# Git 초기화 (처음 한 번만)
git init
git add .
git commit -m "feat: AI 챗봇 초기 구현"
```

그 다음:
1. https://github.com/new 접속
2. 레포지토리 이름 입력 (예: `ai-chatbot`) → **Private** 선택 → Create
3. 화면에 나오는 명령어 실행:

```bash
git remote add origin https://github.com/본인아이디/ai-chatbot.git
git branch -M main
git push -u origin main
```

---

## STEP 2 — Turso DB 생성 (무료 SQLite 클라우드)

### 2-1. Turso CLI 설치

```bash
# Windows PowerShell (관리자 권한)
winget install CliFoundation.Turso

# 또는 npm으로
npm install -g @turso/cli
```

### 2-2. 로그인 & DB 생성

```bash
turso auth login          # 브라우저 열림 → GitHub으로 로그인

turso db create ai-chatbot-db    # DB 생성

turso db show ai-chatbot-db      # URL 확인 (libsql://... 복사)

turso db tokens create ai-chatbot-db   # 토큰 생성 (복사)
```

### 2-3. 로컬 .env 수정

`.env` 파일을 열고 DATABASE_URL을 아래로 교체:

```env
DATABASE_URL="libsql://ai-chatbot-db-본인아이디.turso.io?authToken=발급받은토큰"
```

### 2-4. DB 스키마 적용

```bash
# prisma/schema.prisma의 provider를 변경
# "sqlite" → "sqlite" 는 그대로 두되, URL만 Turso URL로 교체하면 됩니다
npm run db:push
```

---

## STEP 3 — Vercel 배포

### 3-1. Vercel 접속 & 연결

1. https://vercel.com 접속 → GitHub으로 로그인
2. **New Project** 클릭
3. `ai-chatbot` 레포지토리 선택 → **Import**
4. Framework: **Next.js** (자동 감지됨)

### 3-2. 환경 변수 입력

Vercel 배포 화면의 **Environment Variables** 섹션에 아래 값 입력:

| 변수명 | 값 |
|---|---|
| `ANTHROPIC_API_KEY` | sk-ant-... (실제 키) |
| `DATABASE_URL` | libsql://....turso.io?authToken=... |
| `NEXTAUTH_URL` | https://your-app.vercel.app (배포 후 URL로) |
| `NEXTAUTH_SECRET` | 아래 명령어로 생성한 값 |
| `CHATBOT_MODEL` | claude-sonnet-4-20250514 |
| `CHATBOT_MAX_TOKENS` | 2048 |

**NEXTAUTH_SECRET 생성 방법:**
```bash
# PowerShell에서
[System.Web.Security.Membership]::GeneratePassword(32, 8)

# 또는 온라인: https://generate-secret.vercel.app/32
```

### 3-3. 배포

**Deploy** 버튼 클릭 → 2~3분 대기 → 완료!

### 3-4. NEXTAUTH_URL 업데이트

배포 완료 후 Vercel이 도메인을 알려줌 (예: `https://ai-chatbot-abc123.vercel.app`)

Vercel → 프로젝트 → Settings → Environment Variables에서:
- `NEXTAUTH_URL` 값을 실제 URL로 업데이트
- Redeploy (Deployments 탭 → 최신 배포 → Redeploy)

---

## 🔁 이후 코드 수정 시 재배포

```bash
git add .
git commit -m "수정 내용"
git push
```
GitHub push하면 Vercel이 자동으로 재배포됨!

---

## ❓ 자주 발생하는 문제

### "prisma generate" 오류
```bash
# package.json의 postinstall 스크립트가 자동 실행됨
# 문제 시 vercel.json 추가:
```
`vercel.json` 파일을 프로젝트 루트에 생성:
```json
{
  "buildCommand": "prisma generate && next build"
}
```

### 환경 변수가 적용 안 됨
- Vercel에서 환경 변수 수정 후 반드시 **Redeploy** 필요

### NEXTAUTH 오류
- `NEXTAUTH_URL`이 실제 배포 URL과 정확히 일치하는지 확인
- `https://` 포함 여부 확인

---

## 💰 비용

| 서비스 | 무료 한도 |
|---|---|
| Vercel | 무제한 프로젝트, 월 100GB 대역폭 |
| Turso | DB 500개, 월 500MB 저장, 월 10억 row reads |
| Anthropic | API 사용량에 따라 과금 (Claude Sonnet 기준 입력 $3/MTok) |

---

## 🌐 커스텀 도메인 연결 (선택)

Vercel → 프로젝트 → Settings → Domains → 도메인 입력
DNS 설정은 도메인 구매처(가비아, Cloudflare 등)에서 CNAME 레코드 추가
