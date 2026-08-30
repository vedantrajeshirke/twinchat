import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, LogIn, MessageSquare } from 'lucide-react';
import { api, errorMessage } from '../../services/api.js';
import { Avatar } from '../ui/Avatar.jsx';
import { Button } from '../ui/Button.jsx';
import { Chip } from '../ui/Chip.jsx';
import { useChat } from '../../context/ChatContext.jsx';

export function GroupCard({ group, onChanged }) {
  const [state, setState] = useState(group);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { loadConversations } = useChat();

  async function join() {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`/groups/${group._id}/join`);
      setState(data.group);
      await loadConversations();
      onChanged?.();
      navigate(`/home/${data.conversationId}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="tc-card flex items-start gap-4 p-4">
      <Link to={`/groups/${group._id}`} className="shrink-0">
        <Avatar src={state.groupPicture} name={state.name} size="lg" square />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/groups/${group._id}`} className="text-sm font-semibold text-heading hover:text-primary">
            {state.name}
          </Link>
          <Chip tone="primary">{state.mainInterest}</Chip>
        </div>

        {state.description && (
          <p className="mt-1 line-clamp-2 text-[13px] text-muted">{state.description}</p>
        )}

        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-muted">
          <Users size={13} />
          {state.memberCount} {state.memberCount === 1 ? 'member' : 'members'}
          {state.isOwner && <span className="text-accent">· You own this</span>}
        </p>

        {error && <p className="mt-1.5 text-[12px] text-danger">{error}</p>}
      </div>

      <div className="shrink-0 self-center">
        {state.isMember ? (
          <Link to={`/groups/${group._id}`}>
            <Button size="sm" variant="secondary">
              <MessageSquare size={14} /> Open
            </Button>
          </Link>
        ) : (
          <Button size="sm" loading={busy} onClick={join}>
            {!busy && <LogIn size={14} />} Join
          </Button>
        )}
      </div>
    </article>
  );
}
