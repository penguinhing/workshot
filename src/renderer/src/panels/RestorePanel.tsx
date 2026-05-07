import { useEffect, useMemo, useRef, useState } from 'react';
import { COLORS } from '../theme';
import { Btn, Card, EmptyHint, PanelHeader, Section, Toggle } from '../components/ui';
import {
  DBConnCard,
  RestoreTargetPicker,
  SnapshotDetail,
  SnapshotListItem,
} from '../components/Cards';
import { ProgressSegmented } from '../components/Progress';
import { api } from '../api';
import type {
  DBConn,
  DBTestResult,
  ProgressStep,
  RestoreTargetCheck,
  SnapshotHistoryItem,
} from '@shared/types';

type RestoreState = 'idle' | 'running' | 'done';

function makeDBFromHistory(snap: SnapshotHistoryItem): DBConn[] {
  return snap.dbs.map((d, i) => ({
    id: `restore-${snap.id}-${i}`,
    type: d.type,
    name: d.name,
    host: 'localhost',
    port: '5432',
    user: '',
    password: '',
    database: d.database || d.name,
  }));
}

function normalizeDbText(value: string): string {
  return value.trim().toLowerCase();
}

function sameDbText(a: string, b: string): boolean {
  const left = normalizeDbText(a);
  const right = normalizeDbText(b);
  return left.length > 0 && left === right;
}

function mergeStoredProjectDbs(current: DBConn[], stored: DBConn[]): { next: DBConn[]; matched: number } {
  const used = new Set<number>();

  const take = (conn: DBConn, predicate: (candidate: DBConn) => boolean): DBConn | null => {
    const idx = stored.findIndex((candidate, i) => !used.has(i) && predicate(candidate));
    if (idx < 0) return null;
    used.add(idx);
    return stored[idx];
  };

  let matched = 0;
  const next = current.map((conn) => {
    const match =
      take(conn, (candidate) => candidate.type === conn.type && sameDbText(candidate.name, conn.name)) ||
      take(conn, (candidate) => candidate.type === conn.type && sameDbText(candidate.database, conn.database)) ||
      take(conn, (candidate) => sameDbText(candidate.name, conn.name)) ||
      take(conn, (candidate) => sameDbText(candidate.database, conn.database)) ||
      (current.length === 1 && stored.length === 1 ? take(conn, () => true) : null);

    if (!match) return conn;
    matched += 1;
    return {
      ...conn,
      host: match.host,
      port: match.port,
      user: match.user,
      password: match.password,
      database: match.database || conn.database,
    };
  });

  return { next, matched };
}

