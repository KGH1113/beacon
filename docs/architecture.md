# Beacon Architecture

## Visual Thesis

차분한 운영 툴 톤 위에 터미널과 상태 정보가 중심이 되는, Linear 스타일의 밀도 높은 홈서버 패널.

## Content Plan

- 운영 개요: 핵심 상태, 경고, 시스템 자원
- Docker 워크스페이스: 컨테이너 목록, 로그, exec
- Minecraft 워크스페이스: 서버 상태, 접속자 수, RCON 콘솔
- 파일 공유 워크스페이스: 링크 생성, 현재 공유 목록, 삭제

## Interaction Thesis

- 좌측 네비게이션 + 중앙 작업면 + 우측 상세 패널
- resizable panel 기반 다중 작업 레이아웃
- 로그/콘솔/메트릭은 실시간 스트림으로 갱신

## Process Model

### apps/panel

역할:

- 로그인 세션 유지
- 대시보드 렌더링
- 실시간 이벤트 수신
- 사용자 액션 전송

권한:

- 직접 Docker socket 접근 금지
- 직접 파일시스템 접근 금지
- 직접 RCON 자격증명 보관 금지

### apps/daemon

역할:

- Docker Engine API 접근
- 컨테이너 exec 세션 생성
- 로그 스트리밍
- 시스템 메트릭 수집
- 포트/프로세스/네트워크 조회
- Minecraft RCON 세션 관리
- 파일 공유 링크 생성과 다운로드 처리

권한:

- Docker socket 읽기/쓰기
- 지정된 공유 루트 경로 접근
- Minecraft 서버별 RCON 자격증명 접근
- localhost 또는 Compose 내부 네트워크에만 바인딩

## Deployment Model

권장 배포는 두 가지다.

### 선택안 A

- `panel`과 `daemon`을 각각 Docker Compose 서비스로 분리
- `daemon`에만 `/var/run/docker.sock` 마운트
- `daemon`에 공유 폴더 볼륨 마운트
- `panel`은 `daemon`과 내부 네트워크로만 통신

장점:

- 권한 분리가 명확함
- panel 재배포가 쉬움
- 장애 분석이 쉬움

### 선택안 B

- `panel`은 Docker
- `daemon`은 호스트 systemd 서비스

장점:

- PTY, 포트 조회, 파일 접근이 더 자연스러움
- 호스트 자원 접근에 덜 억지스러움

초기 버전은 `선택안 B`가 더 잘 맞는다.
이유는 Minecraft systemd 서버와 호스트 메트릭, 포트 조회를 같이 다루기 때문이다.

## Security Model

보안 경계는 아래 순서로 둔다.

1. Tailscale ACL 로 패널 접근 제한
2. 앱 자체 비밀번호 로그인
3. 민감 작업은 daemon 에서만 수행
4. panel 에서는 daemon 의 허용된 작업만 호출
5. 호스트 쉘은 아예 비노출

추가 원칙:

- 컨테이너 exec 는 선택된 컨테이너 안에서만 허용
- Minecraft 제어는 RCON 명령만 허용
- 파일 공유는 허용된 루트 디렉터리 하위만 허용
- 심볼릭 링크 탈출 방지 필요
- 다운로드 링크는 랜덤 토큰 + 만료시간 + 1회/다회 옵션 지원

## Domain Model

### Container

- id
- name
- image
- state
- status
- cpuPercent
- memoryBytes
- ports
- composeProject
- composeService

### MinecraftServer

- id
- name
- kind
- host
- port
- source
- online
- onlinePlayers
- maxPlayers
- motd
- version
- rconEnabled

`source`는 `systemd` 또는 `docker` 로 시작한다.

### FileShare

- id
- filePath
- fileName
- sizeBytes
- createdAt
- expiresAt
- token
- downloadCount
- revokedAt

## Main Features

## 1. Docker Workspace

필수 기능:

- 컨테이너 목록
- 상태 갱신
- start/stop/restart
- 로그 tail
- exec 터미널

구현 메모:

- 목록 조회는 dockerode 또는 Engine API 사용
- 로그는 stream 을 웹소켓으로 전달
- exec 는 Docker exec + PTY 브리지로 구성
- 터미널 프론트는 xterm.js 사용

제약:

- 호스트 쉘 제공 금지
- 컨테이너 선택 없이 임의 명령 실행 금지

## 2. Minecraft Workspace

필수 기능:

- 서버 목록
- 온라인 여부
- 접속자 수
- MOTD
- RCON 콘솔

초기 등록 방식:

- 정적 설정 파일 `config/minecraft-servers.json`
- 서버별 이름, 주소, 포트, 상태 조회 포트, RCON 포트, credential key 명시

확장:

- 나중에 `docker` 또는 `systemd` 자동 감지 가능
- 초기는 수동 등록이 더 안전함

## 3. Host Metrics

표시 대상:

- CPU 사용률
- Load average
- RAM 사용량
- 디스크 사용량
- NIC 별 송수신량
- 열린 포트와 바인딩 프로세스

구현 메모:

- systeminformation 으로 CPU/RAM/디스크/NIC 수집
- 열린 포트는 `ss -tulpn` 결과 파싱
- 루트 권한이 필요한 영역은 없는지 배포 전에 확인 필요

## 4. File Sharing

초기 범위:

- 허용된 공유 루트에서 파일 선택
- 다운로드 링크 생성
- 현재 활성 링크 목록
- 링크 삭제
- 파일 삭제

보안 메모:

- 경로 정규화 후 루트 탈출 차단
- 디렉터리 다운로드는 2차 범위
- 초기는 "파일 단위"만 지원 추천

## Realtime Channels

추천 채널:

- `host.metrics`
- `docker.container.logs.{id}`
- `docker.container.exec.{sessionId}`
- `minecraft.rcon.{serverId}`

모든 실시간 채널은 세션 검증 뒤 구독 가능해야 한다.

## Config Files

초기 설정 파일 구조:

- `config/app.env`
- `config/minecraft-servers.json`
- `config/share-roots.json`

예시 항목:

- 앱 비밀번호 해시
- 공유 루트 목록
- Minecraft 서버 정의
- daemon listen 주소

## MVP Slice

제일 먼저 만들 순서는 아래가 가장 좋다.

1. 로그인 화면
2. 시스템 개요 카드와 포트 목록
3. Docker 컨테이너 목록
4. 컨테이너 로그 패널
5. 컨테이너 exec 터미널
6. Minecraft 서버 목록과 RCON 콘솔
7. 파일 공유 링크 생성

## Open Decisions

아직 정해야 하는 점:

- daemon 을 Docker 로 띄울지 systemd 로 띄울지 최종 확정
- Minecraft 상태 조회를 ping 기반으로 할지 query 기반으로도 볼지
- 파일 공유 링크를 어느 public hostname 으로 노출할지

현재 정보 기준으로는 아래를 권장한다.

- daemon: systemd
- Minecraft 상태: ping 우선, RCON 별도
- 파일 공유: daemon 의 public share server 를 Tailscale Funnel 로 외부 공개
