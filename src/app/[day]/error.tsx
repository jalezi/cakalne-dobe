'use client'; // Error components must be Client Components

import { startTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  function refreshAndReset() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <div>
      <h2>Nekaj je šlo narobe</h2>
      <button onClick={refreshAndReset}>Poskusi znova</button>
    </div>
  );
}
