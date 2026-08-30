import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useUsernameCheck } from '../hooks/useUsernameCheck.js';
import { api, errorMessage, fieldErrors } from '../services/api.js';
import { AuthLayout, FormError } from '../components/AuthLayout.jsx';
import { InterestPicker } from '../components/InterestPicker.jsx';
import { AvatarPicker } from '../components/AvatarPicker.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';

const MIN_INTERESTS = 3;

/** Two steps so the form never feels overwhelming (§5.2 UX notes). */
export default function Signup() {
  const { signup, patchUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: '', lastName: '', username: '', email: '',
    password: '', confirmPassword: '', bio: '',
  });
  const [interests, setInterests] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const usernameCheck = useUsernameCheck(form.username);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  /** Client-side mirror of the server rules, so errors show before a round trip. */
  function validateStepOne() {
    const next = {};
    if (!form.firstName.trim()) next.firstName = 'First name is required';
    if (!form.lastName.trim()) next.lastName = 'Last name is required';
    if (!/^[a-z0-9_]{3,24}$/.test(form.username.trim().toLowerCase())) {
      next.username = '3–24 characters: letters, numbers and underscores';
    } else if (usernameCheck.available === false) {
      next.username = 'That username is taken';
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email address';
    if (form.password.length < 8) next.password = 'At least 8 characters';
    else if (!/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      next.password = 'Include at least one letter and one number';
    }
    if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match';

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goToStepTwo(e) {
    e.preventDefault();
    setBanner('');
    if (validateStepOne()) setStep(2);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBanner('');

    if (interests.length < MIN_INTERESTS) {
      setBanner(`Pick at least ${MIN_INTERESTS} interests so we can find your people.`);
      return;
    }

    setSubmitting(true);
    try {
      await signup({
        ...form,
        username: form.username.trim().toLowerCase(),
        email: form.email.trim().toLowerCase(),
        interests,
      });

      // The avatar goes up once the account exists and we hold a token.
      if (avatarFile) {
        try {
          const body = new FormData();
          body.append('file', avatarFile);
          const { data } = await api.post('/users/me/avatar', body);
          patchUser({ profilePicture: data.user.profilePicture });
        } catch {
          // Not worth blocking the signup; they can add it from their profile.
        }
      }

      navigate('/home', { replace: true });
    } catch (err) {
      const fields = fieldErrors(err);
      setErrors(fields);
      setBanner(errorMessage(err, 'Could not create your account.'));
      // Send them back to fix a credential field if that is what failed.
      if (Object.keys(fields).some((f) => f !== 'interests')) setStep(1);
    } finally {
      setSubmitting(false);
    }
  }

  const usernameHint =
    usernameCheck.status === 'checking' ? (
      <span className="inline-flex items-center gap-1 text-muted">
        <Loader2 size={11} className="animate-spin" /> Checking…
      </span>
    ) : usernameCheck.available === true ? (
      <span className="inline-flex items-center gap-1 text-accent">
        <Check size={11} /> Available
      </span>
    ) : null;

  return (
    <AuthLayout
      wide={step === 2}
      title={step === 1 ? 'Create your account' : 'What are you into?'}
      subtitle={
        step === 1
          ? 'Step 1 of 2: the basics.'
          : `Step 2 of 2: pick at least ${MIN_INTERESTS}. This is how people find you.`
      }
      footer={
        step === 1 ? (
          <>
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </>
        ) : null
      }
    >
      <FormError>{banner}</FormError>

      {step === 1 ? (
        <form onSubmit={goToStepTwo} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First name" autoComplete="given-name" autoFocus
              value={form.firstName} onChange={set('firstName')} error={errors.firstName}
            />
            <Input
              label="Last name" autoComplete="family-name"
              value={form.lastName} onChange={set('lastName')} error={errors.lastName}
            />
          </div>

          <Input
            label="Username" autoComplete="username" placeholder="ada"
            value={form.username}
            onChange={(e) =>
              set('username')({ target: { value: e.target.value.replace(/\s/g, '').toLowerCase() } })
            }
            error={errors.username}
            hint={usernameHint}
          />

          <Input
            label="Email" type="email" autoComplete="email" placeholder="you@example.com"
            value={form.email} onChange={set('email')} error={errors.email}
            hint={!errors.email ? 'Private. Never shown on your profile.' : undefined}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Password" type="password" autoComplete="new-password"
              value={form.password} onChange={set('password')} error={errors.password}
              hint={!errors.password ? '8+ characters, with a number.' : undefined}
            />
            <Input
              label="Confirm password" type="password" autoComplete="new-password"
              value={form.confirmPassword} onChange={set('confirmPassword')}
              error={errors.confirmPassword}
            />
          </div>

          <Button type="submit" size="lg" className="w-full">
            Continue
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-7">
          <InterestPicker selected={interests} onChange={setInterests} min={MIN_INTERESTS} />

          <div className="border-t border-line pt-6">
            <AvatarPicker
              file={avatarFile}
              onChange={setAvatarFile}
              name={`${form.firstName} ${form.lastName}`}
              size="lg"
            />
          </div>

          <Textarea
            label="Bio" rows={3} maxLength={300} value={form.bio} onChange={set('bio')}
            placeholder="Optional. A line or two about you."
            hint={`${form.bio.length}/300`}
          />

          <div className="flex gap-3">
            <Button type="button" variant="secondary" size="lg" onClick={() => setStep(1)}>
              <ArrowLeft size={16} /> Back
            </Button>
            <Button
              type="submit" size="lg" loading={submitting} className="flex-1"
              disabled={interests.length < MIN_INTERESTS}
            >
              Create account
            </Button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
