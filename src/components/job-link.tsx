'use client';

import type { Route } from 'next';
import Link, { type LinkProps } from 'next/link';
import { useSearchParams } from 'next/navigation';
import { forwardRef } from 'react';

interface JobLinkProps extends LinkProps<Route> {
  children: React.ReactNode;
}

export const JobLink = forwardRef<HTMLAnchorElement, JobLinkProps>(
  ({ children, href, ...props }, ref) => {
    const searchParams = useSearchParams();
    const hrefWithSearchParams =
      searchParams.size > 0 ? `${href}?${searchParams.toString()}` : href;

    return (
      <Link ref={ref} href={hrefWithSearchParams as Route} {...props}>
        {children}
      </Link>
    );
  }
);

JobLink.displayName = 'JobLink';
