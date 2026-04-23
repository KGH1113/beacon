# Beacon Project Overview

Beacon은 Ubuntu Server 24.04 + Docker Compose + Tailscale 환경을 기준으로 만드는 홈서버 패널 프로젝트다.

목표는 "예쁜 대시보드"보다 "실제로 서버를 안전하게 운영할 수 있는 제어 패널"이다.

## 1차 범위

- 실행 중인 Docker 컨테이너 조회
- 컨테이너 Start/Stop/Restart
- 컨테이너 로그 tail
- 컨테이너 내부 exec 터미널
- Minecraft 서버 상태 조회
- Minecraft RCON 콘솔
- CPU, RAM, Network, SSD 사용량 표시
- 열린 포트와 바인딩 상태 표시
- 다운로드 링크 기반 파일 공유
- 현재 서빙 중인 파일 목록 조회 및 삭제

## 운영 가정

- 호스트 OS: Ubuntu Server 24.04
- 컨테이너 오케스트레이션: Docker Compose
- 외부 접근: Tailscale tailnet 내부만 허용
- 2차 방어선: 간단한 비밀번호 로그인 추가
- 호스트 쉘은 패널에서 직접 노출하지 않음
- Docker 관련 쉘은 컨테이너 exec 로만 허용
- Minecraft 관련 제어는 RCON 으로만 허용

## 권장 아키텍처

- `apps/panel`
  - Next.js App Router 기반 운영 패널
  - shadcn/ui, xterm.js, TanStack Query 사용
- `apps/daemon`
  - 홈서버 로컬에서만 동작하는 Node.js 백그라운드 서비스
  - Docker, PTY, RCON, 파일 공유, 시스템 메트릭 담당
- `packages/shared`
  - zod 스키마, 공통 타입, 이벤트 페이로드

`apps/panel`은 사용자가 보는 표면이고, 민감한 권한은 모두 `apps/daemon`에 모은다.

## 핵심 기술 선택

- UI: Next.js + TypeScript + Tailwind + shadcn/ui
- 실시간: Socket.IO 또는 WebSocket
- 터미널 UI: xterm.js
- PTY: node-pty
- Docker 제어: dockerode 또는 Docker Engine API
- 시스템 메트릭: systeminformation
- 인증: Tailscale 네트워크 제한 + 앱 비밀번호

## 왜 이렇게 나누는가

- Docker socket, 파일시스템, RCON 자격증명은 브라우저 앱과 분리하는 편이 안전하다.
- panel 과 daemon 을 분리하면 이후 panel 만 교체하거나 daemon 만 systemd 서비스로 운영하기 쉽다.
- 장애 시에도 어떤 프로세스가 죽었는지 파악이 쉽고 권한 범위도 선명하다.

## 다음 단계

1. 루트 워크스페이스 스캐폴딩
2. panel 앱 초기화
3. daemon 앱 초기화
4. Docker 상태 조회 API부터 구현
5. xterm 기반 컨테이너 exec 세션 붙이기
6. Minecraft 서버 레지스트리 + RCON 붙이기
7. 파일 공유 링크와 정리 기능 추가

구체적인 설계는 [architecture.md](/Users/kgh/dev/src/beacon/docs/architecture.md) 참고.

