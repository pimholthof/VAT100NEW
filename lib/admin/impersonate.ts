import { cookies } from "next/headers";

const IMPERSONATE_COOKIE = "admin_impersonate";
const IMPERSONATE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

interface ImpersonationPayload {
  userId: string;
  sessionId?: string;
  expires: number;
}

async function readCookie(): Promise<ImpersonationPayload | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(IMPERSONATE_COOKIE);
    if (!cookie?.value) return null;
    return JSON.parse(cookie.value) as ImpersonationPayload;
  } catch {
    return null;
  }
}

export async function getImpersonatedUserId(): Promise<string | null> {
  const data = await readCookie();
  if (!data) return null;
  if (data.expires && data.expires < Date.now()) return null;
  return data.userId ?? null;
}

/** Sessie-id uit de cookie, óók na expiry — zodat stop de sessie kan afsluiten. */
export async function getImpersonationSessionId(): Promise<string | null> {
  const data = await readCookie();
  return data?.sessionId ?? null;
}

/** Geïmpersoneerde gebruiker uit de cookie, ongeacht expiry (voor logging). */
export async function getImpersonationCookieUserId(): Promise<string | null> {
  const data = await readCookie();
  return data?.userId ?? null;
}

export async function setImpersonation(userId: string, sessionId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    IMPERSONATE_COOKIE,
    JSON.stringify({
      userId,
      sessionId,
      expires: Date.now() + IMPERSONATE_TIMEOUT,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: IMPERSONATE_TIMEOUT / 1000,
      path: "/",
    },
  );
}

export async function clearImpersonation(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATE_COOKIE);
}
