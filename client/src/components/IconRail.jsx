import { NavLink, useNavigate } from 'react-router-dom';
import { MessagesSquare, Search, Bell, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useChat } from '../context/ChatContext.jsx';
import { LogoMark } from './Logo.jsx';
import { Avatar } from './ui/Avatar.jsx';
import { cn } from '../utils/cn.js';

function RailButton({ to, icon: Icon, label, badge, onClick, children }) {
  const content = (active) => (
    <span
      className={cn(
        'group relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
        active ? 'bg-white/12 text-rail-icon-active' : 'text-rail-icon hover:bg-white/8 hover:text-rail-icon-active'
      )}
    >
      {children ?? <Icon size={20} strokeWidth={1.9} />}
      {badge > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white"
          aria-label={`${badge} unread`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {/* Tooltip: the rail is icon-only, so every target needs a name. */}
      <span className="pointer-events-none absolute left-full z-30 ml-2 hidden whitespace-nowrap rounded-md bg-rail px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 md:block">
        {label}
      </span>
    </span>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={label} className="block">
        {content(false)}
      </button>
    );
  }

  return (
    <NavLink to={to} aria-label={label} className="block">
      {({ isActive }) => content(isActive)}
    </NavLink>
  );
}

/** Narrow left rail, the app's primary navigation (PROJECT_PLAN §5.4A). */
export function IconRail() {
  const { user, logout } = useAuth();
  const { requestCount, totalUnread } = useChat();
  const navigate = useNavigate();

  return (
    <nav
      aria-label="Main"
      className="flex w-[68px] shrink-0 flex-col items-center gap-1 bg-rail py-4"
    >
      <NavLink to="/home" aria-label="TwinChat home" className="mb-3">
        <LogoMark size={26} />
      </NavLink>

      <RailButton to="/home" icon={MessagesSquare} label="Chats" badge={totalUnread} />
      <RailButton to="/search" icon={Search} label="Find people & groups" />
      <RailButton to="/requests" icon={Bell} label="Requests" badge={requestCount} />
      <RailButton to="/profile" icon={User} label="Your profile">
        <Avatar
          src={user?.profilePicture}
          name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`}
          size={26}
        />
      </RailButton>

      <div className="flex-1" />

      <RailButton to="/settings" icon={Settings} label="Settings" />
      <RailButton
        icon={LogOut}
        label="Log out"
        onClick={() => {
          logout();
          navigate('/', { replace: true });
        }}
      />
    </nav>
  );
}
