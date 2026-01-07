import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Wrapper for skeleton content with fast fade-in
function SkeletonWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="skeleton-fade-in">
      {children}
    </div>
  );
}

// Dashboard skeleton with stat cards and quick action cards
export function DashboardSkeleton() {
  return (
    <SkeletonWrapper>
      <div className="space-y-12">
        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-6 w-80" />
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-4 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-5 w-56" />
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <Skeleton className="h-10 w-10 rounded-lg mb-2" />
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-4 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </SkeletonWrapper>
  );
}

// Table page skeleton with header and table
export function TablePageSkeleton() {
  return (
    <SkeletonWrapper>
      <div className="space-y-6">
        {/* Header with title and action button */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-56 mb-2" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>

        {/* Table Card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-1" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            {/* Table Header */}
            <div className="border-b pb-3 mb-4">
              <div className="grid grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </div>
            {/* Table Rows */}
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-6 gap-4 py-4 border-b last:border-0">
                {[...Array(6)].map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </SkeletonWrapper>
  );
}

// Simple page skeleton with header and content area
export function SimplePageSkeleton() {
  return (
    <SkeletonWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>

        {/* Content Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SkeletonWrapper>
  );
}

// Metrics/Analytics page skeleton
export function MetricsSkeleton() {
  return (
    <SkeletonWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Skeleton className="h-9 w-32 mb-2" />
          <Skeleton className="h-5 w-56" />
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SkeletonWrapper>
  );
}

// Settings page skeleton
export function SettingsSkeleton() {
  return (
    <SkeletonWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Skeleton className="h-9 w-32 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>

        {/* Settings Sections */}
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-9 w-24" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </SkeletonWrapper>
  );
}

// Field/Mobile-friendly page skeleton
export function FieldPageSkeleton() {
  return (
    <SkeletonWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-5 w-56" />
        </div>

        {/* Action Cards */}
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 py-4">
                <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-8 w-8" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SkeletonWrapper>
  );
}

// Content wrapper that fades in when data loads
export function PageContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="content-fade-in">
      {children}
    </div>
  );
}
