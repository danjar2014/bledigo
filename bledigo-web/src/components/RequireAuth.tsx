'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { Spinner } from './ui';

export default function RequireAuth({
  roles,
  children,
}: {
  roles?: string[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/connexion');
  }, [loading, user, router]);

  if (loading) return <Spinner />;
  if (!user) return <Spinner label="Redirection..." />;

  if (roles && !roles.includes(user.role)) {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="bg-white rounded-bledi p-8 text-center shadow-bledi">
          <h1 className="font-display font-semibold text-xl mb-2">Acces reserve</h1>
          <p className="text-slate">
            Cette section est reservee aux roles : {roles.join(', ')}. Vous etes connecte en tant que{' '}
            <strong>{user.role}</strong>.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
