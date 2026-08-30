import { useState } from 'react';
import { api, errorMessage } from '../../services/api.js';
import { useInterests } from '../../hooks/useInterests.js';
import { useChat } from '../../context/ChatContext.jsx';
import { Dialog } from '../ui/Dialog.jsx';
import { Button } from '../ui/Button.jsx';
import { Input, Textarea } from '../ui/Input.jsx';
import { Chip } from '../ui/Chip.jsx';
import { AvatarPicker } from '../AvatarPicker.jsx';
import { FormError } from '../AuthLayout.jsx';

/** Create a group (§5.10). The creator becomes owner and first member. */
export function CreateGroupDialog({ onClose, onCreated }) {
  const { interests, loading } = useInterests();
  const { loadConversations } = useChat();

  const [name, setName] = useState('');
  const [mainInterest, setMainInterest] = useState('');
  const [description, setDescription] = useState('');
  const [picture, setPicture] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Give your group a name.');
    if (!mainInterest) return setError('Pick the main interest for this group.');

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append('name', name.trim());
      body.append('mainInterest', mainInterest);
      if (description.trim()) body.append('description', description.trim());
      if (picture) body.append('file', picture);

      const { data } = await api.post('/groups', body);
      await loadConversations();
      onCreated?.(data.group);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      title="Create a group"
      description="Anyone can find and join it from search."
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="create-group" loading={submitting}>Create group</Button>
        </div>
      }
    >
      <FormError>{error}</FormError>

      <form id="create-group" onSubmit={submit} className="space-y-5">
        <AvatarPicker file={picture} onChange={setPicture} name={name || 'New group'} size="lg" />

        <Input
          label="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Weekend Footballers"
          maxLength={60}
          autoFocus
        />

        <div>
          <span className="mb-2 block text-[13px] font-medium text-heading">Main interest</span>
          {loading ? (
            <p className="text-[13px] text-muted">Loading interests…</p>
          ) : (
            <div className="tc-scroll flex max-h-44 flex-wrap gap-2 overflow-y-auto">
              {interests.map((interest) => (
                <Chip
                  key={interest._id}
                  selected={mainInterest === interest.name}
                  onClick={() => setMainInterest(interest.name)}
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
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this group about? Optional."
        />
      </form>
    </Dialog>
  );
}
