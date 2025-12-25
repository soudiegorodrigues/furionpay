import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const OrderBumpSkeleton = memo(function OrderBumpSkeleton() {
  return (
    <Card className="animate-fade-in">
      <CardContent className="p-6">
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div 
              key={i} 
              className="flex items-center gap-4 p-4 rounded-lg border"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* Grip icon skeleton */}
              <Skeleton className="w-5 h-5 rounded flex-shrink-0" />
              
              {/* Image skeleton */}
              <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
              
              {/* Content skeleton */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <Skeleton className="h-3 w-48" />
              </div>
              
              {/* Actions skeleton */}
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-11 rounded-full" />
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
