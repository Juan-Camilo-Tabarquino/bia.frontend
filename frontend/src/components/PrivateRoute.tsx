import React, { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

interface PrivateRouteProps {
  children: ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const { token } = useAuth();
  const router = useRouter();

  // If not authenticated, redirect to login page (assume /login exists)
  if (!token) {
    // Perform client‑side redirect. This runs only on client because "use client" is implicit in components.
    if (typeof window !== 'undefined') {
      router.push('/login');
    }
    return null;
  }

  return <>{children}</>;
}
