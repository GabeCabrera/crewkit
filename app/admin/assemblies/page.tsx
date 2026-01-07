import { redirect } from "next/navigation";

export default function AssembliesPage() {
  redirect("/admin/inventory?tab=assemblies");
}
