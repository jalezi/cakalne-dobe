'use client'; // Error components must be Client Components

import { useRouter } from 'next/navigation';
import { startTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
  }, [error]);

  function refreshAndReset() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <main className="flex flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <p className="text-muted-foreground text-7xl font-bold">500</p>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Nekaj je šlo narobe</h2>
        <p className="text-muted-foreground">
          Prišlo je do nepričakovane napake. Prosimo, poskusite znova.
        </p>
        {error.digest && (
          <p className="text-muted-foreground font-mono text-xs">
            ID napake: {error.digest}
          </p>
        )}
      </div>
      <Button onClick={refreshAndReset}>Poskusi znova</Button>
    </main>
  );
}
