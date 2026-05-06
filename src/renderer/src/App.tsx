import { useCallback, useEffect, useState } from 'react';
import { COLORS } from './theme';
import { TitleBar } from './components/TitleBar';
import { Banner } from './components/ui';
import { SavePanel } from './panels/SavePanel';
import { RestorePanel } from './panels/RestorePanel';
import { useToasts } from './useToasts';
import { api } from './api';
import type { SnapshotHistoryItem } from '@shared/types';

type Tab = 'save' | 'restore';

function PanelSlot({ active, children }: { active: boolean; children: React.ReactNode }) {
  // Keep both panels mounted so user input persists across tab switches.
  return (
    <div
      style={{
        position: 'absolute',
        inset: 24,
        display: active ? 'flex' : 'none',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      {children}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('save');
  const [history, setHistory] = useState<SnapshotHistoryItem[]>([]);
  const { toasts, push, dismiss } = useToasts();

  const reloadHistory = useCallback(async () => {
    const list = await api().listHistory();
    setHistory(list);
  }, []);

  useEffect(() => {
    reloadHistory();
  }, [reloadHistory]);

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: COLORS.bg,
      }}
    >
      <TitleBar />

      <div
        style={{
          position: 'fixed',
          top: 50,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 1000,
          width: 380,
          maxWidth: '90vw',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto', animation: 'slideDown .25s ease' }}>
            <Banner
              kind={t.kind}
              icon={t.icon}
              title={t.title}
              message={t.message}
              onClose={() => dismiss(t.id)}
            />
          </div>
        ))}
      </div>

      <div style={{ flex: 1, padding: '0 0 16px', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            background: COLORS.bg,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              borderBottom: `1px solid ${COLORS.border}`,
              background: COLORS.bg,
              padding: '0 18px',
            }}
          >
            {([
              { id: 'save', label: '저장', icon: 'bx-camera' },
              { id: 'restore', label: '불러오기', icon: 'bx-history' },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  height: 44,
                  padding: '0 18px',
                  border: 'none',
                  background: 'transparent',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: tab === t.id ? 600 : 500,
                  color: tab === t.id ? COLORS.ink : COLORS.textMid,
                  borderBottom: tab === t.id ? `2px solid ${COLORS.ink}` : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                <i className={`bx ${t.icon}`} style={{ fontSize: 16 }} />
                {t.label}
              </button>
            ))}
          </div>
          <div
            style={{
              flex: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              position: 'relative',
            }}
          >
            <PanelSlot active={tab === 'save'}>
              <SavePanel onSaved={reloadHistory} pushToast={push} />
            </PanelSlot>
            <PanelSlot active={tab === 'restore'}>
              <RestorePanel history={history} onChanged={reloadHistory} pushToast={push} />
            </PanelSlot>
          </div>
        </div>
      </div>
    </div>
  );
}
