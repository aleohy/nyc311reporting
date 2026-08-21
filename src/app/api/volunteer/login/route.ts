import { NextResponse } from "next/server";

import { createVolunteerToken, VOLUNTEER_COOKIE, volunteerAuthConfigured } from "@/lib/volunteer-auth";

export async function POST(request: Request) {
  if (!volunteerAuthConfigured()) {
    return NextResponse.json(
      { error: "Set VOLUNTEER_PASSWORD in .env.local to enable the volunteer dashboard." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { password?: string };
  const token = createVolunteerToken(body.password || "");

  if (!token) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(VOLUNTEER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(VOLUNTEER_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
