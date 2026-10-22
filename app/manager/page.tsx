// app/manager/page.tsx
import { redirect } from "next/navigation";

export default function ManagerRootPage() {
  redirect("/manager/dashboard");
}
