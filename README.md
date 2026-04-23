<div align="center">

![header](https://capsule-render.vercel.app/api?type=venom&height=300&color=0:0F172A,35:1D4ED8,70:38BDF8,100:BAE6FD&text=BEACON&fontColor=F8FAFC)

### 홈서버를 한 화면에서 운영하는 패널

<p align="center">
  <img alt="typescript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=TypeScript&logoColor=white" />
  <img alt="nextjs" src="https://img.shields.io/badge/Next.js-111111?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img alt="nodejs" src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img alt="docker" src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img alt="tailscale" src="https://img.shields.io/badge/Tailscale-242424?style=for-the-badge&logo=tailscale&logoColor=white" /> <br />
  <img alt="ubuntu" src="https://img.shields.io/badge/Ubuntu_Server-E95420?style=for-the-badge&logo=ubuntu&logoColor=white" />
  <img alt="minecraft" src="https://img.shields.io/badge/Minecraft-3C8527?style=for-the-badge&logoColor=white" />
  <img alt="xtermjs" src="https://img.shields.io/badge/xterm.js-1F2937?style=for-the-badge&logoColor=white" />
  <img alt="shadcn" src="https://img.shields.io/badge/shadcn/ui-0F172A?style=for-the-badge&logoColor=white" />
</p>

<p>
  Docker 컨테이너를 보고 제어하고,<br/>
  Minecraft 서버 상태와 RCON을 다루고,<br/>
  파일 공유와 시스템 상태까지 한 곳에서 관리합니다.
</p>

</div>

---

이 Repository는 **Beacon**의 소스 트리입니다.  
Beacon은 Tailscale 내부망을 전제로 동작하는 홈서버 운영 패널로,
Docker, Minecraft, 시스템 메트릭, 파일 공유를 하나의 작업면으로 묶는 것을 목표로 합니다.

---

## 문서 바로가기

| 문서 | 설명 |
| --- | --- |
| [docs/FOLDER_STRUCTURE.md](./docs/FOLDER_STRUCTURE.md) | 현재 기준 폴더 골격과 각 디렉터리 책임 |
| [docs/PROJECT_OVERVIEW.md](./docs/PROJECT_OVERVIEW.md) | 제품 범위, 운영 가정, 권장 구조, 다음 단계 정리 |
| [docs/architecture.md](./docs/architecture.md) | `panel` / `daemon` 분리 구조, 보안 경계, 도메인 모델, MVP 순서 설명 |

---

## 저장소 구조

```text
.
├── apps/
│   ├── daemon/   # 홈서버 로컬 백그라운드 서비스
│   └── panel/    # 브라우저 운영 패널
├── config/
├── docs/
├── packages/
│   ├── config/
│   ├── db/
│   └── shared/
└── docker-compose.yml
```
