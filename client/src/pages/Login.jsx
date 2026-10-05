import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AuthShell from './AuthShell';
import Button from '../components/ui/Button';
import { Field, Input } from '../components/ui/Inputs';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../services/api';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: { email: '', password: '' } });

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (values) => {
    setError('');
    try {
      await login(values);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not sign in.'));
    }
  };

  return (
    <AuthShell title="Sign in" subtitle="Continue to your release workspace." footer={<>New here? <Link to="/register" className="font-medium text-primary hover:underline">Create an account</Link></>}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && <div role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register('email', { required: 'Email is required' })} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" {...register('password', { required: 'Password is required' })} />
        </Field>
        <Button type="submit" className="w-full" loading={isSubmitting}>Sign in</Button>
      </form>
      <p className="mt-4 rounded-md bg-subtle px-3 py-2 text-xs text-muted">Demo account (after seeding): demo@example.com / Demo@12345</p>
    </AuthShell>
  );
}
