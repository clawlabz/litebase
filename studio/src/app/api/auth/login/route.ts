import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { StudioRole } from "@/lib/demo";

const SESSION_COOKIE = "litebase_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const DEMO_USERNAME = "demo";
const DEMO_PASSWORD = "demo123";

interface LoginRequest {
  readonly username?: string;
  readonly password?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as LoginRequest;
  const { username, password } = body;

  if (!password) {
    return NextResponse.json(
      { error: "Password is required" },
      { status: 401 },
    );
  }

  let role: StudioRole;

  // Check demo account first
  if (username === DEMO_USERNAME && password === DEMO_PASSWORD) {
    role = "viewer";
  } else {
    // Admin login: any username + STUDIO_PASSWORD
    const studioPassword = process.env.STUDIO_PASSWORD;

    if (!studioPassword) {
      return NextResponse.json(
        { error: "STUDIO_PASSWORD environment variable is not configured" },
        { status: 500 },
      );
    }

    if (password !== studioPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    role = "admin";
  }

  // Encode role + token into the session cookie
  const sessionPayload = JSON.stringify({
    role,
    token: crypto.randomUUID(),
  });
  const sessionValue = Buffer.from(sessionPayload).toString("base64");

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return NextResponse.json({ success: true, role });
}
