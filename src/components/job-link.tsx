'use client';

import Link, { type LinkProps } from 'next/link';
import { useSearchParams } from 'next/navigation';
import { forwardRef } from 'react';

interface JobLinkProps extends LinkProps {
  children: React.ReactNode;
}

export const JobLink = forwardRef<HTMLAnchorElement, JobLinkProps>(
  ({ children, href, ...props }, ref) => {
    const searchParams = useSearchParams();
    const hrefWithSearchParams =
      searchParams.size > 0 ? `${href}?${searchParams.toString()}` : href;

    return (
      <Link ref={ref} href={hrefWithSearchParams} {...props}>
        {children}
      </Link>
    );
  }
);

JobLink.displayName = 'JobLink';
