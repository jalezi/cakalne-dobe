'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ComboBoxResponsive,
  type ComboBoxResponsiveProps,
} from './combo-box-responsive';
import { useCallback } from 'react';

interface SelectDatasetProps {
  jobsOptions: ComboBoxResponsiveProps['options'];
  selectedJob: ComboBoxResponsiveProps['defaultSelected'];
}

export function SelectDataset({
  jobsOptions,
  selectedJob,
}: SelectDatasetProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const onSelect = useCallback(
    (value: string) => {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('job', value);
      router.replace(pathname + '?' + newSearchParams.toString());
    },
    [searchParams, router, pathname]
  );

  return (
    <ComboBoxResponsive
      options={jobsOptions ?? []}
      defaultSelected={selectedJob}
      onSelect={onSelect}
    />
  );
}
