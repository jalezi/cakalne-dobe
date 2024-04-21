import { Skeleton } from '../ui/skeleton';

export function DataTableSkeleton() {
  return (
    <>
      {/* SEARCH PROCEDURE */}{' '}
      <div>
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex flex-wrap items-center gap-y-2">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex items-center space-x-2 sm:ml-auto">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-16" />
        </div>
        <Skeleton className="ml-auto h-10 w-16 sm:ml-2" />
      </div>
      <div className="space-y-2 rounded-md border">
        {/* PAGINATION */}
        <div className="flex flex-col gap-y-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="sm:flex-1">
            <Skeleton className="h-8 w-40" />
          </div>

          <div className="flex items-center sm:space-x-6 lg:space-x-8">
            <Skeleton className="h-8 w-20" />

            <div className="ml-auto flex items-center space-x-2 sm:ml-0">
              <Skeleton className="h-8 w-8 p-0" />
              <Skeleton className="h-8 w-8 p-0" />
              <Skeleton className="h-8 w-8 p-0" />
              <Skeleton className="h-8 w-8 p-0" />
            </div>
          </div>
        </div>
        <div>
          {/* TABLE */}
          <div className="flex flex-col gap-y-2 p-2">
            <div className="flex flex-col gap-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </div>

          <div className="flex flex-col gap-y-2 p-2">
            {[...Array(10)].map((_, index) => (
              <Skeleton
                key={index}
                className="h-28 w-full sm:h-24 lg:h-16 xl:h-12"
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
