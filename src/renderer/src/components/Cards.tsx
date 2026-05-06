import { useState, type ReactNode } from 'react';
import { COLORS, MONO } from '../theme';
import { Btn, DBTypeTag, DB_TYPES, Input } from './ui';
import type { DBConn, DBTestResult, GitInfo, RestoreTargetCheck, SnapshotHistoryItem } from '@shared/types';

const labelStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  color: COLORS.textMid,
  letterSpacing: 0,
  textTransform: 'uppercase',
  marginBottom: 4,
};
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' };

export function DBConnCard({
  conn,
  index,
  status,
  onChange,
  onRemove,
  onTest,
  defaultCollapsed,
  aliasReadOnly,
}: {
  conn: DBConn;
  index: number;
  status?: DBTestResult | null;
  onChange: (next: DBConn) => void;
  onRemove: () => void;
  onTest: () => void;
  defaultCollapsed?: boolean;
  aliasReadOnly?: boolean;
}) {
  const t = DB_TYPES.find((d) => d.id === conn.type) || DB_TYPES[0];
  const [showPw, setShowPw] = useState(false);
  const [collapsed, setCollapsed] = useState(!!defaultCollapsed);

  return (
    <div
      style={{
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        background: COLORS.surface,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: COLORS.surfaceSubtle,
          borderBottom: collapsed ? 'none' : `1px solid ${COLORS.border}`,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: COLORS.surfaceStrong,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: COLORS.ink,
            fontFamily: MONO,
            flexShrink: 0,
          }}
        >
          {index}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.color }} />
          <select
            value={conn.type}
            onChange={(e) => onChange({ ...conn, type: e.target.value as DBConn['type'] })}
            style={{
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              background: 'transparent',
              color: COLORS.textDark,
              outline: 'none',
              cursor: 'pointer',
              padding: 0,
              appearance: 'none',
              paddingRight: 14,
              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path fill='%23807d72' d='M4 6l4 4 4-4'/></svg>")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right center',
              backgroundSize: '12px',
            }}
          >
            {DB_TYPES.map((d) => (
              <option key={d.id} value={d.id} disabled={d.disabled}>
                {d.label}
                {d.disabled ? ' (아직 미지원)' : ''}
              </option>
            ))}
          </select>
        </div>
        <span style={{ width: 1, height: 14, background: COLORS.border }} />
        <input
          value={conn.name || ''}
          readOnly={aliasReadOnly}
          title={aliasReadOnly ? '불러오기에서는 DB 별칭을 수정할 수 없습니다' : undefined}
          onChange={(e) => onChange({ ...conn, name: e.target.value })}
          placeholder="별칭 (예: app-main)"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 13,
            fontWeight: 500,
            color: aliasReadOnly ? COLORS.textMid : COLORS.textDark,
            padding: 0,
            minWidth: 0,
            cursor: aliasReadOnly ? 'default' : 'text',
          }}
        />
        {collapsed && (conn.host || conn.database) && (
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10.5,
              color: COLORS.textMid,
              padding: '2px 6px',
              borderRadius: 3,
              background: COLORS.surfaceStrong,
              border: `1px solid ${COLORS.borderLight}`,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 220,
              flexShrink: 1,
            }}
            title={`${conn.host || '?'}:${conn.port || '?'}/${conn.database || '?'}`}
          >
            {conn.host || '?'}:{conn.port || '?'}/{conn.database || '?'}
          </span>
        )}
        {!collapsed && (
          <button
            onClick={onTest}
            style={{
              height: 26,
              padding: '0 10px',
              borderRadius: 6,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.surface,
              fontSize: 11,
              fontWeight: 500,
              color: COLORS.textMid,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'inherit',
            }}
          >
            <i className="bx bx-plug" style={{ fontSize: 12 }} />
            연결 테스트
          </button>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? '펼치기' : '접기'}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
            border: 'none',
            background: 'transparent',
            color: COLORS.textMid,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <i
            className={`bx ${collapsed ? 'bx-chevron-down' : 'bx-chevron-up'}`}
            style={{ fontSize: 18 }}
          />
        </button>
        <button
          onClick={onRemove}
          title="제거"
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            color: COLORS.textLight,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <i className="bx bx-trash" style={{ fontSize: 14 }} />
        </button>
      </div>

      {!collapsed && (
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 10 }}>
          <div style={fieldStyle}>
            <div style={labelStyle}>HOST</div>
            <Input
              value={conn.host}
              onChange={(v) => onChange({ ...conn, host: v })}
              placeholder="localhost"
              mono
              icon="bx-server"
            />
          </div>
          <div style={fieldStyle}>
            <div style={labelStyle}>PORT</div>
            <Input
              value={conn.port}
              onChange={(v) => onChange({ ...conn, port: v })}
              placeholder="5432"
              mono
            />
          </div>
        </div>

        <div style={fieldStyle}>
          <div style={labelStyle}>DATABASE</div>
          <Input
            value={conn.database}
            onChange={(v) => onChange({ ...conn, database: v })}
            placeholder="database name"
            mono
            icon="bx-data"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={fieldStyle}>
            <div style={labelStyle}>USER</div>
            <Input
              value={conn.user}
              onChange={(v) => onChange({ ...conn, user: v })}
              placeholder="username"
              icon="bx-user"
            />
          </div>
          <div style={fieldStyle}>
            <div style={labelStyle}>PASSWORD</div>
            <Input
              type={showPw ? 'text' : 'password'}
              value={conn.password}
              onChange={(v) => onChange({ ...conn, password: v })}
              placeholder="••••••••"
              icon="bx-lock-alt"
              suffix={
                <button
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: COLORS.textLight,
                    padding: 0,
                    display: 'flex',
                  }}
                >
                  <i className={`bx ${showPw ? 'bx-hide' : 'bx-show'}`} style={{ fontSize: 14 }} />
                </button>
              }
            />
          </div>
        </div>

        {status && (
          <div
            style={{
              fontSize: 11.5,
              color: status.ok ? COLORS.teal : COLORS.red,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 10px',
              borderRadius: 6,
              background: COLORS.surface,
              border: `1px solid ${status.ok ? COLORS.borderStrong : COLORS.red}`,
              fontFamily: MONO,
            }}
          >
            <i className={`bx ${status.ok ? 'bx-check-circle' : 'bx-error-circle'}`} style={{ fontSize: 13 }} />
            {status.message}
          </div>
        )}
      </div>
      )}
    </div>
  );
}

