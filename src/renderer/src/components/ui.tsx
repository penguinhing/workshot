import { useState, type CSSProperties, type ReactNode } from 'react';
import { COLORS, MONO } from '../theme';

const DB_TYPES = [
  { id: 'postgres' as const, label: 'PostgreSQL', color: COLORS.ink, disabled: false },
  { id: 'mysql' as const, label: 'MySQL', color: COLORS.muted, disabled: true },
  { id: 'mongo' as const, label: 'MongoDB', color: COLORS.muted, disabled: true },
  { id: 'redis' as const, label: 'Redis', color: COLORS.muted, disabled: true },
];
export { DB_TYPES };

export type BannerKind = 'info' | 'success' | 'warning' | 'error';

export function Banner({
  kind = 'info',
  icon,
  title,
  message,
  onClose,
}: {
  kind?: BannerKind;
  icon?: string;
  title?: string;
  message?: ReactNode;
  onClose?: () => void;
}) {
  const palette: Record<BannerKind, { bg: string; border: string; fg: string; iconBg: string }> = {
    info: { bg: COLORS.surface, border: COLORS.borderStrong, fg: COLORS.ink, iconBg: COLORS.ink },
    success: { bg: COLORS.surface, border: COLORS.borderStrong, fg: COLORS.teal, iconBg: COLORS.teal },
    warning: { bg: COLORS.surface, border: COLORS.borderStrong, fg: COLORS.yellow, iconBg: COLORS.yellow },
    error: { bg: COLORS.surface, border: COLORS.borderStrong, fg: COLORS.red, iconBg: COLORS.red },
  };
  const p = palette[kind];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 8,
        background: p.bg,
        border: `1px solid ${p.border}`,
        fontSize: 13,
        color: p.fg,
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          background: p.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <i className={`bx ${icon || 'bx-info-circle'}`} style={{ color: COLORS.onPrimary, fontSize: 16 }} />
      </div>
      <div style={{ flex: 1, lineHeight: 1.45 }}>
        {title && <div style={{ fontWeight: 600, marginBottom: 2 }}>{title}</div>}
        {message && <div style={{ color: p.fg, opacity: 0.85 }}>{message}</div>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: p.fg,
          }}
        >
          <i className="bx bx-x" style={{ fontSize: 18 }} />
        </button>
      )}
    </div>
  );
}

export function DBTypeTag({ type }: { type: string }) {
  const t = DB_TYPES.find((d) => d.id === type) || DB_TYPES[0];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 20,
        padding: '0 7px',
        borderRadius: 4,
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        fontSize: 10.5,
        fontWeight: 600,
        color: t.color,
        letterSpacing: 0,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.color }} />
      {t.label}
    </span>
  );
}

export function Section({
  step,
  title,
  subtitle,
  action,
  children,
  style,
  noBorder,
}: {
  step?: string | number;
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
  noBorder?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: 28,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {step != null && (
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: COLORS.surfaceStrong,
                color: COLORS.ink,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: MONO,
                letterSpacing: 0,
              }}
            >
              {step}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textDark, letterSpacing: 0 }}>
              {title}
            </div>
            {subtitle && <div style={{ fontSize: 11, color: COLORS.textLight }}>{subtitle}</div>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Card({
  title,
  subtitle,
  icon,
  action,
  children,
  style,
}: {
  title?: string;
  subtitle?: ReactNode;
  icon?: string;
  action?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {(title || action) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {icon && (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: COLORS.surfaceStrong,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className={`bx ${icon}`} style={{ color: COLORS.ink, fontSize: 16 }} />
              </div>
            )}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textDark, letterSpacing: 0 }}>
                {title}
              </div>
              {subtitle && <div style={{ fontSize: 11.5, color: COLORS.textLight, marginTop: 2 }}>{subtitle}</div>}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
  style,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && (
        <label
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: COLORS.textMid,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {label}
          {required && <span style={{ color: COLORS.red }}>*</span>}
        </label>
      )}
      {children}
      {hint && !error && <div style={{ fontSize: 11, color: COLORS.textLight }}>{hint}</div>}
      {error && (
        <div
          style={{ fontSize: 11, color: COLORS.red, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <i className="bx bx-error-circle" style={{ fontSize: 12 }} />
          {error}
        </div>
      )}
    </div>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  mono,
  error,
  icon,
  suffix,
  readOnly,
  style,
  onClick,
}: {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
  error?: boolean;
  icon?: string;
  suffix?: ReactNode;
  readOnly?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  const [focus, setFocus] = useState(false);
  const borderColor = error ? COLORS.red : focus ? COLORS.borderStrong : COLORS.border;
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 44,
        padding: '0 16px',
        borderRadius: 8,
        border: `1px solid ${borderColor}`,
        background: readOnly ? COLORS.surfaceSubtle : COLORS.surface,
        transition: 'border-color .15s',
        cursor: onClick ? 'pointer' : 'text',
        ...style,
      }}
    >
      {icon && (
        <i className={`bx ${icon}`} style={{ color: COLORS.textLight, fontSize: 15, flexShrink: 0 }} />
      )}
      <input
        type={type}
        value={value || ''}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={(e) => onChange && onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: 13,
          color: COLORS.textDark,
          fontFamily: mono ? MONO : 'inherit',
          minWidth: 0,
        }}
      />
      {suffix}
    </div>
  );
}

