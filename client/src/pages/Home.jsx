import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useChat } from '../context/ChatContext.jsx';
import { ConversationList } from '../components/chat/ConversationList.jsx';
import { ChatWindow } from '../components/chat/ChatWindow.jsx';
import { cn } from '../utils/cn.js';

/**
 * Three-region shell (§5.4). The rail lives in AppShell; this page owns the
 * conversation list and the chat window. On narrow screens only one of the two
 * is shown: the list, or the open thread.
 */
export default function Home() {
  const { conversationId } = useParams();
  const { conversations } = useChat();

  const active = useMemo(
    () => conversations.find((c) => c._id === conversationId) ?? null,
    [conversations, conversationId]
  );

  return (
    <div className="flex h-full min-h-0">
      <div className={cn('min-h-0 w-full md:w-auto', 'md:flex')}>
        <ConversationList />
      </div>

      <div className={cn('min-h-0 min-w-0 flex-1', !conversationId && 'hidden md:flex')}>
        <ChatWindow conversation={active} />
      </div>
    </div>
  );
}
