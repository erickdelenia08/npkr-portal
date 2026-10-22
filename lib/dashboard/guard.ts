// lib/dashboard/guard.ts
import { redirect, notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Role } from "@/generated/prisma";

export interface DashboardUser {
  id: string;
  name?: string | null;
  role: Role;
}

/**
 * Returns the current authenticated user's role or null if not logged in.
 */
export async function getRoleOrNull(): Promise<Role | null> {
  const session = await auth();
  if (!session?.user?.role) return null;
  return session.user.role as Role;
}

/**
 * Server-side role guard for Manager Pages.
 * - Unauthenticated -> redirect("/login")
 * - Wrong role (not MANAGER) -> notFound() (returns 404)
 */
export async function requireManagerPage(): Promise<DashboardUser> {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role as Role;
  if (role !== "MANAGER") {
    notFound();
  }

  return {
    id: String(session.user.id),
    name: session.user.name,
    role,
  };
}

/**
 * Server-side role guard for Route Handlers (API / CSV Export).
 * - Unauthenticated -> 401 Unauthorized
 * - Wrong role -> 403 Forbidden
 */
export async function requireManagerApi(): Promise<
  | { authorized: true; user: DashboardUser }
  | { authorized: false; response: NextResponse }
> {
  const session = await auth();

  if (!session?.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Tidak terautentikasi. Silakan login terlebih dahulu." },
        { status: 401 }
      ),
    };
  }

  const role = session.user.role as Role;
  if (role !== "MANAGER") {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Akses ditolak. Fitur ini khusus untuk Branch Manager." },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    user: {
      id: String(session.user.id),
      name: session.user.name,
      role,
    },
  };
}
