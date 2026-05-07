> [!NOTE]
> 이 프로젝트는 전부 바이브코딩으로 만들어졌습니다.

<table>
  <tr>
    <td>
      <img src="https://github.com/user-attachments/assets/7b3221ca-2fca-41b8-b955-25434083c1bd" width="100%">
    </td>
    <td>
      <img width="1195" height="798" alt="Image" src="https://github.com/user-attachments/assets/2fd4093b-c7ec-4140-91a3-05f33de01a98" />
    </td>
  </tr>
</table>

# WorkShot

프로젝트의 소스 코드 상태(Git 커밋)와 데이터베이스를 한 시점으로 묶어 `.workshot` 파일로 저장하고, 같은 시점으로 손쉽게 복구하는 데스크톱 도구입니다.

마이그레이션 직전 백업, 데모용 시드 보존, QA 통과 시점 보관 등 "코드와 DB가 정합한 한 순간"을 통째로 잡고 되돌리는 용도로 만들었습니다.

## 주요 기능

- **저장**: 프로젝트 폴더 + 다중 DB 접속 정보를 입력하면 `git rev-parse HEAD` + `pg_dump`를 묶어 단일 `.workshot` 파일(gzip)로 저장
- **단계형 입력 흐름**: 저장 탭은 프로젝트 선택 → DB 입력 → 스냅샷 정보 순서로 필요한 단계만 표시
- **불러오기**: 히스토리에서 선택하거나 `.workshot` 파일을 직접 열어 `git reset --hard` + `pg_restore`로 일괄 복구
- **적용 프로젝트 검증**: 다른 클론에 적용할 때 `.git` 폴더와 해당 커밋 해시 존재 여부를 사전 검증
- **복원 직전 자동 백업**: 복원 실행 전 현재 상태를 `.workshot`으로 백업할지 토글로 선택 가능 (기본값 켜짐)
- **프로젝트별 DB 접속 정보 재사용**: 저장/불러오기 탭이 같은 프로젝트 경로 기준으로 DB 접속 정보를 공유
- **단계별 진행률**: Git → DB 덤프 → 압축, 또는 검증 → 자동 백업 → Git reset → DB 복원 단계가 segmented 진행률로 표시
- **다중 DB**: PostgreSQL 연결을 여러 개 묶어 하나의 스냅샷으로 저장/복원
- **스냅샷 히스토리**: 저장한 스냅샷이 사이드바에 누적되며 메타정보(이름, 메모, 커밋, DB 목록)를 보존
- **커스텀 타이틀바** + 토스트 알림 + Compact 정보 밀도

## 지원 DB

현재 WorkShot에서 저장/복원을 지원하는 DB는 **PostgreSQL만**입니다.

| DB | 지원 상태 | 비고 |
| --- | --- | --- |
| PostgreSQL | 지원 | `pg_dump`, `pg_restore`, `psql` 기반 |
| MySQL | 미지원 | 추후 필요에 따라 확장 예정 |
| MongoDB | 미지원 | 추후 필요에 따라 확장 예정 |
| Redis | 미지원 | 추후 필요에 따라 확장 예정 |

## 요구 사항

- **Node.js** ≥ 18 (개발용)
- **Git CLI** — `PATH`에서 바로 호출 가능해야 합니다
- **PostgreSQL 클라이언트** — `pg_dump`, `pg_restore`, `psql`가 `PATH`에 있어야 DB 저장/복원이 동작합니다 (서버는 별도 호스트여도 됨)

## 배포 및 설치

Release에는 Windows 설치 파일인 Setup 파일을 배포합니다.

설치 파일을 실행하면 현재 사용자 계정 기준으로 아래 경로에 설치됩니다.

```text
C:\Users\<사용자>\AppData\Local\Programs\WorkShot\
```

예를 들어 Windows 사용자명이 `user`라면 실행 파일 경로는 다음과 같습니다.

```text
C:\Users\user\AppData\Local\Programs\WorkShot\WorkShot.exe
```

패키징된 앱은 `workshot.json`, `snapshots/`, `auto-backups/` 같은 런타임 데이터를 실행 파일이 있는 설치 폴더 기준으로 저장합니다.

## 개발

```bash
npm install
npm run dev          # Electron + Vite HMR
npm run build        # dist/에 Windows 설치 파일 생성
npm run build:bundle # 프로덕션 번들만 빌드 (out/)
npm run typecheck    # main + renderer 둘 다 tsc 체크
npm run package      # dist/win-unpacked 폴더 패키징
npm run make         # npm run build와 동일
```

> ⚠️ 셸 환경에 `ELECTRON_RUN_AS_NODE=1`이 export되어 있으면 Electron이 일반 Node로 동작하여 앱이 시작되지 않습니다. 본 저장소의 `scripts/run-electron-vite.mjs` 래퍼는 이 변수를 삭제 후 spawn 합니다. 직접 `electron-vite`를 호출할 때는 해당 변수를 unset 하세요.

## 빌드 메모

- Windows 패키징은 루트의 `icon.ico`를 앱 창 아이콘과 `WorkShot.exe` 리소스 아이콘으로 사용합니다.
- `electron-builder`의 기본 실행 파일 리소스 편집 단계가 Windows 심볼릭 링크 권한 문제를 일으킬 수 있어 `signAndEditExecutable`은 끄고, `scripts/patch-exe-icon.cjs`의 `afterPack` 훅으로 EXE 아이콘만 후처리합니다.
- 개발 모드에서는 `workshot.json`, `snapshots/`, `auto-backups/`가 프로젝트 루트 기준 런타임 데이터로 생성될 수 있습니다.

## `.workshot` 파일 형식

`.workshot` 파일은 gzip 압축된 tar 아카이브이며, 다음 구조를 가집니다.

```
manifest.json        # 스냅샷 메타데이터 + 매니페스트
dumps/
  <dbName>.dump      # pg_dump -Fc 결과 (DB별로 1개)
```

`manifest.json`은 [src/shared/types.ts](src/shared/types.ts)의 `SnapshotManifest` 형태입니다.

## 아키텍처

전형적인 Electron 3-process 분리 + 공유 타입 모듈:

- [src/main/](src/main/) — Electron 메인 프로세스 (Node 환경, 파일/git/postgres/IPC)
- [src/preload/](src/preload/) — `contextBridge`로 안전하게 노출되는 `window.workshot` API
- [src/renderer/](src/renderer/) — React UI (디자인 시스템 인라인 스타일)
- [src/shared/](src/shared/) — main/renderer 공유 TypeScript 타입과 IPC 채널 상수

자세한 개발 가이드는 [CLAUDE.md](CLAUDE.md)를 참고하세요.
