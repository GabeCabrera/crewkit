import { redirect } from "next/navigation";

export default function EquipmentPage() {
  redirect("/admin/inventory?tab=equipment");
}
