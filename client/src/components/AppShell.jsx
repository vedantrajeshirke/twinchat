import { Outlet } from 'react-router-dom';
import { IconRail } from './IconRail.jsx';
import { SocketProvider } from '../context/SocketContext.jsx';
import { ChatProvider } from '../context/ChatContext.jsx';
import { ConnectionBanner } from './ConnectionBanner.jsx';

/** Rail + routed region. Everything inside shares one socket and chat store. */
export default function AppShell() {
  return (
    <SocketProvider>
      <ChatProvider>
        <div className="flex h-dvh overflow-hidden bg-canvas">
          <IconRail />
          <div className="flex min-w-0 flex-1 flex-col">
            <ConnectionBanner />
            <div className="min-h-0 flex-1">
              <Outlet />
            </div>
          </div>
        </div>
      </ChatProvider>
    </SocketProvider>
  );
}
