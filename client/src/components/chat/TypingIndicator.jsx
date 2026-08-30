/** Three-dot indicator, styled like a received bubble. */
export function TypingIndicator({ users = [], isGroup }) {
  if (users.length === 0) return null;

  const label = isGroup
    ? users.length === 1
      ? `${users[0].firstName} is typing`
      : `${users.length} people are typing`
    : 'typing';

  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="flex items-center gap-1 rounded-xl rounded-bl-sm border border-line bg-surface-2 px-3 py-2.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-1.5 w-1.5 animate-bounce rounded-full bg-muted"
            style={{ animationDelay: `${i * 140}ms`, animationDuration: '1s' }}
          />
        ))}
      </span>
      <span className="text-[11px] text-muted">{label}</span>
    </div>
  );
}
