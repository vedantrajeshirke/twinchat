import { Chip } from './ui/Chip.jsx';
import { Skeleton } from './ui/Skeleton.jsx';
import { useInterests } from '../hooks/useInterests.js';
import { cn } from '../utils/cn.js';

/**
 * Category-grouped multi-select over the interest list.
 * Used at signup (min 3), when editing a profile, and as a search filter.
 */
export function InterestPicker({ selected = [], onChange, min = 0, className = '' }) {
  const { categories, loading, error } = useInterests();

  const toggle = (name) =>
    onChange(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name]);

  if (loading) {
    return (
      <div className={cn('space-y-5', className)}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2.5">
            <Skeleton className="h-3 w-24" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-8 w-24" rounded="rounded-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) return <p className="text-sm text-danger">{error}</p>;

  return (
    <div className={cn('space-y-5', className)}>
      {min > 0 && (
        <p className="text-[13px] text-muted">
          <span className={selected.length >= min ? 'text-accent' : 'text-muted'}>
            {selected.length} selected
          </span>
          {selected.length < min && `. Pick at least ${min}.`}
        </p>
      )}

      {categories.map((category) => (
        <div key={category.name}>
          <h4 className="mb-2.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
            {category.name}
          </h4>
          <div className="flex flex-wrap gap-2">
            {category.interests.map((interest) => (
              <Chip
                key={interest._id}
                selected={selected.includes(interest.name)}
                onClick={() => toggle(interest.name)}
              >
                {interest.name}
              </Chip>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
