import { redirect } from "next/navigation";

/**
 * `/` is the app entry point and forward to the meters list, which is the
 * primary destination. It is a server component so the redirect costs no
 * client JavaScript.
 */
export default function Home(): never {
  redirect("/meters");
}
