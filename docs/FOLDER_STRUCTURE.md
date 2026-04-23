# Beacon Folder Structure

현재는 구현보다 구조를 먼저 고정하는 단계다.

## 목표

- `panel`과 `daemon`의 경계를 먼저 분명하게 나눈다.
- 공용 패키지는 최소 단위만 둔다.
- 실제 구현은 각 폴더 책임이 합의된 뒤에 넣는다.

## 디렉터리 구조

```text
.
├── apps/
│   ├── daemon/
│   │   └── src/
│   │       ├── app.ts
│   │       ├── index.ts
│   │       ├── config/
│   │       ├── integrations/
│   │       ├── plugins/
│   │       ├── shared/
│   │       │   ├── errors/
│   │       │   ├── types/
│   │       │   └── utils/
│   │       └── modules/
│   │           ├── docker/
│   │           ├── health/
│   │           ├── minecraft/
│   │           ├── share/
│   │           └── system/
│   └── panel/
│       └── src/
│           ├── app/
│           ├── components/
│           ├── features/
│           │   ├── auth/
│           │   ├── dashboard/
│           │   ├── docker/
│           │   ├── minecraft/
│           │   ├── shares/
│           │   └── system/
│           ├── api-client.ts
│           ├── api-error.ts
│           ├── auth.ts
│           ├── env.ts
│           ├── navigation.ts
│           ├── routes.ts
│           ├── utils.ts
│           └── zustand.ts
├── config/
├── docs/
└── packages/
    ├── config/
    │   └── src/
    ├── db/
    │   ├── prisma/
    │   └── src/
    │       ├── client/
    │       ├── repositories/
    │       └── types/
    └── shared/
        └── src/
            ├── auth/
            ├── common/
            │   ├── entity/
            │   ├── meta/
            │   └── pagination/
            ├── docker/
            ├── minecraft/
            ├── realtime/
            ├── share/
            └── system/
```

## 책임

### `apps/panel`

- Next.js App Router 기반 UI
- route group은 `(auth)`와 `(app)` 기준으로 나눈다.
- feature 내부는 `*.components.tsx`, `*.hooks.ts`, `*.store.ts`, `*.actions.ts`, `*.schema.ts`, `*.lib.ts`처럼 파일 종류별로 묶는다.
- SSR 데이터 조립은 `app/*/page.tsx`에서 시작한다.
- SSR이 아닌 요청만 각 feature의 `*.hooks.ts`에서 처리한다.
- `Zustand`는 전역 서버 캐시가 아니라 UI 상태와 필터/선택 상태에 집중한다.
- `components/ui`는 shadcn 기본 컴포넌트 위치로 유지한다.

### `apps/daemon`

- Elysia 기반 제어 서비스
- `app.ts`에서 plugin + route 조립
- `integrations/*`에서 외부 시스템 경계 유지
- `modules/*`에서 schema/service/controller/route 중심 구조 유지
- daemon 전용 공통 코드는 `src/shared/*`에 유지

### `packages/shared`

- panel/daemon 공용 DTO
- 모든 DTO의 zod 스키마와 inferred type
- 모듈 기준 디렉터리 구조
- request/response/realtime 계약의 단일 소스

### `packages/config`

- env 스키마
- 설정 로더
- 상수

### `packages/db`

- Prisma schema
- generated client 접근점
- DB repository
- persistence 전용 타입

## 구현 원칙

- `panel` UI 컴포넌트는 우선 앱 내부에 둔다.
- `daemon` 비즈니스 로직은 `modules/*`에 둔다.
- 외부 시스템 연동은 `integrations/*`에 둔다.
- app 조립용 Elysia 플러그인은 `plugins/*`에 둔다.
- 공용 DTO는 `packages/shared`에서만 정의한다.
- DB 접근은 `packages/db`를 통해서만 이뤄진다.
