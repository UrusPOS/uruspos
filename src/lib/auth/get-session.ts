import { cookies } from "next/headers";
import {
  parseSessionCookie,
  SESSION_COOKIE,
  type SessionUser,
} from "@/lib/auth/session";

export function getSession(): SessionUser | null {
  const cookieStore = cookies();
  return parseSessionCookie(cookieStore.get(SESSION_COOKIE)?.value);
}