export function GitStatus({ git, projectPath }: { git: GitInfo; projectPath: string }) {
  if (!git.isGit) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          borderRadius: 8,
          background: COLORS.surface,
          border: `1px solid ${COLORS.red}`,
        }}
      >
        <i className="bx bx-git-branch" style={{ fontSize: 18, color: COLORS.red }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.red }}>Git 저장소가 아닙니다</div>
          <div style={{ fontSize: 11, color: COLORS.textMid, marginTop: 2 }}>
            {projectPath || '소스 상태를 스냅샷하려면 git 초기화된 프로젝트를 선택해주세요.'}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 8,
        background: COLORS.surfaceSubtle,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <i className="bx bxl-git" style={{ fontSize: 20, color: COLORS.ink }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: COLORS.textMid }}>branch</span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 4,
              background: COLORS.surfaceStrong,
              color: COLORS.ink,
            }}
          >
            {git.branch}
          </span>
          <span style={{ fontSize: 11, color: COLORS.textLight }}>·</span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: COLORS.textMid }}>{git.commitHash}</span>
        </div>
        {git.commitMsg && (
          <div
            style={{
              fontSize: 11,
              color: COLORS.textLight,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {git.commitMsg}
          </div>
        )}
      </div>
      {!!git.dirty && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '3px 7px',
            borderRadius: 4,
            background: COLORS.surfaceStrong,
            color: COLORS.yellow,
            border: `1px solid ${COLORS.borderStrong}`,
          }}
        >
          M {git.dirty}
        </span>
      )}
    </div>
  );
}

