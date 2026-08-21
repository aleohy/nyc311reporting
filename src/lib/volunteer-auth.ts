import { cookies } from "next/headers";
import crypto from "crypto";

export const VOLUNTEER_COOKIE = "nyc_volunteer_session";

function expectedToken(): string | null {
  const password = process.env.VOLUNTEER_PASSWORD;
  if (!password) {
    return null;
  }
  return crypto.createHash("sha256").update(`nyc-volunteer:${password}`).digest("hex");
}

export function createVolunteerToken(password: string): string | null {
  const configured = process.env.VOLUNTEER_PASSWORD;
  if (!configured || password !== configured) {
    return null;
  }
  return crypto.createHash("sha256").update(`nyc-volunteer:${configured}`).digest("hex");
}

export async function isVolunteerAuthenticated(): Promise<boolean> {
  const expected = expectedToken();
  if (!expected) {
    return false;
  }

  const jar = await cookies();
  return jar.get(VOLUNTEER_COOKIE)?.value === expected;
}

export function volunteerAuthConfigured(): boolean {
  return Boolean(process.env.VOLUNTEER_PASSWORD);
}
