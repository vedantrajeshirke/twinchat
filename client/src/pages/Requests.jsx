import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BellOff, Check, X, Inbox, Send } from 'lucide-react';
import { api, errorMessage } from '../services/api.js';
import { useChat } from '../context/ChatContext.jsx';
import { useSocketEvent } from '../context/SocketContext.jsx';
import { PageHeader, PageBody } from '../components/PageHeader.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Chip, SharedBadge } from '../components/ui/Chip.jsx';
import { CardSkeleton } from '../components/ui/Skeleton.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { relativeTime } from '../utils/time.js';

function RequestRow({ person, when, actions }) {
  return (
    <article className="tc-card flex items-start gap-4 p-4">
      <Link to={`/user/${person.username}`} className="shrink-0">
        <Avatar src={person.profilePicture} name={`${person.firstName} ${person.lastName}`} size="lg" />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/user/${person.username}`} className="text-sm font-semibold text-heading hover:text-primary">
            {person.firstName} {person.lastName}
          </Link>
          <span className="text-[13px] text-muted">@{person.username}</span>
          <SharedBadge count={person.sharedCount} />
        </div>

        <p className="mt-0.5 text-[12px] text-muted">{relativeTime(when)}</p>

        {person.sharedInterests?.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {person.sharedInterests.slice(0, 4).map((i) => (
              <Chip key={i} tone="shared">{i}</Chip>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 gap-2 self-center">{actions}</div>
    </article>
  );
}

/** Incoming and outgoing connection requests (§5.8). */
export default function Requests() {
  const [data, setData] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const { setRequestCount, upsertConversation, loadConversations } = useChat();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const { data: payload } = await api.get('/requests');
      setData(payload);
      setRequestCount(payload.incomingCount);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [setRequestCount]);

  useEffect(() => {
    load();
  }, [load]);

  // A request arriving while this screen is open should just appear.
  useSocketEvent('request:new', load);
  useSocketEvent('request:cancelled', load);

  async function respond(id, action) {
    setBusyId(id);
    try {
      if (action === 'accept') {
        const { data: result } = await api.patch(`/requests/${id}/accept`);
        upsertConversation(result.conversation);
        await load();
        navigate(`/home/${result.conversation._id}`);
        return;
      }
      if (action === 'decline') await api.patch(`/requests/${id}/decline`);
      if (action === 'cancel') await api.delete(`/requests/${id}`);
      await load();
      await loadConversations();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Requests"
        subtitle="People who want to connect with you, and the requests you've sent."
      />

      <PageBody>
        {error && (
          <p className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger">
            {error}
          </p>
        )}

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold tracking-wide text-muted uppercase">
            <Inbox size={14} /> Incoming
            {data.incoming.length > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-[11px] text-on-primary">
                {data.incoming.length}
              </span>
            )}
          </h2>

          {loading ? (
            <CardSkeleton rows={2} />
          ) : data.incoming.length === 0 ? (
            <EmptyState
              icon={BellOff}
              title="You're all caught up"
              description="No pending requests. When someone wants to connect, it lands here."
              action={<Button variant="secondary" onClick={() => navigate('/search')}>Find people</Button>}
            />
          ) : (
            <div className="space-y-3">
              {data.incoming.map((r) => (
                <RequestRow
                  key={r._id}
                  person={r.from}
                  when={r.createdAt}
                  actions={
                    <>
                      <Button size="sm" loading={busyId === r._id} onClick={() => respond(r._id, 'accept')}>
                        {busyId !== r._id && <Check size={14} />} Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === r._id}
                        onClick={() => respond(r._id, 'decline')}
                      >
                        <X size={14} /> Decline
                      </Button>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </section>

        {data.outgoing.length > 0 && (
          <section className="mt-9">
            <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold tracking-wide text-muted uppercase">
              <Send size={14} /> Sent
            </h2>
            <div className="space-y-3">
              {data.outgoing.map((r) => (
                <RequestRow
                  key={r._id}
                  person={r.to}
                  when={r.createdAt}
                  actions={
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busyId === r._id}
                      onClick={() => respond(r._id, 'cancel')}
                    >
                      Cancel
                    </Button>
                  }
                />
              ))}
            </div>
          </section>
        )}
      </PageBody>
    </div>
  );
}
