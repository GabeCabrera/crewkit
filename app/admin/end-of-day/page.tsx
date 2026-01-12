"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminEndOfDayPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the unified reports page with submit tab
    router.replace("/admin/reports?tab=submit");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
}
