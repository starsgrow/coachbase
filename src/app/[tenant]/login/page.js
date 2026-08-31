import { redirect } from "next/navigation";

export default function TenantLoginPage() {
  redirect("/auth/login");
}
