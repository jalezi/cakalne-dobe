'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ComboBoxResponsive,
  type ComboBoxResponsiveProps,
} from './combo-box-responsive';

interface SelectDatasetProps {
  jobsOptions: ComboBoxResponsiveProps['options'];
  selectedJob?: ComboBoxResponsiveProps['defaultSelected'];
}

export function SelectDataset({
  jobsOptions,
  selectedJob,
}: SelectDatasetProps) {
  const params = useParams<{ day: string }>();
  const urlSearchParams = useSearchParams();
  const router = useRouter();

  const selectedOption = jobsOptions?.find((option) =>
    option.value.includes(params.day)
  );

  const jobOptionsWithSearchParam = jobsOptions?.map((option) => {
    const hasSearchParams = urlSearchParams.size > 0 ? urlSearchParams : null;

    return {
      value: `${option.value}${hasSearchParams ? `?${urlSearchParams.toString()}` : ''}`,
      label: option.label,
    };
  });

  return (
    <ComboBoxResponsive
      key={selectedOption?.value}
      options={jobOptionsWithSearchParam ?? []}
      onSelect={(value) => {
        router.replace(value);
        return;
      }}
      defaultSelected={selectedJob ?? selectedOption}
      asLink
      placeholder="Izberi dataset"
      inputPlaceholder="Išči dataset..."
    />
  );
}
