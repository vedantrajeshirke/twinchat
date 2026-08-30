/**
 * TwinChat mark: a split two-tone speech bubble with two "eyes".
 * Both halves fill from CSS variables so the logo recolours with the theme
 * (PROJECT_PLAN §7.2).
 */
export function LogoMark({ size = 28, className = '' }) {
  return (
    <svg
      viewBox="0 0 96 72"
      width={size * (96 / 72)}
      height={size}
      role="img"
      aria-label="TwinChat"
      className={className}
    >
      <path
        d="M14 10 h68 a12 12 0 0 1 12 12 v20 a12 12 0 0 1 -12 12 h-40 l-16 14 v-14 h-12 a12 12 0 0 1 -12 -12 v-20 a12 12 0 0 1 12 -12 z"
        fill="var(--primary)"
      />
      <path
        d="M48 10 h34 a12 12 0 0 1 12 12 v20 a12 12 0 0 1 -12 12 h-34 z"
        fill="var(--accent)"
      />
      <circle cx="35" cy="32" r="6" fill="#ffffff" />
      <circle cx="61" cy="32" r="6" fill="#ffffff" />
    </svg>
  );
}

export function Wordmark({ size = 28, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span
        className="font-[family-name:var(--font-display)] font-semibold tracking-tight"
        style={{ fontSize: size * 0.82 }}
      >
        <span className="text-heading">Twin</span>
        <span className="text-primary">Chat</span>
      </span>
    </span>
  );
}