export function RestoreTargetPicker({
  expectedHash,
  defaultPath,
  target,
  onPick,
  onUseDefault,
}: {
  expectedHash: string;
  defaultPath: string;
  target: RestoreTargetCheck | null;
  onPick: () => void;
  onUseDefault: () => void;
}) {
  const isDefault = target && target.path === defaultPath;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <Input
          value={target ? target.path : ''}
          placeholder={defaultPath || '/path/to/project'}
          icon="bx-folder"
          mono
          readOnly
          onClick={onPick}
          error={!!target && (!target.isGit || !target.hashFound)}
          style={{ flex: 1 }}
        />
        <Btn kind="soft" icon="bx-folder-open" onClick={onPick}>
          변경
        </Btn>
        {!isDefault && defaultPath && (
          <Btn kind="text" size="sm" icon="bx-undo" onClick={onUseDefault}>
            원본 경로
          </Btn>
        )}
      </div>

      {target && (
        <div>
          {!target.isGit ? (
            <ValidationLine
              kind="error"
              icon="bx-x-circle"
              title="Git 저장소가 아닙니다"
              detail="이 경로에는 .git 폴더가 없어서 복원할 수 없어요. 다른 경로를 선택하세요."
            />
          ) : !target.hashFound ? (
            <ValidationLine
              kind="error"
              icon="bx-x-circle"
              title={`커밋 ${expectedHash}을(를) 찾을 수 없습니다`}
              detail="이 저장소에는 스냅샷 시점의 커밋이 존재하지 않아요. 같은 origin을 가리키는 클론인지 확인하세요."
            />
          ) : (
            <ValidationLine
              kind="success"
              icon="bx-check-circle"
              title="복원 가능"
              detail={
                <span>
                  현재 <span style={{ fontFamily: MONO, fontWeight: 600 }}>{target.branch}</span>
                  {' @ '}
                  <span style={{ fontFamily: MONO }}>{target.currentHash}</span>
                  {' → '}
                  <span style={{ fontFamily: MONO, fontWeight: 600, color: COLORS.ink }}>
                    {expectedHash}
                  </span>
                  로 reset 됩니다
                </span>
              }
            />
          )}
        </div>
      )}

      {!target && defaultPath && (
        <div style={{ fontSize: 11.5, color: COLORS.textLight, lineHeight: 1.5 }}>
          기본값: 스냅샷 원본 경로{' '}
          <span style={{ fontFamily: MONO, color: COLORS.textMid }}>{defaultPath}</span>. 다른 클론에 적용하려면{' '}
          <span style={{ color: COLORS.ink, fontWeight: 500 }}>변경</span>을 누르세요.
        </div>
      )}
    </div>
  );
}

function ValidationLine({
  kind,
  icon,
  title,
  detail,
}: {
  kind: 'success' | 'error';
  icon: string;
  title: string;
  detail: ReactNode;
}) {
  const palette =
    kind === 'success'
      ? { bg: COLORS.surface, border: COLORS.borderStrong, fg: COLORS.teal, detailFg: COLORS.textMid }
      : { bg: COLORS.surface, border: COLORS.red, fg: COLORS.red, detailFg: COLORS.textMid };
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 6,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
      }}
    >
      <i className={`bx ${icon}`} style={{ fontSize: 14, color: palette.fg, flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: palette.fg }}>{title}</div>
        <div style={{ fontSize: 11, color: palette.detailFg, marginTop: 2, lineHeight: 1.5 }}>{detail}</div>
      </div>
    </div>
  );
}

export function SnapshotListItem({
  snap,
  active,
  onClick,
  onDelete,
}: {
  snap: SnapshotHistoryItem;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '10px 12px',
        borderRadius: 8,
        border: `1px solid ${active ? COLORS.borderStrong : hover ? COLORS.border : 'transparent'}`,
        background: active ? COLORS.surface : hover ? COLORS.surfaceSubtle : 'transparent',
        cursor: 'pointer',
        transition: 'all .15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: active ? COLORS.ink : COLORS.surfaceStrong,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <i className="bx bx-camera" style={{ fontSize: 13, color: active ? COLORS.bg : COLORS.ink }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: COLORS.textDark,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {snap.name}
          </div>
          <div style={{ fontSize: 10.5, color: COLORS.textLight, marginTop: 1 }}>
            {snap.timestamp} · {snap.size}
          </div>
        </div>
        {hover && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              width: 22,
              height: 22,
              borderRadius: 5,
              border: 'none',
              background: 'transparent',
              color: COLORS.textLight,
              cursor: 'pointer',
            }}
          >
            <i className="bx bx-trash" style={{ fontSize: 13 }} />
          </button>
        )}
      </div>
    </div>
  );
}

