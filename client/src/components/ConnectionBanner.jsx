import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useSocket } from '../context/SocketContext.jsx';

/**
 * Only shown once a disconnect has actually persisted. A brief blip during
 * the initial handshake (or a Render cold start) shouldn't flash a warning.
 */
export function ConnectionBanner() {
  const { connected } = useSocket();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (connected) {
      setShow(false);
      return;
    }
    const timer = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(timer);
  }, [connected]);

  if (!show) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-danger-soft px-4 py-1.5 text-xs text-danger"
    >
      <WifiOff size={13} />
      Reconnecting. Live updates are paused.
    </div>
  );
}
