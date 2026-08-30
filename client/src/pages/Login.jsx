import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage, fieldErrors } from '../services/api.js';
import { AuthLayout, FormError } from '../components/AuthLayout.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ identifier: '', password: '' });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setBanner('');
    setErrors({});
    setSubmitting(true);
    try {
      await login(form.identifier.trim(), form.password);
      navigate(location.state?.from?.pathname || '/home', { replace: true });
    } catch (err) {
      setErrors(fieldErrors(err));
      setBanner(errorMessage(err, 'Could not log you in.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to pick up your conversations."
      footer={
        <>
          New here?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <FormError>{banner}</FormError>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Email or username"
          autoComplete="username"
          autoFocus
          value={form.identifier}
          onChange={set('identifier')}
          error={errors.identifier}
          placeholder="ada or ada@example.com"
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          placeholder="••••••••"
        />

        <Button type="submit" size="lg" loading={submitting} className="w-full">
          Log In
        </Button>
      </form>
    </AuthLayout>
  );
}
