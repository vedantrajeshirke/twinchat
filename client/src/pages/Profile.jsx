import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, LogOut, Mail, Pencil, UserMinus, Users, UserPlus, X, Check } from 'lucide-react';
import { api, errorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { PageHeader, PageBody } from '../components/PageHeader.jsx';
import { InterestPicker } from '../components/InterestPicker.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Chip } from '../components/ui/Chip.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { CardSkeleton } from '../components/ui/Skeleton.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Dialog } from '../components/ui/Dialog.jsx';
import { MAX_UPLOAD_BYTES, formatBytes } from '../utils/files.js';

/** The account owner's own profile (§5.7). Email is visible here only. */
export default function Profile() {
  const { user, patchUser, logout } = useAuth();
  const { isOnline } = useSocket();
  const navigate = useNavigate();

  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [editing, setEditing] = useState(false);
  const [unfriending, setUnfriending] = useState(null);
  const [notice, setNotice] = useState('');

  const loadFriends = useCallback(async () => {
    try {
      const { data } = await api.get('/users/me/friends');
      setFriends(data.friends);
    } catch (err) {
      setNotice(errorMessage(err));
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  async function uploadAvatar(file) {
    if (file.size > MAX_UPLOAD_BYTES) {
      setNotice(`That image is ${formatBytes(file.size)}. The limit is 1MB.`);
      return;
    }
    try {
      const body = new FormData();
      body.append('file', file);
      const { data } = await api.post('/users/me/avatar', body);
      patchUser({ profilePicture: data.user.profilePicture });
      setNotice('');
    } catch (err) {
      setNotice(errorMessage(err));
    }
  }

  async function confirmUnfriend() {
    try {
      await api.delete(`/users/me/friends/${unfriending._id}`);
      setUnfriending(null);
      await loadFriends();
    } catch (err) {
      setNotice(errorMessage(err));
    }
  }

  if (!user) return null;
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Your profile"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              <Pencil size={14} /> Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                logout();
                navigate('/', { replace: true });
              }}
            >
              <LogOut size={14} /> Log out
            </Button>
          </div>
        }
      />

      <PageBody>
        {notice && (
          <p className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger">
            {notice}
          </p>
        )}

        <section className="tc-card p-6">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <label className="group relative cursor-pointer">
              <Avatar src={user.profilePicture} name={fullName} size="xl" />
              <span className="absolute -right-1 -bottom-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm transition-colors group-hover:bg-primary-dark">
                <Camera size={16} />
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) uploadAvatar(file);
                }}
              />
            </label>

            <div className="min-w-0">
              <h2 className="text-xl">{fullName}</h2>
              <p className="text-sm text-muted">@{user.username}</p>
              {/* Private: shown to the owner only, never on a public profile. */}
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-surface px-2 py-1 text-[12px] text-muted">
                <Mail size={12} /> {user.email}
                <span className="text-[11px] opacity-70">· only you can see this</span>
              </p>
            </div>
          </div>

          {user.bio && <p className="mt-5 text-sm leading-relaxed text-body">{user.bio}</p>}

          <div className="mt-5">
            <h3 className="mb-2.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
              Interests
            </h3>
            <div className="flex flex-wrap gap-2">
              {user.interests.map((i) => (
                <Chip key={i}>{i}</Chip>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold tracking-wide text-muted uppercase">
            <Users size={14} /> Connections {friends.length > 0 && `(${friends.length})`}
          </h2>

          {loadingFriends ? (
            <CardSkeleton rows={2} />
          ) : friends.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="No connections yet"
              description="Find people who share your interests and send them a request."
              action={<Button onClick={() => navigate('/search')}>Find people</Button>}
            />
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <div key={friend._id} className="tc-card flex items-center gap-3 p-3">
                  <Link to={`/user/${friend.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar
                      src={friend.profilePicture}
                      name={`${friend.firstName} ${friend.lastName}`}
                      size="md"
                      online={isOnline(friend._id)}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-heading">
                        {friend.firstName} {friend.lastName}
                      </span>
                      <span className="block truncate text-[12px] text-muted">
                        @{friend.username}
                        {friend.sharedCount > 0 && ` · ${friend.sharedCount} in common`}
                      </span>
                    </span>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setUnfriending(friend)}
                    aria-label={`Remove ${friend.firstName}`}
                  >
                    <UserMinus size={14} /> Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </PageBody>

      {editing && <EditProfileDialog onClose={() => setEditing(false)} />}

      {unfriending && (
        <Dialog
          title={`Remove ${unfriending.firstName}?`}
          onClose={() => setUnfriending(null)}
          width="max-w-sm"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setUnfriending(null)}>Keep</Button>
              <Button variant="danger" onClick={confirmUnfriend}>
                <UserMinus size={14} /> Remove
              </Button>
            </div>
          }
        >
          <p className="text-sm text-body">
            You'll both lose the connection, and neither of you will be able to message the other
            until you reconnect.
          </p>
        </Dialog>
      )}
    </div>
  );
}

function EditProfileDialog({ onClose }) {
  const { user, patchUser } = useAuth();

  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    bio: user.bio ?? '',
  });
  const [interests, setInterests] = useState(user.interests);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(e) {
    e.preventDefault();
    setError('');

    if (interests.length < 3) return setError('Keep at least 3 interests so people can find you.');

    setSaving(true);
    try {
      const { data } = await api.patch('/users/me', { ...form, interests });
      patchUser(data.user);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      title="Edit profile"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            <X size={14} /> Cancel
          </Button>
          <Button type="submit" form="edit-profile" loading={saving}>
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

      <form id="edit-profile" onSubmit={save} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
          />
          <Input
            label="Last name"
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
          />
        </div>

        <Textarea
          label="Bio"
          rows={3}
          maxLength={300}
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          hint={`${form.bio.length}/300`}
        />

        <div>
          <span className="mb-3 block text-[13px] font-medium text-heading">Interests</span>
          <InterestPicker selected={interests} onChange={setInterests} min={3} />
        </div>
      </form>
    </Dialog>
  );
}
