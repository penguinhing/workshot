import { useEffect, useRef, useState } from 'react';
import { COLORS, MONO } from '../theme';
import { Btn, EmptyHint, Field, Input, Section, Textarea } from '../components/ui';
import { DBConnCard, GitStatus } from '../components/Cards';
import { ProgressSegmented } from '../components/Progress';
import { api } from '../api';
import type {
  DBConn,
  DBTestResult,
  GitInfo,
  ProgressStep,
  SnapshotHistoryItem,
} from '@shared/types';

type SaveState = 'idle' | 'running' | 'done';

function formatSnapshotName(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function findDuplicateAliases(dbs: DBConn[]): string[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const db of dbs) {
    const label = db.name.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    const prev = counts.get(key);
    counts.set(key, { label: prev?.label ?? label, count: (prev?.count ?? 0) + 1 });
  }
  return [...counts.values()].filter((x) => x.count > 1).map((x) => x.label);
}

function newDB(): DBConn {
  return {
    id: `db-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'postgres',
    name: '',
    host: 'localhost',
    port: '5432',
    user: '',
    password: '',
    database: '',
  };
}

export function SavePanel({
  onSaved,
  pushToast,
}: {
  onSaved: (item: SnapshotHistoryItem) => void;
  pushToast: (t: { kind: 'info' | 'success' | 'error' | 'warning'; icon?: string; title?: string; message?: string }) => void;
}) {
  const [projectPath, setProjectPath] = useState<string>('');
  const [git, setGit] = useState<GitInfo | null>(null);
  const [dbs, setDbs] = useState<DBConn[]>([]);
  const [autoLoadedIds, setAutoLoadedIds] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Record<string, DBTestResult | null>>({});
  const [snapName, setSnapName] = useState(formatSnapshotName);
  const [note, setNote] = useState('');
  const [state, setState] = useState<SaveState>('idle');
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [savedItem, setSavedItem] = useState<SnapshotHistoryItem | null>(null);
  const [snapshotsDir, setSnapshotsDir] = useState<string>('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dbSectionRef = useRef<HTMLDivElement>(null);
  const snapshotSectionRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const prevShowDbSectionRef = useRef(false);
  const prevShowSnapshotSectionRef = useRef(false);

  useEffect(() => {
    api().getSnapshotsDir().then(setSnapshotsDir);
  }, []);

  useEffect(() => {
    if (!projectPath) {
      setGit(null);
      setDbs([]);
      setAutoLoadedIds(new Set());
      setStatuses({});
      return;
    }
    let cancelled = false;
    setGit(null);
    setDbs([]);
    setAutoLoadedIds(new Set());
    setStatuses({});
    Promise.all([api().getGitInfo(projectPath), api().getProjectDbs(projectPath)]).then(
      ([info, savedDbs]) => {
        if (cancelled) return;
        setGit(info);
        if (savedDbs.length > 0) {
          // Reuse stored ids so React keys are stable across reloads.
          setDbs(savedDbs);
          setAutoLoadedIds(new Set(savedDbs.map((d) => d.id)));
          setStatuses({});
          pushToast({
            kind: 'info',
            icon: 'bx-history',
            message: `이전 스냅샷의 DB 접속 정보 ${savedDbs.length}개를 불러왔습니다`,
          });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  useEffect(() => {
    const off = api().onProgress((u) => {
      if (u.jobId.startsWith('save:')) setSteps(u.steps);
    });
    return off;
  }, []);

  async function pickProject() {
    const p = await api().pickDirectory('스냅샷 대상 프로젝트 폴더');
    if (p) setProjectPath(p);
  }

  function updateDb(idx: number, next: DBConn) {
    setDbs((prev) => prev.map((d, i) => (i === idx ? next : d)));
  }
  function removeDb(idx: number) {
    const removed = dbs[idx];
    setDbs((prev) => prev.filter((_, i) => i !== idx));
    setStatuses((prev) => {
      const next = { ...prev };
      delete next[removed.id];
      return next;
    });
  }
  async function testDb(idx: number) {
    const db = dbs[idx];
    setStatuses((p) => ({ ...p, [db.id]: { ok: false, message: '연결 시도 중…' } }));
    const r = await api().testDbConnection(db);
    setStatuses((p) => ({ ...p, [db.id]: r }));
    if (r.ok) pushToast({ kind: 'success', icon: 'bx-check', message: r.message });
    else pushToast({ kind: 'error', icon: 'bx-x-circle', title: 'DB 연결 실패', message: r.message });
  }

  const projectValid = !!git && !!git.isGit;
  const duplicateAliases = findDuplicateAliases(dbs);
  const hasMissingDbFields = dbs.some((d) => !d.name.trim() || !d.database.trim() || !d.user.trim());
  const dbsConfigured = dbs.length > 0 && !hasMissingDbFields && duplicateAliases.length === 0;
  const showDbSection = projectValid;
  const showSnapshotSection = showDbSection && dbsConfigured;
  const filled = projectValid && dbsConfigured && snapName.trim().length > 0;
  const isRunning = state === 'running';
  const isDone = state === 'done';

  useEffect(() => {
    if (showDbSection && !prevShowDbSectionRef.current) {
      dbSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevShowDbSectionRef.current = showDbSection;
  }, [showDbSection]);

  useEffect(() => {
    if (showSnapshotSection && !prevShowSnapshotSectionRef.current) {
      if (!snapName.trim()) setSnapName(formatSnapshotName());
      snapshotSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevShowSnapshotSectionRef.current = showSnapshotSection;
  }, [showSnapshotSection, snapName]);

  async function handleSave() {
    if (!filled || !git?.commitHash) return;
    const jobId = `save:${Date.now()}`;
    setState('running');
    setSteps([
      { id: 'git', label: 'Git 상태 캡처', percent: 0, status: 'pending' },
      { id: 'db', label: `DB 덤프 (${dbs.length}개)`, percent: 0, status: 'pending' },
      { id: 'pack', label: '압축 & 패키징', percent: 0, status: 'pending' },
    ]);
    pushToast({ kind: 'info', icon: 'bx-loader-alt', message: '스냅샷 저장을 시작합니다…' });
    try {
      const item = await api().saveSnapshot({
        jobId,
        projectPath,
        dbs,
        name: snapName,
        note,
      });
      setSavedItem(item);
      setState('done');
      onSaved(item);
      pushToast({
        kind: 'success',
        icon: 'bx-check',
        title: '저장 완료',
        message: item.filePath.split(/[\\/]/).pop(),
      });
    } catch (e) {
      setState('idle');
      pushToast({
        kind: 'error',
        icon: 'bx-x-circle',
        title: '저장 실패',
        message: (e as Error).message,
      });
    }
  }

  function handleReset() {
    setState('idle');
    setSavedItem(null);
    setSteps([]);
    setSnapName(formatSnapshotName());
  }

  useEffect(() => {
    if ((isRunning || isDone) && progressRef.current) {
      progressRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isRunning, isDone]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%', minHeight: 0 }}>
      {/* <PanelHeader icon="bx-camera" title="저장" subtitle="현재 프로젝트 + DB 상태를 .workshot 으로" /> */}

      <div
        ref={scrollContainerRef}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', paddingRight: 4 }}
      >
        <Section title="1. 프로젝트 선택" >
          <div style={{ display: 'flex', gap: 6 }}>
            <Input
              value={projectPath}
              placeholder="/path/to/your/project"
              icon="bx-folder"
              mono
              readOnly
              onClick={pickProject}
              error={!!git && !git.isGit}
              style={{ flex: 1 }}
            />
            <Btn kind="soft" icon="bx-folder-open" onClick={pickProject}>
              찾기
            </Btn>
          </div>
          {git && (
            <div style={{ marginTop: 10 }}>
              <GitStatus git={git} projectPath={projectPath} />
            </div>
          )}
        </Section>

        {showDbSection && (
          <div ref={dbSectionRef}>
            <Section
              title="2. 데이터베이스 선택"
              subtitle={`${dbs.length}개 연결 · 복수 DB 지원`}
              action={
                <Btn kind="text" size="sm" icon="bx-plus" onClick={() => setDbs((p) => [...p, newDB()])}>
                  DB 추가
                </Btn>
              }
              style={{ paddingTop: 45 }}
            >
              {dbs.length === 0 ? (
                <EmptyHint
                  icon="bx-data"
                  message="아직 연결된 DB가 없어요"
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {dbs.map((d, i) => (
                    <DBConnCard
                      key={d.id}
                      conn={d}
                      index={i + 1}
                      status={statuses[d.id]}
                      onChange={(n) => updateDb(i, n)}
                      onRemove={() => removeDb(i)}
                      onTest={() => testDb(i)}
                      defaultCollapsed={autoLoadedIds.has(d.id)}
                    />
                  ))}
                  {!dbsConfigured && (
                    <div style={{ fontSize: 11.5, color: COLORS.red, display: 'flex', gap: 6, alignItems: 'center' }}>
                      <i className="bx bx-error-circle" style={{ fontSize: 13 }} />
                      <span>
                        {duplicateAliases.length > 0
                          ? `DB 별칭은 중복될 수 없습니다: ${duplicateAliases.join(', ')}`
                          : 'DB 별칭, database, user를 입력하세요'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </Section>
          </div>
        )}

        {showSnapshotSection && (
          <div ref={snapshotSectionRef}>
            <Section
              title="3. 스냅샷 정보 입력"
              style={{ paddingTop: 45 }}
              noBorder={!isRunning && !isDone}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="이름" required>
                  <Input value={snapName} onChange={setSnapName} placeholder={formatSnapshotName()} />
                </Field>
                <Field label="메모">
                  <Textarea value={note} onChange={setNote} />
                </Field>
              </div>
            </Section>
          </div>
        )}

        {(isRunning || isDone) && (
          <div ref={progressRef}>
          <Section title={isDone ? '저장 완료' : '저장 진행 중'} style={{ paddingTop: 24 }} noBorder>
            <ProgressSegmented steps={steps} />
            {isDone && savedItem && (
              <div
                style={{
                  marginTop: 14,
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.borderStrong}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <i className="bx bx-check-circle" style={{ fontSize: 22, color: COLORS.teal }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.teal }}>스냅샷이 저장되었습니다</div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: COLORS.textMid, marginTop: 2 }}>
                    {savedItem.filePath} · {savedItem.size} · gzip
                  </div>
                </div>
              </div>
            )}
          </Section>
          </div>
        )}
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
        <div style={{ flex: 1, fontSize: 11.5, color: COLORS.textLight, fontFamily: MONO }}>
          {!isRunning && !isDone && filled && snapshotsDir && `${snapshotsDir} 에 저장됩니다`}
          {isRunning && '진행 중… 창을 닫지 마세요'}
          {isDone && savedItem && `${savedItem.filePath} 저장됨`}
        </div>
        {isDone && savedItem ? (
          <>
            <Btn kind="ghost" icon="bx-folder-open" onClick={() => api().openInFolder(savedItem.filePath)}>
              폴더 열기
            </Btn>
            <Btn kind="primary" icon="bx-camera" onClick={handleReset}>
              새 스냅샷
            </Btn>
          </>
        ) : (
          <>
            <Btn
              kind="ghost"
              disabled={isRunning}
              onClick={() => {
                setProjectPath('');
                setDbs([]);
                setAutoLoadedIds(new Set());
                setSnapName(formatSnapshotName());
                setNote('');
                setStatuses({});
              }}
            >
              설정 초기화
            </Btn>
            <Btn
              kind="primary"
              icon={isRunning ? undefined : 'bx-camera'}
              loading={isRunning}
              disabled={!filled || isRunning}
              onClick={handleSave}
            >
              {isRunning ? '저장 중…' : '스냅샷 저장'}
            </Btn>
          </>
        )}
      </div>
    </div>
  );
}
