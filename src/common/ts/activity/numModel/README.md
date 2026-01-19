## NumModel 모듈 가이드

### 요약

- 역할/책임을 모듈로 분리하고, `NumModel.ts`는 오케스트레이션에 집중합니다.
- 뺄셈 특수 분기: 하위 자리(일/십)가 0이면 시작 자리를 십/백의자리로 건너뜁니다(`setInitialPlaceForSubtractionStart`).
- 손가이드: 현재 자리의 왼→오 유도, 빌림 진행/대기 시 `borrowable` 요소 우선 유도 등 규칙 기반 타깃팅을 사용합니다.
- 다시하기/리셋/홈: 상태·애니메이션·클릭 차단을 정리하고 결과/입력 화면으로 안전하게 전환합니다.
- 주요 API는 `UIManager`/`ResultManager`/`NumModelRenderer`/`BorrowLogic`/`PlaceUtils`를 통해 노출됩니다.

### 목차

- 목적
- 디렉터리 구조(요약)
- 책임 분담
- 핵심 흐름(Flow)
- 주요 API 한눈에 보기
- 뺄셈 특수 분기
- 손가이드 타깃팅 규칙
- 다시하기/리셋 시 초기화 포인트
- 개발 가이드(Do/Don't)
- 마이그레이션 메모
- 간단 예시
- 유지보수 팁
- E2E 스모크 테스트 체크리스트

### 목적

- 거대 단일 파일을 역할별 모듈로 분리해 가독성/안정성/재사용성을 높입니다.
- 순수 로직과 UI/DOM/애니메이션을 분리하고, 상태 변경은 중앙에서 관리합니다.

### 디렉터리 구조(요약)

```text
numModel/
  ├── NumModel.ts                 # 오케스트레이터/컨트롤러 (상태 전이, 모듈 협력 제어)
  ├── HandGuide.ts                # 손가이드
  ├── modules/
  │   ├── AnimationManager.ts     # GSAP 애니메이션(이동, 페이드 등) + 타임아웃 관리
  │   ├── CalculationManager.ts   # 계산/검증/최대 계산 자리 판단
  │   ├── InputManager.ts         # 입력 화면 이미지 배치/리셋
  │   ├── ResultManager.ts        # 결과 화면 UI/버튼/자리 클릭 바인딩
  │   └── UIManager.ts            # 현재 자리/하이라이트/모달/버튼 상태
  └── logic/
      ├── PlaceUtils.ts           # 자리 유틸(PLACES, getDigitAtPlace, splitNumberByPlaces, shouldHideZeroForPlace)
      ├── BorrowLogic.ts          # 빌림 로직(필요성/전파/실행/잔여 계산 판단)
      ├── StateManager.ts         # 상태 중앙 관리(플래그/빌림 상태/전이)
      ├── NumModelRenderer.ts     # 수모형 렌더/DOM 조작 일원화(그룹/카운트/병합 등)
      ├── SubtractionEffects.ts   # 뺄셈 하이라이트/페이드 효과
      ├── BorrowUIManager.ts      # 빌림 UI(하이라이트/클릭 바인딩)
      └── PopupManager.ts         # 계산결과 팝업 표시/닫기
```

### 책임 분담

- NumModel.ts: 모듈 조립과 흐름 제어. 직접 DOM/GSAP 사용 금지.
- modules/\*: 화면/입력/애니메이션 등 상위 기능 매니저.
- logic/\*: 순수 로직/렌더 유틸/상태/특수 UI 효과.

### 핵심 흐름(Flow)

- 결과 진입: `showResultScreen(left, op, right)`
  - 값 표시 → 수모형 이미지 배치 → (뺄셈) `setInitialPlaceForSubtractionStart(left, right)`로 시작 자리 결정 → `highlightCurrentNumBox()` → 손가이드 초기화
- 자리 클릭: `setupResultBoxClick` → `handleResultBoxClick(box, boxIdx, placeIdx)`
  - 가드: 현재 자리 외 클릭/우측 선클릭/빌림 중 클릭 제한 규칙 적용
  - 좌 클릭(왼쪽 값): `placeNumModelInCalcContainerForSubtraction(place, "left")`
  - 우 클릭(오른쪽 값/효과): `applySubtractionVisualEffect(place, "right")`
  - 양쪽 완료 시: `mergeNumModelGroupsForSubtraction(place, cb)` → 다음 자리로 `UIManager.setCurrentPlace(nextPlace)`
- 빌림: 필요 시 `BorrowUIManager` 표시 → `handleBorrowClick` → `BorrowController.handleBorrowClick`로 이미지/카운트 갱신
- 전체 업데이트: 뺄셈 진행 중간/완료 시 `updateAllPlacesForSubtraction()`로 카운트 표시 정합성 유지
- 완료 처리: `isSubtractionCalculationComplete()` → `showCalculationResultPopup()` → 버튼/클릭 차단, 상태 고정
- 재시작/정리:
  - `reset()`/`resetResultScreen()`/`resetResultScreenWithoutHandGuide()`에서 상태/타임아웃/애니메이션/클릭 차단 정리
  - (뺄셈) 시작 자리 재설정: `setInitialPlaceForSubtractionStart(left, right)` → `highlightCurrentNumBox()`

### 주요 API 한눈에 보기(발췌)

- StateManager

  - 플래그: `isAnimating`, `isAutoCalculating`, `isCalculationComplete`, `currentStepIndex`
  - 빌림: `isWaitingForBorrow`, `borrowFromPlace`, `borrowedPlaces`, `borrowCounts`, `currentBorrowTarget`, `isInBorrowProcess`
  - 전이: `resetCalcFlags()`, `startAutoCalc()`, `finishCalc()`, `startAnimating()`, `stopAnimating()`
  - 빌림 전이: `startBorrowProcess(from)`, `endBorrowProcess()`, `resetBorrowState()`
  - 스냅샷/적용: `getBorrowedCountsRecord()`, `setBorrowedCountsFromRecord(updated)`

- UIManager

  - 진행/자리: `getProgressState()`, `getCurrentPlace()`, `setCurrentPlace(place)`, `setClickedState(place, side, clicked)`, `resetClickedStates()`, `resetProgressState()`, `getNextPlace(place)`
  - 강조/화면: `highlightCurrentNumBox()`, `clearAllHighlights()`, `showInputScreen()`
  - 모달/버튼: `showModal(msg)`, `hideModal()`, `setButtonState(selector, active)`, `setButtonEnabled(selector, enabled)`, `setAutoCalcButtonState(calculating)`
  - 버튼 바인딩: `bindResultScreenButtons(handlers: ResultButtonHandlers)`

- ResultManager

  - 화면 전환/값: `showResultScreen()`, `setResultScreenValues(left, op, right)`
  - 초기화: `resetResultScreen()`
  - 자리 클릭: `setupResultBoxClick(cb)`, `setResultBoxClickEnabled(enabled)`
  - 버튼 가시성: `setFixedButtonsVisibility(visible)`

- NumModelRenderer(발췌)

  - 그룹/카운트: `ensureGroup`, `getGroup`, `removeGroup`, `countImagesIn`, `toggleHasBothGroups`, `resetNumBox`, `clearAllGroupsAndImages`, `removeAllCarryGroups`
  - 병합: `clearAndEnsureMergedGroup`, `appendMerged`, `appendMergedOnes`, `prepareMergedAndAppend`, `prepareMergedFromVisible`, `countCarryInMerged`
  - 배치: `appendImagesToGroup`, `splitGroupsAndDistribute`, `ensureSideGroupWithValue`, `placeLeftGroupForSubtraction`, `stackGroupImagesCentered`
  - 카운트 텍스트: `updateNumModelCount`, `updateNumModelCountZero`, `updateSubtractionCount`

- PlaceUtils: `PLACES`, `type Place`, `getDigitAtPlace(n, place)`, `splitNumberByPlaces(n)`, `shouldHideZeroForPlace(result, place)`

- BorrowLogic: `needsBorrow(left, right, place, borrowed)`, `findBorrowablePlace(left, current, borrowed)`, `findNearestBorrowablePlace(...)`, `getBorrowToPlace(from)`, `getActualAvailableCount(left, place, borrowed)`, `applyBorrow(borrowed, from)`, `computeSubtractionDigitForPlace(...)`, `hasRemainingCalculation(...)`

- SubtractionEffects: `changeToRedImage(img, place)`, `changeToOriginalImage(img, place)`, `runSubtractionHighlightAndFade(...)`

- BorrowUIManager: `showBorrowUI(borrowFromPlace)`

- PopupManager: `showCalculationResultPopup(formula)`, `closeCalculationResultPopup()`

- AnimationManager: `animateModelMovement(from, to, cb?)`, `fadeIn(el)`, `fadeOut(el)`, `scaleAnimation(el, s)`, `stopAllAnimations()`, `animateCarry(...)`, `animateBorrow(...)`

- CalculationManager: `calculate(left, right, op)`, `getMaxCalculationPlace(left, right, op)`, `getCalculationResult(left, right, op)`, `splitNumberByPlaces(n)`

### 뺄셈 특수 분기: 하위 자리 0 → 상위 자리부터 시작

- 개요: `40 − 30`, `400 − 300`처럼 하위 자리(일/십)가 모두 0인 경우, 결과 화면 진입과 리셋 시 시작 자리를 상위 자리로 건너뜁니다.
- 동작 규칙:
  - 일의자리(ones) 양쪽이 0이면 시작 자리를 십의자리(tens)로 설정
  - 일의자리·십의자리 양쪽이 모두 0이면 시작 자리를 백의자리(hundreds)로 설정
  - 적용 범위: 결과 화면 진입(`showResultScreen`), 다시하기(`reset`), 결과화면 리셋(`resetResultScreen`, `resetResultScreenWithoutHandGuide`)
- 구현: `NumModel.ts` 내부 헬퍼 `setInitialPlaceForSubtractionStart(left, right)`가 현재 자리를 결정하고 `UIManager.setCurrentPlace(place)`로 반영합니다. 이후 `highlightCurrentNumBox()`와 손가이드가 해당 자리로 유도합니다.

### 손가이드 타깃팅 규칙(뺄셈)

- 기본: 현재 자리에서 왼쪽 → 오른쪽 순서로 `digit-result-box`를 유도합니다.
- 빌림 진행/대기 중: 빌림 원 자리의 `borrowable` 요소(빨간 테두리)로 우선 유도합니다.
- tens 단계 보정:
  - 일의자리 좌/우 클릭 완료 및 ones로의 빌림이 반영되었고, 십의자리에 추가 빌림이 필요 없으면 십의자리 오른쪽을 바로 유도
  - tens에서 빌림이 필요하면 상위 빌림 자리(예: hundreds)의 `borrowable`로 유도
- 마지막 hundreds 단계 예외: 하위 자리(ones, tens) 완료 + hundreds에서 빌림 불필요 + 과거 tens로 빌림이 있었던 경우, 오른쪽 선클릭 허용(왼쪽 자동 확정)

### 다시하기/리셋 시 초기화 포인트

- `reset()`
  - 입력 화면 리셋 → 진행 상태 초기화 → 뺄셈이면 `setInitialPlaceForSubtractionStart(left, right)` 적용 → 하이라이트/손가이드 재시작
- `resetResultScreen()` / `resetResultScreenWithoutHandGuide()`
  - 결과 화면의 그룹/이미지/카운트/캐리 요소 정리 → 진행 상태 초기화 → 뺄셈이면 `setInitialPlaceForSubtractionStart(left, right)` 적용 → 하이라이트 갱신(및 필요 시 손가이드 재시작)

### 개발 가이드

- Do

  - DOM 변경/이미지 추가/클래스 토글은 반드시 `NumModelRenderer`를 통해 수행합니다.
  - 상태 변경/빌림 관련 플래그는 `StateManager` 전이 메서드를 사용합니다.
  - 버튼/자리 클릭/가시성 제어는 `UIManager`/`ResultManager` API를 사용합니다.
  - 뺄셈 하이라이트/페이드는 `SubtractionEffects`를 사용합니다.
  - 계산/판단 로직은 `PlaceUtils`/`BorrowLogic`의 순수 함수로 추가합니다.
  - 팝업은 `PopupManager`, 애니메이션은 `AnimationManager`를 사용합니다.
  - 자리별 카운트 텍스트는 `renderer.updateNumModelCount*`로 업데이트합니다.

- Don't
  - `NumModel.ts`에서 `querySelector`, `classList`, `style`, `innerHTML` 등을 직접 사용하지 않습니다.
  - 직접 `gsap` 호출을 추가하지 않습니다(→ `AnimationManager`).
  - 카운트 텍스트 DOM을 직접 생성하지 않습니다(→ `renderer.updateSubtractionCount` 등).
  - 상태 플래그를 직접 대입/조작하지 않습니다(→ `StateManager`).
  - 문자열 하드코딩으로 자리 이름을 비교하지 않습니다(→ `Place` 사용).

### 마이그레이션 메모

- 기존 직접 DOM 조작은 렌더러/매니저 API로 대체되었습니다.
- 타임아웃은 `AnimationManager.stopAllAnimations()` 또는 `NumModel.ts`의 애니메이션 타임아웃 관리로 일괄 정리됩니다.
- 결과 버튼 바인딩은 `UIManager.bindResultScreenButtons`로 통일되었습니다.

### 간단 예시

```ts
// 결과 화면 버튼 바인딩 예시 (NumModel.ts 내부)
this.uiManager.bindResultScreenButtons({
  onAutoCalc: () => {
    if (this.isAutoCalculating || this.isAnimating) return;
    this.autoCalculateAll();
  },
  onReset: () => {
    this.closeCalculationResultPopup();
    this.state.resetCalcFlags();
    this.state.stopAnimating();
    this.state.resetBorrowState();
    this.isCalculationComplete = false;
    this.resetResultScreen();
  },
  onHome: () => {
    this.closeCalculationResultPopup();
    this.state.resetCalcFlags();
    this.state.stopAnimating();
    this.goToHome();
  },
});
```

### 유지보수 팁

- 새 기능 추가 시 먼저 해당 책임이 어느 모듈인지 결정한 뒤, 필요한 최소 API만 공개하세요.
- 반복되는 DOM 조작 패턴은 `NumModelRenderer`에 헬퍼를 추가해 재사용하세요.
- 타입은 `any`를 지양하고 최소 인터페이스를 명시합니다.

### E2E 스모크 테스트 체크리스트

다음 시나리오를 빠르게 훑어보는 용도입니다. 복잡한 케이스만 최소화하여 재현합니다.

- 연속 빌림
  - 100 → 10 → 1 순으로 연속 빌림이 발생하는 케이스(예: 302 − 158, 210 − 199)
  - 각 단계에서 `borrowUI` 표시/클릭 → 이미지 10개 추가/분할 배치 확인 → 카운트 텍스트 갱신 확인
- 9개 남기기 로직
  - 상위 자리에서 빌림 후 원래 자리(십/백)에 9가 남는지 확인(예: 400 − 198)
  - `renderer.rebuildBorrowFromBox` 이후 카운트 9 표시 확인
- 자동/수동 혼합
  - 자동 계산 중 특정 자리 수동 클릭으로 개입 → 흐름이 정상적으로 이어지는지 확인
  - 자동 종료 후 팝업 표시/닫기 동작 확인
- 상태 누수 방지
  - 다시하기/홈 버튼 반복 클릭 후, 기존 타임아웃/애니메이션/클릭 차단이 모두 해제되는지 확인
  - `StateManager.reset*` 호출 이후 빌림 상태 초기화 확인
- 빼기 결과 선행 0 숨김
  - 계산 완료 플래그 기준으로만 숨김 처리되는지 확인(자리별 0 노출/비노출)
- 자릿수 경계
  - 최대 자리(hundreds)까지 배치/병합/표시 정상 동작 확인
