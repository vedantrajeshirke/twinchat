import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, LogIn, LogOut, MessageSquare, Pencil, Share2, Trash2, Users, UserX, Check, X,
} from 'lucide-react';
import { api, errorMessage } from '../services/api.js';
import { useChat } from '../context/ChatContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useInterests } from '../hooks/useInterests.js';
import { PageBody } from '../components/PageHeader.jsx';
import { AvatarPicker } from '../components/AvatarPicker.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Chip } from '../components/ui/Chip.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Dialog } from '../components/ui/Dialog.jsx';

/** Group info panel (§5.9): members, join/leave, owner-only editing. */
export default function GroupPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { isOnline } = useSocket();
  const { loadConversations } = useChat();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'leave' | 'delete'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: payload } = await api.get(`/groups/${groupId}`);
      setData(payload);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  async function join() {
    setBusy(true);
    try {
      const { data: result } = await api.post(`/groups/${groupId}/join`);
      await loadConversations();
      navigate(`/home/${result.conversationId}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function act(kind) {
    setBusy(true);
    try {
      if (kind === 'leave') await api.post(`/groups/${groupId}/leave`);
      if (kind === 'delete') await api.delete(`/groups/${groupId}`);
      await loadConversations();
      navigate(kind === 'delete' ? '/search?tab=groups' : '/home');
    } catch (err) {
      setError(errorMessage(err));
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <PageBody>
        <div className="tc-card p-6">
          <div className="flex items-center gap-5">
            <Skeleton className="h-24 w-24" rounded="rounded-xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3.5 w-32" />
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
          title="Group unavailable"
          description={error || 'We could not find that group.'}
          action={<Button variant="secondary" onClick={() => navigate('/search?tab=groups')}>Browse groups</Button>}
        />
      </PageBody>
    );
  }

  const { group, members, conversationId } = data;

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
          <Avatar src={group.groupPicture} name={group.name} size="xl" square />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl">{group.name}</h1>
              <Chip tone="primary">{group.mainInterest}</Chip>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
              <Users size={13} /> {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
              {group.isOwner && <span className="text-accent">· You own this group</span>}
            </p>
            {group.description && (
              <p className="mt-3 text-sm leading-relaxed text-body">{group.description}</p>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            {group.isMember ? (
              <>
                <Button onClick={() => navigate(`/home/${conversationId}`)}>
                  <MessageSquare size={15} /> Open chat
                </Button>
                {group.isOwner ? (
                  <>
                    <Button variant="secondary" onClick={() => setEditing(true)}>
                      <Pencil size={15} /> Edit group
                    </Button>
                    <Button variant="danger" onClick={() => setConfirm('delete')}>
                      <Trash2 size={15} /> Delete
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" onClick={() => setConfirm('leave')}>
                    <LogOut size={15} /> Leave group
                  </Button>
                )}
              </>
            ) : (
              <Button loading={busy} onClick={join}>
                {!busy && <LogIn size={15} />} Join group
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold tracking-wide text-muted uppercase">
          <Users size={14} /> Members ({members.length})
        </h2>

        {members.length === 1 && group.isOwner ? (
          <EmptyState
            icon={Share2}
            title="It's just you so far"
            description="Share the group name. Anyone can find it in search and join."
            action={<Button variant="secondary" onClick={() => navigate('/search')}>Invite people you know</Button>}
          />
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <Link
                key={member._id}
                to={member.relationship === 'self' ? '/profile' : `/user/${member.username}`}
                className="tc-card flex items-center gap-3 p-3 hover:border-primary/40"
              >
                <Avatar
                  src={member.profilePicture}
                  name={`${member.firstName} ${member.lastName}`}
                  size="md"
                  online={isOnline(member._id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-heading">
                    {member.firstName} {member.lastName}
                    {String(member._id) === String(group.owner) && (
                      <span className="ml-2 rounded-full bg-accent/12 px-2 py-0.5 text-[10px] font-medium text-accent">
                        Owner
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[12px] text-muted">
                    @{member.username}
                    {member.relationship === 'self'
                      ? ' · You'
                      : member.sharedCount > 0 && ` · ${member.sharedCount} in common`}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <EditGroupDialog
          group={group}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            load();
            loadConversations();
          }}
        />
      )}

      {confirm && (
        <Dialog
          title={confirm === 'delete' ? `Delete ${group.name}?` : `Leave ${group.name}?`}
          onClose={() => setConfirm(null)}
          width="max-w-sm"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
              <Button variant="danger" loading={busy} onClick={() => act(confirm)}>
                {confirm === 'delete' ? 'Delete group' : 'Leave'}
              </Button>
            </div>
          }
        >
          <p className="text-sm text-body">
            {confirm === 'delete'
              ? 'This removes the group and every message in it, for all members. This cannot be undone.'
              : "You'll stop receiving messages from this group. You can join again from search."}
          </p>
        </Dialog>
      )}
    </PageBody>
  );
}

function EditGroupDialog({ group, onClose, onSaved }) {
  const { interests, loading } = useInterests();
  const [form, setForm] = useState({
    name: group.name,
    description: group.description ?? '',
    mainInterest: group.mainInterest,
  });
  const [picture, setPicture] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Group name cannot be empty.');

    setSaving(true);
    try {
      const body = new FormData();
      body.append('name', form.name.trim());
      body.append('description', form.description.trim());
      body.append('mainInterest', form.mainInterest);
      if (picture) body.append('file', picture);

      await api.patch(`/groups/${group._id}`, body);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      title="Edit group"
      description="Only you, as the owner, can change this."
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            <X size={14} /> Cancel
          </Button>
          <Button type="submit" form="edit-group" loading={saving}>
            <Check size={14} /> Save changes
          </Button>
        </div>
      }
    >
      {error && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger">
          {error}
        </p>
      )}

      <form id="edit-group" onSubmit={save} className="space-y-5">
        <AvatarPicker
          file={picture}
          onChange={setPicture}
          name={form.name}
          currentUrl={group.groupPicture}
          size="lg"
        />

        <Input
          label="Group name"
          value={form.name}
          maxLength={60}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />

        <div>
          <span className="mb-2 block text-[13px] font-medium text-heading">Main interest</span>
          {loading ? (
            <p className="text-[13px] text-muted">Loading interests…</p>
          ) : (
            <div className="tc-scroll flex max-h-40 flex-wrap gap-2 overflow-y-auto">
              {interests.map((interest) => (
                <Chip
                  key={interest._id}
                  selected={form.mainInterest === interest.name}
                  onClick={() => setForm((f) => ({ ...f, mainInterest: interest.name }))}
                >
                  {interest.name}
                </Chip>
              ))}
            </div>
          )}
        </div>

        <Textarea
          label="Description"
          rows={3}
          maxLength={500}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </form>
    </Dialog>
  );
}
