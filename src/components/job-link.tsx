'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { forwardRef } from 'react';

interface JobLinkProps {
  id: string;
  children: React.ReactNode;
}

export const JobLink = forwardRef<HTMLAnchorElement, JobLinkProps>(
  ({ id, children, ...props }, ref) => {
    const searchParams = useSearchParams();
    const procedureCode = searchParams.get('procedureCode');

    return (
      <Link
        ref={ref}
        href={`/${id}${procedureCode ? `?procedureCode=${procedureCode}` : ''}`}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

JobLink.displayName = 'JobLink';
