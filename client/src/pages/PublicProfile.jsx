import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, MessageSquare, UserMinus, UserPlus, UserX, Users } from 'lucide-react';
import { api, errorMessage } from '../services/api.js';
import { useConnect } from '../hooks/useConnect.js';
import { useSocket } from '../context/SocketContext.jsx';
import { PageBody } from '../components/PageHeader.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Chip, SharedBadge } from '../components/ui/Chip.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Dialog } from '../components/ui/Dialog.jsx';

/** Another user's profile (§5.6). Email is never shown here. */
export default function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { isOnline } = useSocket();
  const { sendRequest, openChat, busyId } = useConnect();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: payload } = await api.get(`/users/${username}`);
      setData(payload);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  async function connect() {
    const result = await sendRequest(data.user._id);
    if (result.ok) setData((prev) => ({ ...prev, user: { ...prev.user, relationship: 'request_sent' } }));
  }

  async function unfriend() {
    try {
      await api.delete(`/users/me/friends/${data.user._id}`);
      setConfirmRemove(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (loading) {
    return (
      <PageBody>
        <div className="tc-card p-6">
          <div className="flex items-center gap-5">
            <Skeleton className="h-24 w-24" rounded="rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-64" />
            </div>
          </div>
        </div>
      </PageBody>
    );
  }

  if (error || !data) {
    return (
      <PageBody>
        <EmptyState
          icon={UserX}
          title="Profile unavailable"
          description={error || 'We could not find that person.'}
          action={<Button variant="secondary" onClick={() => navigate('/search')}>Back to search</Button>}
        />
      </PageBody>
    );
  }

  const { user, groups } = data;
  const fullName = `${user.firstName} ${user.lastName}`;
  const busy = busyId === user._id;

  const action = {
    self: (
      <Link to="/profile">
        <Button variant="secondary">Edit your profile</Button>
      </Link>
    ),
    friend: (
      <div className="flex gap-2">
        <Button loading={busy} onClick={() => openChat(user._id)}>
          {!busy && <MessageSquare size={15} />} Message
        </Button>
        <Button variant="secondary" onClick={() => setConfirmRemove(true)}>
          <UserMinus size={15} /> Unfriend
        </Button>
      </div>
    ),
    request_sent: (
      <Button variant="secondary" disabled>
        <Clock size={15} /> Request pending
      </Button>
    ),
    request_received: (
      <Link to="/requests">
        <Button variant="accent">Respond to their request</Button>
      </Link>
    ),
    none: (
      <Button loading={busy} onClick={connect}>
        {!busy && <UserPlus size={15} />} Send connect request
      </Button>
    ),
  }[user.relationship];

  return (
    <PageBody>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-primary"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <section className="tc-card p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar src={user.profilePicture} name={fullName} size="xl" online={isOnline(user._id)} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl">{fullName}</h1>
              <SharedBadge count={user.sharedCount} />
            </div>
            <p className="text-sm text-muted">@{user.username}</p>
            {user.bio && <p className="mt-3 text-sm leading-relaxed text-body">{user.bio}</p>}
          </div>

          <div className="shrink-0">{action}</div>
        </div>

        <div className="mt-6">
          <h2 className="mb-2.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
            Interests
          </h2>
          <div className="flex flex-wrap gap-2">
            {user.interests.map((interest) => (
              <Chip
                key={interest}
                tone={user.sharedInterests.includes(interest) ? 'shared' : undefined}
              >
                {interest}
              </Chip>
            ))}
          </div>
          {user.sharedCount > 0 && (
            <p className="mt-2 text-[12px] text-muted">
              Highlighted interests are ones you both share.
            </p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold tracking-wide text-muted uppercase">
          <Users size={14} /> Groups
        </h2>

        {groups.length === 0 ? (
          <p className="text-[13px] text-muted">Not in any groups yet.</p>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => (
              <Link key={group._id} to={`/groups/${group._id}`} className="tc-card flex items-center gap-3 p-3 hover:border-primary/40">
                <Avatar src={group.groupPicture} name={group.name} size="md" square />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-heading">{group.name}</span>
                  <span className="block truncate text-[12px] text-muted">
                    {group.mainInterest} · {group.memberCount} members
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {confirmRemove && (
        <Dialog
          title={`Remove ${user.firstName}?`}
          onClose={() => setConfirmRemove(false)}
          width="max-w-sm"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmRemove(false)}>Keep</Button>
              <Button variant="danger" onClick={unfriend}>Remove</Button>
            </div>
          }
        >
          <p className="text-sm text-body">
            You'll both lose the connection and won't be able to message each other until you
            reconnect.
          </p>
        </Dialog>
      )}
    </PageBody>
  );
}
