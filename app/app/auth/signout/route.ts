import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/** GET /auth/signout — remove a sessão e redireciona para /login */
export async function GET() {
  const cookieStore = await cookies();
  cookieStore.delete("portal_session");

  const baseUrl = process.env.AUTH0_BASE_URL ?? "http://localhost:3001";
  return NextResponse.redirect(new URL("/login", baseUrl));
}
