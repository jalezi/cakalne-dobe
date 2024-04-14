'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { revalidatePathId } from '@/actions/revalidate-tag';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  const isConnectionClosed = error.message.includes('Connection closed');
  const handleClick = async () => {
    // Attempt to recover by trying to re-render the segment
    if (isConnectionClosed) {
      await revalidatePathId();
      document.location.reload();
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
