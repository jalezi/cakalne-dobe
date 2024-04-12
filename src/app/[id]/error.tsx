'use client'; // Error components must be Client Components

import { useEffect } from 'react';

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

  return (
    <div>
      <h2>Nekaj je šlo narobe</h2>
      <button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => (isConnectionClosed ? document.location.reload() : reset())
        }
      >
        Poskusi znova
      </button>
    </div>
  );
}
