'use client';

import { useParams, useSearchParams } from 'next/navigation';
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
  const params = useParams<{ id: string }>();
  const urlSearchParams = useSearchParams();

  const selectedOption = jobsOptions?.find((option) =>
    option.value.includes(params.id)
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
      defaultSelected={selectedJob ?? selectedOption}
      asLink
      placeholder="Izberi dataset"
      inputPlaceholder="Išči dataset..."
    />
  );
}
