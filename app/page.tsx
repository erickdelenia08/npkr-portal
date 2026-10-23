import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role === "ADMIN") {
    redirect("/admin/dashboard");
  }
  if (role === "MANAGER") {
    redirect("/manager/dashboard");
  }
  redirect("/marketing/dashboard");
}
