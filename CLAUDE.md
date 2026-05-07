# CLAUDE.md

이 파일은 이 저장소에서 작업하는 코딩 에이전트용 지침입니다.

## 프로젝트 개요

WorkShot은 프로젝트 소스 코드(Git 커밋)와 PostgreSQL DB 상태를 한 시점으로 묶어 `.workshot` 파일로 저장/복원하는 Electron 데스크톱 앱입니다. 탭 분리 레이아웃, Compact 밀도, segmented 진행률을 사용합니다.

`_design_reference/`에 원본 디자인 핸드오프 번들이 보존되어 있습니다 (HTML/CSS/JSX 프로토타입). 시각 동작이 모호하면 이 폴더를 1차 출처로 참고하세요.

## 명령어

```bash
npm run dev        # 개발 모드 (HMR)
npm run build      # 프로덕션 빌드 → out/
npm run typecheck  # tsc --noEmit (main + renderer)
npm run start      # 빌드된 결과 미리보기
```

`dev`/`start`는 반드시 `npm run` 또는 `node scripts/run-electron-vite.mjs <cmd>`로 실행해야 합니다 — 환경 변수 이슈(아래) 때문입니다.

## 핵심 환경 변수 이슈 — `ELECTRON_RUN_AS_NODE`

**이 환경의 셸에 `ELECTRON_RUN_AS_NODE=1`이 전역 export되어 있습니다.** Electron은 변수의 *값*이 아니라 *존재 여부*로 Node 모드를 판단하므로, 빈 문자열로 설정해도 해제되지 않습니다.

증상: `require('electron')`이 API 객체 대신 `electron.exe` 경로 문자열을 반환 → `electron.app.isPackaged` 접근 시 즉시 TypeError.

해결: `scripts/run-electron-vite.mjs`가 `delete env.ELECTRON_RUN_AS_NODE` 후 spawn 합니다. 새 npm 스크립트나 개발용 보조 도구를 추가할 때도 같은 패턴을 사용하세요. `cross-env ELECTRON_RUN_AS_NODE=`는 효과 없습니다.

## 아키텍처

```
src/
├── main/         # Electron 메인 프로세스 (Node 컨텍스트)
│   ├── index.ts      # BrowserWindow 생성, IPC 등록
│   ├── ipc.ts        # 모든 ipcMain.handle — 저장/복원 오케스트레이션
│   ├── git.ts        # git rev-parse, cat-file, reset --hard
│   ├── postgres.ts   # pg_dump / pg_restore / psql spawn
│   ├── workshot.ts   # tar+gzip pack/unpack, manifest 처리
│   └── store.ts      # electron-store (히스토리, DB 프로파일)
├── preload/      # contextBridge 노출 (sandboxed false, contextIsolation true)
├── renderer/     # React 18 + TypeScript
│   └── src/
│       ├── App.tsx           # 탭 레이아웃 + 토스트
│       ├── theme.ts          # COLORS / MONO 상수
│       ├── api.ts            # window.workshot 타입 래퍼
│       ├── useToasts.ts
│       ├── components/       # 공용 UI (Btn, Input, Section, Card 등)
│       └── panels/           # SavePanel, RestorePanel
└── shared/       # main ↔ renderer 공유
    ├── types.ts      # SnapshotManifest, DBConn, ProgressStep, ...
    └── ipc.ts        # 채널 이름 상수
```

빌드 도구는 **electron-vite**입니다 (`electron.vite.config.ts`). main/preload/renderer 각각 별도의 Vite 빌드를 갖고 `@shared` alias를 셋 다 공유합니다.

## 디자인 시스템

색상/타이포는 [src/renderer/src/theme.ts](src/renderer/src/theme.ts)와 [src/renderer/src/styles/tokens.css](src/renderer/src/styles/tokens.css)에 있습니다. 주요 토큰:

- `COLORS.primary` `#3147CC`, `primaryActive` `#455EEE`, `teal` `#1BCFA9`, `red` `#DA3731`
- 폰트: Pretendard / Noto Sans KR (UI), JetBrains Mono (경로/해시 등 모노 텍스트)
- 라운드 코너: 카드 10px, 입력 6~7px, 버튼 7px
- 정보 밀도는 Compact 고정 (디자인 단계에서 결정)

새 UI 컴포넌트를 만들 때는 인라인 style을 쓰는 기존 패턴을 따르세요 — CSS-in-JS 라이브러리 없이 React `style={}`를 직접 쓰고 토큰은 `theme.ts`에서 import합니다.

아이콘은 **boxicons** (`<i className="bx bx-..." />`)을 사용합니다. CDN으로 로드되므로 추가 설정 불필요.

## IPC 패턴

채널 상수는 `src/shared/ipc.ts`에 한 군데에서 관리합니다. 새 IPC를 추가할 때:

1. `IPC` 객체에 채널 이름 추가
2. `src/main/ipc.ts`에 `ipcMain.handle` 등록
3. `src/preload/index.ts`에 함수 노출
4. `src/renderer/src/api.ts`에 타입 추가

진행률은 `IPC.progressUpdate`를 통해 메인 → 렌더러 단방향 이벤트로 흐릅니다. `jobId` prefix(`save:` / `restore:`)로 어느 패널의 이벤트인지 구분합니다.

## `.workshot` 파일 형식

```
manifest.json        # SnapshotManifest (src/shared/types.ts)
dumps/
  <dbName>.dump      # pg_dump -Fc (custom format)
```

전체는 gzip(level 6) 처리된 tar 스트림입니다. 새 메타데이터를 추가할 때는 `SnapshotManifest.version`을 올리고 unpack 쪽에서 마이그레이션을 처리하세요.

## 외부 명령 의존

- `git` (rev-parse, status, log, cat-file, reset)
- `pg_dump -Fc`, `pg_restore --clean --if-exists`, `psql -c 'SELECT 1'`

모두 시스템 `PATH`에서 호출합니다. 서비스 계정 인증은 `PG*` 환경 변수(`PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`)로 전달합니다 — 명령행 인자에 비밀번호를 넣지 않습니다.

## 작업 시 주의

- **새 기능 추가 시 디자인 시스템 토큰을 먼저 사용**하세요. 임의의 색상·radius·여백을 도입하기 전에 `theme.ts`/`tokens.css`에 이미 있는지 확인합니다.
- **Sandbox는 false, contextIsolation은 true**로 설정되어 있습니다. preload에서 노출하지 않은 Node API는 렌더러에서 사용할 수 없습니다.
- 복원은 비가역적인 작업입니다 — `git reset --hard`와 `pg_restore --clean`이 모두 들어갑니다. 자동 백업 단계를 절대 빼지 마세요.
- DB 외부 명령 stderr를 progress의 `detail` 필드에 그대로 노출하면 비밀번호가 새어나갈 수 있습니다 (현재는 `PGPASSWORD` env로만 전달하므로 안전하지만, 새 코드 작성 시 주의).
- 디자인 핸드오프 채팅(`_design_reference/chats/`)에 사용자가 명시한 결정사항이 누적되어 있습니다 — UX 분쟁이 생기면 가장 최근 결정을 우선 따릅니다.

## 모름

다음은 명시적으로 결정되지 않은 사항입니다 — 사용자에게 확인 후 진행하세요.

- MySQL/Mongo/Redis 지원 여부와 우선순위
- 자동 백업 보관 정책(개수/기간 제한)
- 패키징/배포 (`electron-builder` 설정 미작성)
- 코드 사이닝, 자동 업데이트
