'use client';

import { useParams } from 'next/navigation';
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
  const params = useParams();

  const selectedOption = jobsOptions?.find(
    (option) => option.value === `/${params.id}`
  );

  return (
    <ComboBoxResponsive
      key={selectedOption?.value}
      options={jobsOptions ?? []}
      defaultSelected={selectedJob ?? selectedOption}
      asLink
      placeholder="Izberi dataset"
      inputPlaceholder="Išči dataset..."
    />
  );
}
