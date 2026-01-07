import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Redirect based on role
  if (session.user.role === "SUPERUSER" || session.user.role === "ADMIN") {
    redirect("/admin");
  } else if (session.user.role === "MANAGER") {
    redirect("/manager");
  } else {
    redirect("/field");
  }
}


