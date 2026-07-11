import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminSession } from "./session";

export async function hasAdminSession(): Promise<boolean> {
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifyAdminSession(value, process.env.ADMIN_SECRET);
}
