import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';

export function JobsPaginationSkeleton() {
  return (
    <div className="flex">
      <Button asChild variant="secondary" size="icon" disabled>
        <Skeleton />
      </Button>
      <Button
        asChild
        variant="secondary"
        size="icon"
        disabled
        className="ml-auto"
      >
        <Skeleton />
      </Button>
    </div>
  );
}