export function Textarea({
  value,
  onChange,
  placeholder,
}: {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        width: '100%',
        minHeight: 60,
        padding: '10px 12px',
        borderRadius: 8,
        border: `1px solid ${focus ? COLORS.borderStrong : COLORS.border}`,
        background: COLORS.surface,
        fontSize: 12.5,
        color: COLORS.textDark,
        fontFamily: 'inherit',
        resize: 'vertical',
        outline: 'none',
        transition: 'border-color .15s',
      }}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        border: 'none',
        background: 'transparent',
        padding: 0,
        cursor: 'pointer',
        fontFamily: 'inherit',
        color: COLORS.textDark,
      }}
    >
      <span
        style={{
          width: 38,
          height: 22,
          borderRadius: 999,
          padding: 2,
          background: checked ? COLORS.ink : COLORS.border,
          transition: 'background .15s',
          display: 'flex',
          justifyContent: checked ? 'flex-end' : 'flex-start',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: COLORS.surface,
          }}
        />
      </span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
    </button>
  );
}

type BtnKind = 'primary' | 'ghost' | 'soft' | 'danger' | 'text';
type BtnSize = 'sm' | 'md' | 'lg';

export function Btn({
  kind = 'primary',
  size = 'md',
  icon,
  iconRight,
  children,
  onClick,
  disabled,
  loading,
  full,
  style,
}: {
  kind?: BtnKind;
  size?: BtnSize;
  icon?: string;
  iconRight?: string;
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  style?: CSSProperties;
}) {
  const [hover, setHover] = useState(false);
  const sizes: Record<BtnSize, { h: number; px: number; fs: number }> = {
    sm: { h: 32, px: 12, fs: 12 },
    md: { h: 40, px: 18, fs: 14 },
    lg: { h: 44, px: 20, fs: 14 },
  };
  const s = sizes[size];
  const palettes: Record<BtnKind, { bg: string; color: string; border: string }> = {
    primary: {
      bg: hover && !disabled ? COLORS.primaryActive : COLORS.primary,
      color: COLORS.onPrimary,
      border: 'transparent',
    },
    ghost: {
      bg: hover && !disabled ? COLORS.surfaceSubtle : COLORS.surface,
      color: COLORS.ink,
      border: COLORS.borderStrong,
    },
    soft: {
      bg: hover && !disabled ? COLORS.borderLight : COLORS.surfaceStrong,
      color: COLORS.textDark,
      border: COLORS.border,
    },
    danger: {
      bg: COLORS.red,
      color: COLORS.onPrimary,
      border: 'transparent',
    },
    text: {
      bg: hover && !disabled ? COLORS.surfaceStrong : 'transparent',
      color: COLORS.ink,
      border: 'transparent',
    },
  };
  const p = palettes[kind];
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: s.h,
        padding: `0 ${s.px}px`,
        borderRadius: 8,
        background: p.bg,
        color: p.color,
        border: `1px solid ${p.border}`,
        fontSize: s.fs,
        fontWeight: 500,
        fontFamily: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
        width: full ? '100%' : 'auto',
        transition: 'background .15s, transform .05s',
        ...style,
      }}
    >
      {loading && <i className="bx bx-loader-alt bx-spin" style={{ fontSize: s.fs + 2 }} />}
      {!loading && icon && <i className={`bx ${icon}`} style={{ fontSize: s.fs + 2 }} />}
      {children}
      {iconRight && <i className={`bx ${iconRight}`} style={{ fontSize: s.fs + 2 }} />}
    </button>
  );
}

export function EmptyHint({
  icon,
  message,
  cta,
  onCta,
}: {
  icon: string;
  message: ReactNode;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <div
      style={{
        padding: '32px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: COLORS.surface,
          border: `1px dashed ${COLORS.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <i className={`bx ${icon}`} style={{ fontSize: 22, color: COLORS.textLight }} />
      </div>
      <div style={{ fontSize: 12.5, color: COLORS.textMid, maxWidth: 280, lineHeight: 1.5 }}>{message}</div>
      {cta && (
        <Btn kind="ghost" size="sm" onClick={onCta}>
          {cta}
        </Btn>
      )}
    </div>
  );
}

export function PanelHeader({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: COLORS.surfaceStrong,
          border: `1px solid ${COLORS.borderStrong}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <i className={`bx ${icon}`} style={{ color: COLORS.ink, fontSize: 20 }} />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 400, color: COLORS.textDark, letterSpacing: 0 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 1 }}>{subtitle}</div>
      </div>
    </div>
  );
}
