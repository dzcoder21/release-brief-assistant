import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AuthShell from './AuthShell';
import Button from '../components/ui/Button';
import { Field, Input } from '../components/ui/Inputs';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../services/api';

export default function Register() {
  const { user, register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: { name: '', email: '', password: '' } });

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (values) => {
    setError('');
    try {
      await registerUser(values);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not create the account.'));
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Prepare evidence-backed release briefs." footer={<>Already registered? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link></>}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && <div role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
        <Field label="Name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" autoComplete="name" {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name is too short' } })} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message} hint="At least 8 characters.">
          <Input id="password" type="password" autoComplete="new-password" {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Use at least 8 characters' } })} />
        </Field>
        <Button type="submit" className="w-full" loading={isSubmitting}>Create account</Button>
      </form>
    </AuthShell>
  );
}
