'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { ComboBoxResponsive, type SelectOption } from './combo-box-responsive';

interface ProceduresPickerProps {
  id?: string;
  options: SelectOption[];
  defaultSelected?: SelectOption;
}

export function ProceduresPicker({
  id,
  options,
  defaultSelected,
}: ProceduresPickerProps) {
  const router = useRouter();

  return (
    <ComboBoxResponsive
      id={id}
      asLink
      onSelect={(value) => {
        router.replace(value as Route);
        return;
      }}
      options={options}
      placeholder="Izberi postopek"
      inputPlaceholder="Išči po imenu ali kodi postopka"
      defaultSelected={defaultSelected}
    />
  );
}
