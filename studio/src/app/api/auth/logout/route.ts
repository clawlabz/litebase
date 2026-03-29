import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const SESSION_COOKIE = "litebase_session";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);

  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"));
}
