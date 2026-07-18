import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/admin/session";

export async function proxy(request: NextRequest) {
  const valid = await verifyAdminSession(
    request.cookies.get(ADMIN_COOKIE)?.value,
    process.env.ADMIN_SECRET,
  );
  if (valid) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return Response.json({ error: "인증 필요" }, { status: 401 });
  }

  const login = new URL("/admin/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/((?!login).*)", "/lab/:path*", "/api/lab/:path*"],
};
