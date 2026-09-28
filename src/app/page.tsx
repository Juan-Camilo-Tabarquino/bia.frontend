import { redirect } from "next/navigation";

/**
 * `/` is the app entry point and forwards to the dashboard, which is the first
 * screen after login in the demo flow. It is a server component so the redirect
 * costs no client JavaScript.
 */
export default function Home(): never {
  redirect("/dashboard");
}