export function FilePickerDropZone({ onPick }: { onPick: () => void }) {
  const [drag, setDrag] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        onPick();
      }}
      onClick={onPick}
      style={{
        flex: 1,
        borderRadius: 12,
        border: `1px dashed ${drag ? COLORS.borderStrong : COLORS.border}`,
        background: drag ? COLORS.surfaceSubtle : COLORS.surface,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: 32,
        cursor: 'pointer',
        transition: 'all .15s',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: drag ? COLORS.ink : COLORS.surfaceStrong,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all .2s',
        }}
      >
        <i className="bx bx-cloud-upload" style={{ fontSize: 32, color: drag ? COLORS.bg : COLORS.ink }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.textDark, marginBottom: 6 }}>
          .workshot 파일을 여기로 드래그
        </div>
        <div style={{ fontSize: 12, color: COLORS.textLight }}>또는 클릭해서 파일 선택</div>
      </div>
      <Btn kind="ghost" icon="bx-folder-open" onClick={onPick}>
        파일 선택
      </Btn>
    </div>
  );
}

export function SnapshotDetail({ snap }: { snap: SnapshotHistoryItem }) {
  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div>
        <div style={{ fontSize: 18, fontWeight: 400, color: COLORS.textDark, letterSpacing: 0 }}>
          {snap.name}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: COLORS.textLight,
            marginTop: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>
            <i className="bx bx-time-five" style={{ fontSize: 12, marginRight: 3 }} />
            {snap.timestamp}
          </span>
          <span>·</span>
          <span>
            <i className="bx bx-archive" style={{ fontSize: 12, marginRight: 3 }} />
            {snap.size}
          </span>
        </div>
      </div>

      {snap.note && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 7,
            background: COLORS.surfaceSubtle,
            borderLeft: `3px solid ${COLORS.yellow}`,
            fontSize: 12.5,
            color: COLORS.textDark,
            lineHeight: 1.5,
          }}
        >
          <i className="bx bx-message-detail" style={{ fontSize: 13, color: COLORS.yellow, marginRight: 6 }} />
          {snap.note}
        </div>
      )}

      <DetailSection icon="bxl-git" title="커밋">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: COLORS.textMid }}>{snap.branch}</span>
          <span style={{ fontSize: 11, color: COLORS.textLight }}>·</span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10.5,
              padding: '1px 6px',
              borderRadius: 3,
              background: COLORS.surfaceStrong,
              color: COLORS.ink,
              fontWeight: 600,
            }}
          >
            {snap.gitHash}
          </span>
        </div>
        {snap.commitMsg && (
          <div style={{ fontSize: 11, color: COLORS.textLight, marginTop: 4 }}>{snap.commitMsg}</div>
        )}
      </DetailSection>

      <DetailSection icon="bx-data" title={`데이터베이스 · ${snap.dbs.length}개`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {snap.dbs.map((d, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 8,
                background: COLORS.surfaceSubtle,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <DBTypeTag type={d.type} />
              <span style={{ fontSize: 12, color: COLORS.textDark, fontWeight: 500 }}>{d.name}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontFamily: MONO, fontSize: 10.5, color: COLORS.textMid }}>{d.size}</span>
            </div>
          ))}
        </div>
      </DetailSection>
    </div>
  );
}

function DetailSection({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <i className={`bx ${icon}`} style={{ fontSize: 13, color: COLORS.textMid }} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: COLORS.textMid,
            letterSpacing: 0,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </span>
      </div>
      <div>{children}</div>
    </div>
  );
}
