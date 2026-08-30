import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Dialog } from '../components/ui/Dialog.jsx';
import { Button } from '../components/ui/Button.jsx';

/**
 * Logging out is one click from the rail, the profile and settings, and it is
 * easy to hit by accident. This asks first, and keeps the wording and
 * behaviour identical wherever it is triggered from.
 *
 *   const { requestLogout, logoutDialog } = useLogoutConfirm();
 *   <Button onClick={requestLogout}>Log out</Button>
 *   {logoutDialog}
 */
export function useLogoutConfirm() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [asking, setAsking] = useState(false);

  const requestLogout = useCallback(() => setAsking(true), []);
  const cancel = useCallback(() => setAsking(false), []);

  const confirm = useCallback(() => {
    setAsking(false);
    logout();
    navigate('/', { replace: true });
  }, [logout, navigate]);

  const logoutDialog = asking ? (
    <Dialog
      title="Log out?"
      onClose={cancel}
      width="max-w-sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={cancel} autoFocus>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm}>
            <LogOut size={14} /> Log out
          </Button>
        </div>
      }
    >
      <p className="text-sm text-body">
        {user ? (
          <>
            You'll be signed out of <span className="font-medium text-heading">@{user.username}</span>{' '}
            on this device. Your chats and connections stay exactly as they are.
          </>
        ) : (
          "You'll be signed out on this device."
        )}
      </p>
    </Dialog>
  ) : null;

  return { requestLogout, logoutDialog };
}
