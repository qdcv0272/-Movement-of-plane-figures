# 🔷 Math Shape Board (평면 도형의 이동)

TypeScript와 GSAP를 활용하여 구축한 **인터랙티브 수학 학습 활동**입니다.
사용자는 한글, 숫자, 도형 등을 보드 위에 배치하고 **밀기(Push), 뒤집기(Flip), 돌리기(Swing)** 등의 조작을 통해 기하학적 변환 과정을 시각적으로 학습할 수 있습니다.

## 🔗 배포 링크

**[🚀 배포 사이트 바로가기 (Netlify)](https://movement-of-plane-figures.netlify.app/)**

---

## 🛠 Tech Stack

### Frontend & Animation

<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=TypeScript&logoColor=white"> <img src="https://img.shields.io/badge/GSAP-88CE02?style=for-the-badge&logo=GreenSock&logoColor=white"> <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=HTML5&logoColor=white"> <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=CSS3&logoColor=white">

### Development & Build

<img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=Vite&logoColor=white"> <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white">

---

## 💡 주요 기능 및 동작 원리

### 1. 다양한 학습 모드 선택 (Intro Step)

- **기능**: 한글 자음, 숫자, 기본 도형 또는 사용자 커스텀 보드 선택
- **구현**: `Intro` 클래스에서 사용자 입력을 받아 게임 모드를 초기화합니다.
  - **커스텀 플레이**: `SvgShapeBoardManager`를 활용하여 사용자가 직접 보드를 구성할 수 있습니다.
  - **프리셋 모드**: 미리 정의된 에셋(이미지)을 로드하여 게임을 시작합니다.

### 2. 도형 변환 인터랙션 (Game Step)

- **기능**: 도형을 선택하고 변환(이동, 대칭, 회전) 명령 수행
- **구현**: `Game` 클래스가 메인 컨트롤러 역할을 수행하며, `GameBtnManager`를 통해 UI 이벤트를 처리합니다.
  - **Push (밀기)**: 상하좌우 방향으로 도형 이동
  - **Flip (뒤집기)**: 축을 기준으로 도형 대칭 이동
  - **Swing (돌리기)**: 90도 단위의 시계/반시계 회전

### 3. GSAP 기반 고성능 애니메이션

- **기능**: 부드럽고 정교한 도형 움직임 구현
- **구현**: `GsapExecutor` 클래스가 애니메이션 큐를 관리하고 실행합니다. 복잡한 타임라인 제어를 통해 교육적으로 유의미한 시각적 피드백을 제공합니다.

```typescript
// src/common/ts/activity/math_shape_board/game.ts
gsap.config({
  nullTargetWarn: false,
  autoSleep: 60,
  force3D: true, // 하드웨어 가속 활성화
});
```

---

## 📂 폴더 구조 (Folder Structure)

```bash
src/
├── 01_math_activity/
│   └── math_shape_board/    # 진입점 (Entry Point) & 리소스
│       ├── index.html       # 메인 HTML
│       ├── audio/           # 효과음 (밀기, 뒤집기 등)
│       ├── css/             # 스타일시트
│       ├── images/          # 도형 및 UI 이미지 에셋
│       └── ts/              # 메인 스크립트 (index.ts)
│
└── common/
    └── ts/activity/math_shape_board/  # 핵심 로직 (Core Logic)
        ├── game.ts          # 게임 메인 로직 (도형 조작)
        ├── intro.ts         # 모드 선택 및 초기화
        ├── shape_board_main.ts # 페이지 관리 및 이미지 프리로딩
        └── modules/         # 기능별 모듈
            ├── game_btn_manager.ts # 버튼 이벤트 핸들러
            ├── gsap_manager.ts     # GSAP 애니메이션 관리자
            ├── polygons_manager.ts # 다각형 데이터 처리
            └── svg_manager.ts      # SVG 렌더링 관리
```

---

## 🗄️ Architecture & Class Structure

### `shapeBoard` (extends Page)

- 애플리케이션의 진입점이자 생명주기 관리자
- `ImagePreloader` 내장: 초반 로딩 시 대량의 이미지 리소스(보드, 아이콘 등)를 미리 로드하여 끊김 없는 경험 제공

### `Intro` (extends Step)

- 게임 시작 전 설정 단계
- 탭 메뉴(Tab UI)를 통한 모드 전환 및 선택된 옵션의 상태 관리

### `Game` (extends Step)

- 핵심 인터랙티브 영역
- `selectedActionModes`: 현재 선택된 변환 모드(push, flip, swing) 상태 추적
- `GsapExecutor`: 사용자 입력 -> 논리적 계산 -> 시각적 애니메이션으로 변환하는 파이프라인 담당

---

## 🚀 Future Improvements

1.  **반응형 UI 개선**: 다양한 디바이스 해상도에 맞춰 캔버스 및 UI 크기 자동 조절
2.  **커스텀 저장 기능**: 사용자가 만든 커스텀 보드를 로컬 스토리지에 저장하여 재사용 가능하도록 개선
3.  **접근성 강화**: 스크린 리더 지원 및 키보드 탐색 기능 강화

