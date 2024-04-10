'use client';

export function Time({ time }: { time: string }) {
  return (
    <time dateTime={time}>
      {new Date(time).toLocaleString('sl-SI', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      })}
    </time>
  );
}
