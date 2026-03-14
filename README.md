# pedagogical-essay

Next.js 15 기반 교직논술 학습 서비스입니다.

## Requirements

- Node.js 22.x
- npm 10+

## Local Setup

```bash
cp .env.example .env.local
npm ci
npm run dev
```

권장 버전 파일:

- `.nvmrc`
- `.node-version`

## Environment Variables

필수:

- `GEMINI_API_KEY`
- `QUESTION_SIGNING_SECRET`

선택:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

`KV_*` 값이 없으면 방문자 카운터 API는 `0`을 반환합니다.

## Verify Before Push

```bash
npm run verify
```

검증 항목:

- ESLint
- TypeScript typecheck
- production build

## GitHub

- GitHub Actions CI가 `push`, `pull_request`에서 실행됩니다.
- Dependabot이 npm, GitHub Actions 업데이트를 주 1회 확인합니다.

## Vercel

Vercel 프로젝트 환경변수에 아래 값을 설정해야 합니다.

- `GEMINI_API_KEY`
- `QUESTION_SIGNING_SECRET`
- `KV_REST_API_URL` (optional)
- `KV_REST_API_TOKEN` (optional)

Node.js 버전은 `22.x`를 사용하도록 맞춰 두었습니다.
