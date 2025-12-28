import { Skeleton } from "@/components/ui/skeleton";

interface KPICardSkeletonProps {
  count?: number;
}

export function KPICardSkeleton({ count = 5 }: KPICardSkeletonProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="text-center p-4 rounded-xl bg-muted/20 border border-border/50"
        >
          <Skeleton className="h-7 w-24 mx-auto mb-2" />
          <Skeleton className="h-4 w-16 mx-auto mb-1" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
      ))}
    </div>
  );
}

export function BreakdownSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div 
          key={i} 
          className="text-center p-4 rounded-xl bg-muted/20 border border-border/50"
        >
          <Skeleton className="h-6 w-20 mx-auto mb-2" />
          <Skeleton className="h-3 w-16 mx-auto mb-1" />
          <Skeleton className="h-2 w-24 mx-auto" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="h-[320px] w-full flex items-end justify-center gap-2 px-4 pb-8">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2">
          <Skeleton 
            className="w-full rounded-t-md" 
            style={{ height: `${Math.random() * 150 + 50}px` }} 
          />
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>
  );
}

export function RankingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div 
          key={i} 
          className="flex items-center justify-between p-3 rounded-lg bg-muted/20"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div>
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function AcquirerSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div 
          key={i} 
          className="p-4 rounded-xl bg-muted/20 border border-border/50"
        >
          <div className="flex justify-between items-center mb-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-10" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
