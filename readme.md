# 2025 아만타 프로젝트 1

수학 교구 / 학습 게임 / 활동 도우미 등

## Project Structure

- `src/01_math_activity/` - 수학 교구
- `src/02_edu_game/` - 학습 게임
- `src/common/` - 공통 소스

## npm run

1. dev 모드 : config/dev.js - 1개 액티비티만 실행.

```bash
npm run dev
```

2. dev.list 모드 : config/dev-list.js - 하위 폴더의 모든 액티비티 실행

```bash
npm run dev.list
```

3. build 모드 : config/list.ts - 하위 폴더의 모든 액티티비티 빌드

```bash
npm run build
```

## src 트리

```bash
├── 01_math_activity
│   ├── 액티비티 01
│   └── 액티비티 02
├── 02_edu_game
│   ├── 액티비티 01
│   └── 액티비티 02
└── common
    ├── assets
    │   ├── audio
    │   └── images
    ├── css
    ├── font
    └── ts

```

## 액티비티 트리

```bash
├── _sample_01 (액티비티)
│   ├── audio
│   ├── cc
│   ├── css
│   ├── font
│   ├── images
│   ├── ts
│   └── index.html
└── _sample_02
     ├── audio
     ...
```

## License

<!-- ![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg) -->

All rights, including copyright and license, belong to Amanta.

