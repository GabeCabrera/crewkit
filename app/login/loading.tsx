import { Skeleton } from "@/components/ui/skeleton";

export default function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-12">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-xl">
        <div className="space-y-1 text-center pb-8">
          <Skeleton className="h-12 w-12 mx-auto rounded-lg" />
          <Skeleton className="h-8 w-48 mx-auto mt-4" />
          <Skeleton className="h-4 w-56 mx-auto mt-2" />
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-11 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-11 w-full" />
          </div>
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </div>
  );
}

