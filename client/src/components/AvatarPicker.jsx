import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Avatar } from './ui/Avatar.jsx';
import { MAX_UPLOAD_BYTES, formatBytes } from '../utils/files.js';

/**
 * Picks a local image and hands the File back to the parent, which uploads it.
 * The 1MB cap is checked here for instant feedback and again on the server (§9).
 */
export function AvatarPicker({ file, onChange, name = '', currentUrl = '', size = 'xl' }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleSelect(e) {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;

    if (!picked.type.startsWith('image/')) {
      setError('Choose an image file.');
      return;
    }
    if (picked.size > MAX_UPLOAD_BYTES) {
      setError(`That image is ${formatBytes(picked.size)}. The limit is 1MB.`);
      return;
    }
    setError('');
    onChange(picked);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar src={preview || currentUrl} name={name} size={size} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Choose a profile picture"
          className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm transition-colors hover:bg-primary-dark"
        >
          <Camera size={15} />
        </button>
      </div>

      <div className="min-w-0">
        <p className="text-[13px] font-medium text-heading">Profile picture</p>
        <p className="mt-0.5 text-xs text-muted">Optional · PNG, JPG, GIF or WebP · max 1MB</p>
        {file && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mt-1.5 inline-flex items-center gap-1 text-xs text-danger hover:underline"
          >
            <X size={12} /> Remove
          </button>
        )}
        {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={handleSelect}
        className="hidden"
      />
    </div>
  );
}
