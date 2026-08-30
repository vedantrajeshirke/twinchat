import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../services/api.js';
import { useChat } from '../context/ChatContext.jsx';

/**
 * Connect / message actions shared by every place a person is listed:
 * search results, suggestions, profiles, member lists.
 */
export function useConnect() {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const { upsertConversation } = useChat();
  const navigate = useNavigate();

  const sendRequest = useCallback(async (userId) => {
    setBusyId(userId);
    setError('');
    try {
      await api.post('/requests', { toUserId: userId });
      return { ok: true };
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      return { ok: false, message };
    } finally {
      setBusyId(null);
    }
  }, []);

  const openChat = useCallback(
    async (userId) => {
      setBusyId(userId);
      setError('');
      try {
        const { data } = await api.post('/conversations/direct', { userId });
        upsertConversation(data.conversation);
        navigate(`/home/${data.conversation._id}`);
        return { ok: true };
      } catch (err) {
        const message = errorMessage(err);
        setError(message);
        return { ok: false, message };
      } finally {
        setBusyId(null);
      }
    },
    [navigate, upsertConversation]
  );

  return { sendRequest, openChat, busyId, error, setError };
}
