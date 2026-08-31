import { redirect } from "next/navigation";

export default function TenantAuthLoginPage() {
  redirect("/auth/login");
}
