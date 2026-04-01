import { cookies } from "next/headers";

const IMPERSONATE_COOKIE = "admin_impersonate";
const IMPERSONATE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export async function getImpersonatedUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(IMPERSONATE_COOKIE);
    if (!cookie?.value) return null;

    const data = JSON.parse(cookie.value);
    if (data.expires && data.expires < Date.now()) {
      return null;
    }
    return data.userId ?? null;
  } catch {
    return null;
  }
}

export async function setImpersonation(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATE_COOKIE, JSON.stringify({
    userId,
    expires: Date.now() + IMPERSONATE_TIMEOUT,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: IMPERSONATE_TIMEOUT / 1000,
    path: "/",
  });
}

export async function clearImpersonation(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATE_COOKIE);
}
