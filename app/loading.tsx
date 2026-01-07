import { Skeleton } from "@/components/ui/skeleton";

/**
 * Root loading state for the application.
 * Shown while the root layout or page is loading.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary mx-auto animate-pulse">
          <span className="text-2xl font-bold text-primary-foreground">CK</span>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-3 w-24 mx-auto" />
        </div>
      </div>
    </div>
  );
}

