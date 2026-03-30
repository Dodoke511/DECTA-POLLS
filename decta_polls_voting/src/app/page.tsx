import { redirect } from "next/navigation";

export default function Home() {
  // Ensure visiting `/` takes you directly to the SuperAdmin tenants screen.
  redirect("/users/super_admin/tenants");
}
