import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, UserSearch, Users, Plus, X } from 'lucide-react';
import { api, errorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader, PageBody } from '../components/PageHeader.jsx';
import { PersonCard } from '../components/discovery/PersonCard.jsx';
import { GroupCard } from '../components/discovery/GroupCard.jsx';
import { InterestPicker } from '../components/InterestPicker.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Chip } from '../components/ui/Chip.jsx';
import { CardSkeleton } from '../components/ui/Skeleton.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { CreateGroupDialog } from '../components/group/CreateGroupDialog.jsx';
import { cn } from '../utils/cn.js';

const TABS = [
  { id: 'people', label: 'People', icon: UserSearch },
  { id: 'groups', label: 'Groups', icon: Users },
];

/** App-wide discovery (§5.5). The entry point for finding new people and groups. */
export default function Discover() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();

  const tab = params.get('tab') === 'groups' ? 'groups' : 'people';
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [interests, setInterests] = useState(() =>
    (params.get('interests') ?? '').split(',').filter(Boolean)
  );
  const [showFilters, setShowFilters] = useState(false);
  const [creating, setCreating] = useState(false);

  const [results, setResults] = useState([]);
  const [suggested, setSuggested] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isBrowsing = query.trim() === '' && interests.length === 0;

  const setTab = (next) => {
    const p = new URLSearchParams(params);
    p.set('tab', next);
    setParams(p, { replace: true });
  };

  // Keep the URL in step so a search can be shared or restored on refresh.
  useEffect(() => {
    const p = new URLSearchParams(params);
    query.trim() ? p.set('q', query.trim()) : p.delete('q');
    interests.length ? p.set('interests', interests.join(',')) : p.delete('interests');
    setParams(p, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, interests]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const path = tab === 'people' ? '/users' : '/groups';
      const [search, suggestions] = await Promise.all([
        api.get(`${path}/search`, {
          params: { q: query.trim(), interests: interests.join(',') },
        }),
        isBrowsing ? api.get(`${path}/suggested`) : Promise.resolve({ data: { results: [] } }),
      ]);
      setResults(search.data.results);
      setSuggested(suggestions.data.results);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tab, query, interests, isBrowsing]);

  // Debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const Card = tab === 'people' ? PersonCard : GroupCard;
  const shown = useMemo(() => (isBrowsing && suggested.length ? suggested : results), [
    isBrowsing, suggested, results,
  ]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Find your people"
        subtitle="Search by name, or filter by the interests you care about."
        action={
          tab === 'groups' ? (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus size={15} /> New group
            </Button>
          ) : null
        }
      />

      <div className="border-b border-line bg-surface px-5 pb-4">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute top-1/2 left-3.5 z-10 -translate-y-1/2 text-muted" />
              <Input
                rounded="pill"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tab === 'people' ? 'Search people by name or username' : 'Search groups by name'}
                aria-label="Search"
                className="pl-9"
              />
            </div>
            <Button
              variant={interests.length ? 'primary' : 'secondary'}
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
            >
              <SlidersHorizontal size={15} />
              Interests
              {interests.length > 0 && (
                <span className="ml-0.5 rounded-full bg-white/25 px-1.5 text-[11px]">
                  {interests.length}
                </span>
              )}
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-pressed={tab === id}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                  tab === id
                    ? 'bg-primary text-on-primary'
                    : 'border border-line bg-surface-2 text-body hover:text-primary'
                )}
              >
                <Icon size={14} /> {label}
              </button>
            ))}

            {interests.length > 0 && (
              <button
                type="button"
                onClick={() => setInterests([])}
                className="ml-auto inline-flex items-center gap-1 text-[12px] text-muted hover:text-danger"
              >
                <X size={12} /> Clear filters
              </button>
            )}
          </div>

          {interests.length > 0 && !showFilters && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {interests.map((i) => (
                <Chip key={i} selected onClick={() => setInterests((prev) => prev.filter((x) => x !== i))}>
                  {i} <X size={11} />
                </Chip>
              ))}
            </div>
          )}

          {showFilters && (
            <div className="mt-4 rounded-xl border border-line bg-surface-2 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-heading">Filter by interest</h3>
                <button
                  type="button"
                  onClick={() => setInterests(user?.interests ?? [])}
                  className="text-[12px] text-primary hover:underline"
                >
                  Use my interests
                </button>
              </div>
              <InterestPicker selected={interests} onChange={setInterests} />
            </div>
          )}
        </div>
      </div>

      <PageBody>
        {isBrowsing && suggested.length > 0 && !loading && (
          <h2 className="mb-3 text-[13px] font-semibold tracking-wide text-muted uppercase">
            {tab === 'people' ? 'Suggested for you' : 'Groups matching your interests'}
          </h2>
        )}

        {loading ? (
          <CardSkeleton />
        ) : error ? (
          <EmptyState
            icon={Search}
            title="Couldn't load results"
            description={error}
            action={<Button variant="secondary" onClick={load}>Try again</Button>}
          />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={tab === 'people' ? UserSearch : Users}
            title="No matches"
            description={
              isBrowsing
                ? tab === 'people'
                  ? 'Nobody else shares your interests yet. Try searching by name.'
                  : 'No groups match your interests yet. Why not start one?'
                : 'Try different interests or another name. Your filters are still applied above.'
            }
            action={
              tab === 'groups' ? (
                <Button onClick={() => setCreating(true)}>
                  <Plus size={15} /> Create a group
                </Button>
              ) : interests.length ? (
                <Button variant="secondary" onClick={() => setInterests([])}>
                  Clear interest filters
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="space-y-3">
            {shown.map((item) => (
              <Card key={item._id} {...(tab === 'people' ? { person: item } : { group: item })} onChanged={load} />
            ))}
          </div>
        )}
      </PageBody>

      {creating && (
        <CreateGroupDialog
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </div>
  );
}
