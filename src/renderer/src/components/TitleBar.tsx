import { useState } from 'react';
import { COLORS, MONO } from '../theme';
import { api } from '../api';

export function TitleBar() {
  const [hover, setHover] = useState<string | null>(null);
  const btnBase: React.CSSProperties = {
    width: 46,
    height: 40,
    border: 'none',
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: COLORS.textMid,
    fontSize: 14,
    transition: 'background .12s, color .12s',
    WebkitAppRegion: 'no-drag',
  } as React.CSSProperties;

  return (
    <div
      style={
        {
          height: 40,
          background: COLORS.bg,
          borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex',
          alignItems: 'center',
          WebkitAppRegion: 'drag',
          flexShrink: 0,
        } as React.CSSProperties
      }
    >
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.primary, letterSpacing: 0 }}>
          WorkShot
        </span>
        <span style={{ fontFamily: MONO, fontSize: 10.5, color: COLORS.textLight }}>v0.0.2</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <button
          onMouseEnter={() => setHover('min')}
          onMouseLeave={() => setHover(null)}
          onClick={() => api().windowControl('minimize')}
          style={{ ...btnBase, background: hover === 'min' ? COLORS.surfaceStrong : 'transparent' }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <button
          onMouseEnter={() => setHover('max')}
          onMouseLeave={() => setHover(null)}
          onClick={() => api().windowControl('maximize')}
          style={{ ...btnBase, background: hover === 'max' ? COLORS.surfaceStrong : 'transparent' }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <button
          onMouseEnter={() => setHover('close')}
          onMouseLeave={() => setHover(null)}
          onClick={() => api().windowControl('close')}
          style={{
            ...btnBase,
            background: hover === 'close' ? COLORS.red : 'transparent',
            color: hover === 'close' ? COLORS.onPrimary : COLORS.textMid,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1" />
            <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
