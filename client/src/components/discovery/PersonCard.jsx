import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock, MessageSquare, UserPlus } from 'lucide-react';
import { Avatar } from '../ui/Avatar.jsx';
import { Button } from '../ui/Button.jsx';
import { Chip, SharedBadge } from '../ui/Chip.jsx';
import { useConnect } from '../../hooks/useConnect.js';
import { useSocket } from '../../context/SocketContext.jsx';

/**
 * One person in a result list. The action button reflects the relationship:
 * Connect → Pending → Message (§5.5).
 */
export function PersonCard({ person, onChanged }) {
  const [relationship, setRelationship] = useState(person.relationship);
  const { sendRequest, openChat, busyId } = useConnect();
  const { isOnline } = useSocket();

  const busy = busyId === person._id;
  const fullName = `${person.firstName} ${person.lastName}`;

  async function handleConnect() {
    const result = await sendRequest(person._id);
    if (result.ok) {
      setRelationship('request_sent');
      onChanged?.();
    }
  }

  const action = {
    self: null,
    friend: (
      <Button size="sm" loading={busy} onClick={() => openChat(person._id)}>
        {!busy && <MessageSquare size={14} />} Message
      </Button>
    ),
    request_sent: (
      <Button size="sm" variant="secondary" disabled>
        <Clock size={14} /> Pending
      </Button>
    ),
    request_received: (
      <Link to="/requests">
        <Button size="sm" variant="accent">
          <Check size={14} /> Respond
        </Button>
      </Link>
    ),
    none: (
      <Button size="sm" loading={busy} onClick={handleConnect}>
        {!busy && <UserPlus size={14} />} Connect
      </Button>
    ),
  }[relationship];

  return (
    <article className="tc-card flex items-start gap-4 p-4">
      <Link to={`/user/${person.username}`} className="shrink-0">
        <Avatar src={person.profilePicture} name={fullName} size="lg" online={isOnline(person._id)} />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/user/${person.username}`} className="text-sm font-semibold text-heading hover:text-primary">
            {fullName}
          </Link>
          <span className="text-[13px] text-muted">@{person.username}</span>
          <SharedBadge count={person.sharedCount} />
        </div>

        {person.bio && <p className="mt-1 line-clamp-2 text-[13px] text-muted">{person.bio}</p>}

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {/* Shared interests lead, so the reason for the match is obvious. */}
          {[...person.sharedInterests, ...person.interests.filter((i) => !person.sharedInterests.includes(i))]
            .slice(0, 5)
            .map((interest) => (
              <Chip
                key={interest}
                tone={person.sharedInterests.includes(interest) ? 'shared' : undefined}
              >
                {interest}
              </Chip>
            ))}
          {person.interests.length > 5 && (
            <span className="self-center text-[12px] text-muted">
              +{person.interests.length - 5}
            </span>
          )}
        </div>
      </div>

      {action && <div className="shrink-0 self-center">{action}</div>}
    </article>
  );
}
