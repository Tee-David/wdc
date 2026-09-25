import { redirect } from "next/navigation";

/* Access is part of Team and roles now; old links land on the table. */
export default function AccessPage() {
  redirect("/admin/settings/team#roles");
}
