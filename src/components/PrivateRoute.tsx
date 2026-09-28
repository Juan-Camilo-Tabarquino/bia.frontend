"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useSession } from "../features/auth/session";

/**
 * Route guard for the demo's authenticated area.
 *
 * With no valid session it redirects to `/login`; otherwise it renders its
 * children. It deliberately skips `/login` itself, so mounting it above the
 * whole shell can never produce a redirect loop.
 *
 * It renders nothing until `useSession` has read storage, and it redirects
 * from an effect rather than during render: the server render has no
 * `localStorage`, so deciding "logged out" before `ready` would bounce a
 * signed-in user on hydration.
 *
 * This is a UX flow, not a security boundary: the API does not validate the
 * token, so the guard only keeps an unauthenticated visitor out of the demo
 * screens.
 */
export default function PrivateRoute({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, ready } = useSession();

  const isLoginRoute = pathname === "/login";
  const allowed = isLoginRoute || session !== null;

  useEffect(() => {
    if (ready && !allowed) {
      router.replace("/login");
    }
  }, [ready, allowed, router]);

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
