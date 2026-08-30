import { cn } from '../../utils/cn.js';

const SIZES = { xs: 24, sm: 32, md: 40, lg: 56, xl: 96 };

/** Deterministic tint from the name so fallbacks aren't all identical. */
function tint(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  return `hsl(${hash} 42% 58%)`;
}

export function Avatar({ src, name = '', size = 'md', className = '', online, square = false }) {
  const px = SIZES[size] ?? size;
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <span className={cn('relative inline-block shrink-0', className)} style={{ width: px, height: px }}>
      {src ? (
        <img
          src={src}
          alt=""
          width={px}
          height={px}
          className={cn('h-full w-full object-cover', square ? 'rounded-xl' : 'rounded-full')}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'flex h-full w-full items-center justify-center font-medium text-white select-none',
            square ? 'rounded-xl' : 'rounded-full'
          )}
          style={{ background: tint(name), fontSize: px * 0.38 }}
        >
          {initials || '?'}
        </span>
      )}
      {online !== undefined && (
        <span
          title={online ? 'Online' : 'Offline'}
          className={cn(
            'absolute right-0 bottom-0 block rounded-full ring-2',
            online ? 'bg-accent' : 'bg-muted'
          )}
          style={{
            width: Math.max(8, px * 0.26),
            height: Math.max(8, px * 0.26),
            // Ring colour must match whatever surface the avatar sits on.
            '--tw-ring-color': 'var(--surface-2)',
          }}
        />
      )}
    </span>
  );
}
