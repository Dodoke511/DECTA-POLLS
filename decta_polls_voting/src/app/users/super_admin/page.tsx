import { redirect } from "next/navigation";

export default function SuperAdminRoot() {
  redirect("/users/super_admin/tenants");
}