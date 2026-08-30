/** Tiny className joiner. Filters out falsy values. */
export const cn = (...parts) => parts.filter(Boolean).join(' ');
