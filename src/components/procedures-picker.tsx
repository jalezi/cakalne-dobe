'use client';

import { useRouter } from 'next/navigation';
import { ComboBoxResponsive, type SelectOption } from './combo-box-responsive';

interface ProceduresPickerProps {
  options: SelectOption[];
  defaultSelected?: SelectOption;
}

export function ProceduresPicker({
  options,
  defaultSelected,
}: ProceduresPickerProps) {
  const router = useRouter();

  return (
    <ComboBoxResponsive
      asLink
      onSelect={(value) => {
        router.replace(value);
        return;
      }}
      options={options}
      placeholder="Izberi postopek"
      inputPlaceholder="Išči po imenu ali kodi postopka"
      defaultSelected={defaultSelected}
    />
  );
}
