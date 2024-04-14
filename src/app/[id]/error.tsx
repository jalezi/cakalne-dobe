'use client'; // Error components must be Client Components

import { useEffect } from 'react';
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

  const isConnectionClosed = error.message.includes('Connection closed');
  const handleClick = () => {
    // Attempt to recover by trying to re-render the segment
    if (isConnectionClosed) {
      router.refresh();
    } else {
      reset();
    }
  };

  return (
    <div>
      <h2>Nekaj je šlo narobe</h2>
      <button onClick={handleClick}>Poskusi znova</button>
    </div>
  );
}
