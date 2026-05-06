import { COLORS, MONO } from '../theme';
import type { ProgressStep } from '@shared/types';

export function ProgressSegmented({ steps }: { steps: ProgressStep[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {steps.map((s, i) => (
          <div key={s.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: COLORS.borderLight,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${s.percent}%`,
                  background:
                    s.status === 'error'
                      ? COLORS.red
                      : s.status === 'done'
                      ? COLORS.teal
                      : COLORS.ink,
                  transition: 'width .3s ease',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background:
                    s.status === 'done'
                      ? COLORS.teal
                      : s.status === 'active'
                      ? COLORS.ink
                      : s.status === 'error'
                      ? COLORS.red
                      : COLORS.borderLight,
                  color: s.status === 'pending' ? COLORS.textMid : COLORS.bg,
                  fontSize: 9,
                  fontWeight: 700,
                  fontFamily: MONO,
                }}
              >
                {s.status === 'done' ? '✓' : s.status === 'error' ? '!' : i + 1}
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  color: COLORS.textMid,
                  fontWeight: s.status === 'active' ? 600 : 400,
                }}
              >
                {s.label}
              </span>
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 14,
                fontWeight: 700,
                  color: s.status === 'active' ? COLORS.ink : COLORS.textDark,
              }}
            >
              {s.percent.toFixed(0)}
              <span style={{ fontSize: 10, color: COLORS.textLight }}>%</span>
            </div>
            {s.detail && (
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 10.5,
                  color: COLORS.textLight,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.detail}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