export function RestorePanel({
  history,
  onChanged,
  pushToast,
}: {
  history: SnapshotHistoryItem[];
  onChanged: () => void;
  pushToast: (t: { kind: 'info' | 'success' | 'error' | 'warning'; icon?: string; title?: string; message?: string }) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imported, setImported] = useState<SnapshotHistoryItem | null>(null);
  const [target, setTarget] = useState<RestoreTargetCheck | null>(null);
  const [restoreDbs, setRestoreDbs] = useState<DBConn[]>([]);
  const [statuses, setStatuses] = useState<Record<string, DBTestResult | null>>({});
  const [state, setState] = useState<RestoreState>('idle');
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [autoBackup, setAutoBackup] = useState(true);
  const restoreDbsRef = useRef<DBConn[]>([]);

  const items = useMemo(() => {
    if (imported && !history.some((h) => h.filePath === imported.filePath)) return [imported, ...history];
    return history;
  }, [history, imported]);

  useEffect(() => {
    if (selectedId == null && items.length > 0) setSelectedId(items[0].id);
  }, [items, selectedId]);

  const selected = items.find((s) => s.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) {
      setRestoreDbs([]);
      restoreDbsRef.current = [];
      setTarget(null);
      setStatuses({});
      return;
    }
    const nextDbs = makeDBFromHistory(selected);
    setRestoreDbs(nextDbs);
    restoreDbsRef.current = nextDbs;
    setTarget(null);
    setStatuses({});
    let cancelled = false;
    api()
      .validateRestoreTarget({ path: selected.project, expectedHash: selected.gitHash })
      .then((nextTarget) => {
        if (!cancelled) setTarget(nextTarget);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.id, selected?.project, selected?.gitHash]);

  useEffect(() => {
    restoreDbsRef.current = restoreDbs;
  }, [restoreDbs]);

  useEffect(() => {
    const off = api().onProgress((u) => {
      if (u.jobId.startsWith('restore:')) setSteps(u.steps);
    });
    return off;
  }, []);

  // Autofill DB credentials from stored per-project DB info.
  // This is shared with the Save tab and only keyed by target project path.
  useEffect(() => {
    if (!target?.path) return;
    let cancelled = false;
    api()
      .getProjectDbs(target.path)
      .then((stored) => {
        if (cancelled || stored.length === 0) return;
        const { next, matched } = mergeStoredProjectDbs(restoreDbsRef.current, stored);
        if (cancelled || matched === 0) return;
        restoreDbsRef.current = next;
        setRestoreDbs(next);
        setStatuses({});
      });
    return () => {
      cancelled = true;
    };
  }, [target?.path, selected?.id]);

  async function pickWorkshotFile() {
    const p = await api().pickWorkshotFile();
    if (!p) return;
    try {
      const manifest = await api().readWorkshotManifest(p);
      const item: SnapshotHistoryItem = {
        id: `imp-${Date.now()}`,
        name: manifest.name,
        note: manifest.note,
        filePath: p,
        size: '?',
        timestamp: new Date(manifest.createdAt).toLocaleString('ko-KR', { hour12: false }),
        gitHash: manifest.project.commitHash,
        branch: manifest.project.branch,
        commitMsg: manifest.project.commitMsg,
        project: manifest.project.path,
        dbs: manifest.dbs.map((d) => ({ type: d.type, name: d.name, database: d.database, size: d.size })),
      };
      setImported(item);
      setSelectedId(item.id);
      pushToast({ kind: 'success', icon: 'bx-check', message: '스냅샷 파일을 불러왔습니다' });
    } catch (e) {
      pushToast({
        kind: 'error',
        icon: 'bx-x-circle',
        title: '파일 읽기 실패',
        message: (e as Error).message,
      });
    }
  }

  async function changeTargetPath() {
    if (!selected) return;
    const p = await api().pickDirectory('적용할 프로젝트 폴더');
    if (!p) return;
    const t = await api().validateRestoreTarget({ path: p, expectedHash: selected.gitHash });
    setTarget(t);
  }
  async function useDefaultTarget() {
    if (!selected) return;
    const t = await api().validateRestoreTarget({ path: selected.project, expectedHash: selected.gitHash });
    setTarget(t);
  }

  function updateDb(idx: number, next: DBConn) {
    setRestoreDbs((prev) => prev.map((d, i) => (i === idx ? next : d)));
  }
  async function testDb(idx: number) {
    const db = restoreDbs[idx];
    setStatuses((p) => ({ ...p, [db.id]: { ok: false, message: '연결 시도 중…' } }));
    const r = await api().testDbConnection(db);
    setStatuses((p) => ({ ...p, [db.id]: r }));
    if (r.ok) pushToast({ kind: 'success', icon: 'bx-check', message: r.message });
    else pushToast({ kind: 'error', icon: 'bx-x-circle', title: 'DB 연결 실패', message: r.message });
  }

  const targetValid = !!target && target.isGit && target.hashFound;
  const dbsReady = restoreDbs.length > 0 && restoreDbs.every((d) => d.database && d.user);
  const canRestore = !!selected && targetValid && dbsReady;
  const isRunning = state === 'running';
  const isDone = state === 'done';

  async function handleRestore() {
    if (!selected || !target || !targetValid) return;
    const jobId = `restore:${Date.now()}`;
    setState('running');
    setSteps([
      { id: 'verify', label: '파일 검증', percent: 0, status: 'pending' },
      { id: 'backup', label: autoBackup ? '현재 상태 자동 백업' : '현재 상태 백업 안 함', percent: 0, status: 'pending' },
      { id: 'git', label: 'Git reset --hard', percent: 0, status: 'pending' },
      { id: 'db', label: `DB 복원 (${restoreDbs.length}개)`, percent: 0, status: 'pending' },
    ]);
    pushToast({
      kind: 'info',
      icon: 'bx-loader-alt',
      message: autoBackup
        ? '복원을 시작합니다. 현재 상태는 자동 백업됩니다.'
        : '복원을 시작합니다. 자동 백업 없이 진행합니다.',
    });
    try {
      const r = await api().restoreSnapshot({
        jobId,
        workshotPath: selected.filePath,
        targetProjectPath: target.path,
        dbs: restoreDbs,
        autoBackup,
      });
      setState('done');
      pushToast({
        kind: 'success',
        icon: 'bx-check',
        title: '복원 완료',
        message: r.autoBackupPath
          ? `자동 백업: ${r.autoBackupPath.split(/[\\/]/).pop()}`
          : '자동 백업 없이 복원되었습니다',
      });
    } catch (e) {
      setState('idle');
      pushToast({
        kind: 'error',
        icon: 'bx-x-circle',
        title: '복원 실패',
        message: (e as Error).message,
      });
    }
  }

  function handleConfirm() {
    setState('idle');
    setSteps([]);
    onChanged();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%', minHeight: 0 }}>
      {/* <PanelHeader icon="bx-history" title="불러오기" subtitle=".workshot 파일로 프로젝트와 DB 복구" /> */}

      <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>
        <Card
          title="최근 스냅샷"
          icon="bx-collection"
          style={{ width: 260, flexShrink: 0 }}
          subtitle={`${items.length}건`}
          action={
            <Btn kind="text" size="sm" icon="bx-import" onClick={pickWorkshotFile}>
              파일 열기
            </Btn>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflow: 'auto', flex: 1 }}>
            {items.length === 0 ? (
              <EmptyHint
                icon="bx-camera"
                message="저장된 스냅샷이 없어요"
              />
            ) : (
              items.map((s) => (
                <SnapshotListItem
                  key={s.id}
                  snap={s}
                  active={s.id === selectedId}
                  onClick={() => setSelectedId(s.id)}
                  onDelete={async () => {
                    try {
                      await api().removeHistory(s.id, s.filePath);
                      if (s.id === imported?.id) setImported(null);
                      onChanged();
                    } catch (e) {
                      pushToast({
                        kind: 'error',
                        icon: 'bx-x-circle',
                        title: '스냅샷 삭제 실패',
                        message: (e as Error).message,
                      });
                    }
                  }}
                />
              ))
            )}
          </div>
        </Card>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          {isRunning || isDone ? (
            <Card
              title={isDone ? '복원 완료' : '복원 진행 중'}
              icon={isDone ? 'bx-check-circle' : 'bx-loader-alt'}
              style={{ flex: 1 }}
            >
              <ProgressSegmented steps={steps} />
              {isDone && (
                <div
                  style={{
                    marginTop: 14,
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: COLORS.surface,
                    border: `1px solid ${COLORS.borderStrong}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <i className="bx bx-check-circle" style={{ fontSize: 22, color: COLORS.teal }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.teal }}>
                      {selected ? selected.name : '스냅샷'} 시점으로 복원되었습니다
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ) : selected ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                overflow: 'auto',
                paddingRight: 4,
                minHeight: 0,
              }}
            >
              <SnapshotDetail snap={selected} />
              <Section title="적용할 프로젝트" subtitle="복원 대상의 프로젝트 경로를 입력해주세요" style={{marginTop : 30}}>
                <RestoreTargetPicker
                  expectedHash={selected.gitHash}
                  defaultPath={selected.project}
                  target={target}
                  onPick={changeTargetPath}
                  onUseDefault={useDefaultTarget}
                />
              </Section>
              <Section title="DB 연결 정보 입력" subtitle="복원 대상 DB의 접속 정보를 입력하세요" noBorder>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {restoreDbs.map((d, i) => (
                    <DBConnCard
                      key={d.id}
                      conn={d}
                      index={i + 1}
                      status={statuses[d.id]}
                      onChange={(n) => updateDb(i, n)}
                      onRemove={() => setRestoreDbs((prev) => prev.filter((_, idx) => idx !== i))}
                      onTest={() => testDb(i)}
                      aliasReadOnly
                    />
                  ))}
                </div>
              </Section>
            </div>
          ) : (
            <Card style={{ flex: 1, justifyContent: 'center' }}>
              <EmptyHint
                icon="bx-camera"
                message="왼쪽에서 스냅샷을 선택해주세요."
              />
            </Card>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          paddingTop: 12,
          borderTop: `1px solid ${COLORS.border}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            fontSize: 11.5,
            color: COLORS.textLight,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {selected && !isRunning && !isDone && targetValid && dbsReady && (
            <>
              <i
                className={autoBackup ? 'bx bx-shield-quarter' : 'bx bx-error-circle'}
                style={{ fontSize: 13, color: autoBackup ? COLORS.teal : COLORS.yellow }}
              />
              <span>{autoBackup ? '복원 전 현재 상태가 자동 백업됩니다' : '자동 백업 없이 복원됩니다'}</span>
            </>
          )}
          {selected && !isRunning && !isDone && !targetValid && (
            <>
              <i className="bx bx-error-circle" style={{ fontSize: 13, color: COLORS.red }} />
              <span style={{ color: COLORS.red }}>적용할 프로젝트 경로가 유효하지 않습니다</span>
            </>
          )}
          {selected && !isRunning && !isDone && targetValid && !dbsReady && (
            <>
              <i className="bx bx-info-circle" style={{ fontSize: 13, color: COLORS.yellow }} />
              <span>복원 대상 DB의 접속 정보를 입력하세요</span>
            </>
          )}
          {isRunning && <span>진행 중… 창을 닫지 마세요</span>}
          {isDone && <span style={{ color: COLORS.teal }}>프로젝트와 DB가 스냅샷 시점으로 복원되었습니다</span>}
        </div>
        {isDone ? (
          <Btn kind="primary" icon="bx-check" onClick={handleConfirm}>
            확인
          </Btn>
        ) : (
          <>
            {selected && !isRunning && (
              <div
                style={{
                  padding: '0 4px',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Toggle
                  checked={autoBackup}
                  onChange={setAutoBackup}
                  label="자동 백업"
                />
              </div>
            )}
            <Btn
              kind="primary"
              icon={isRunning ? undefined : 'bx-undo'}
              loading={isRunning}
              disabled={!canRestore || isRunning}
              onClick={handleRestore}
            >
              {isRunning ? '복원 중…' : '이 시점으로 복원'}
            </Btn>
          </>
        )}
      </div>
    </div>
  );
}
