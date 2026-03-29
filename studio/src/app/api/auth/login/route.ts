import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const SESSION_COOKIE = "litebase_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body as { password?: string };

  const studioPassword = process.env.STUDIO_PASSWORD;

  if (!studioPassword) {
    return NextResponse.json(
      { error: "STUDIO_PASSWORD environment variable is not configured" },
      { status: 500 }
    );
  }

  if (!password || password !== studioPassword) {
    return NextResponse.json(
      { error: "Invalid password" },
      { status: 401 }
    );
  }

  // Generate a simple session token
  const sessionToken = Buffer.from(
    `${Date.now()}:${crypto.randomUUID()}`
  ).toString("base64");

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return NextResponse.json({ success: true });
}
