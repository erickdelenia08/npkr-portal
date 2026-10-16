"use server";

import { signOut } from "@/auth";

/**
 * Server action to log out the current user session
 * and redirect to the login page.
 */
export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
