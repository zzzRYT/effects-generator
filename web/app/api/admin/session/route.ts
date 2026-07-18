import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  createAdminSession,
} from "@/lib/admin/session";

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const password =
    body && typeof body === "object" && "password" in body
      ? body.password
      : undefined;
  const secret = process.env.ADMIN_SECRET;

  if (!secret) {
    return Response.json({ error: "ADMIN_SECRET 미설정" }, { status: 500 });
  }
  if (password !== secret) {
    return Response.json(
      { error: "비밀번호가 올바르지 않아요" },
      { status: 401 },
    );
  }

  (await cookies()).set(
    ADMIN_COOKIE,
    await createAdminSession(secret),
    {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ADMIN_SESSION_SECONDS,
    },
  );
  return new Response(null, { status: 204 });
}

export async function DELETE(): Promise<Response> {
  (await cookies()).delete(ADMIN_COOKIE);
  return new Response(null, { status: 204 });
}
