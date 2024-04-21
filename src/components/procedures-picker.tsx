'use client';

import { useRouter } from 'next/navigation';
import { ComboBoxResponsive } from './combo-box-responsive';

const SEARCH_PARAMS = {
  procedureCode: 'procedureCode',
} as const;

interface ProceduresPickerProps {
  procedures: {
    code: string;
    name: string;
  }[];
  currentProcedureCode: string | undefined;
  pathname: string;
  urlSearchParams: URLSearchParams;
}

export function ProceduresPicker({
  procedures,
  currentProcedureCode,
  pathname,
  urlSearchParams,
}: ProceduresPickerProps) {
  const router = useRouter();
  const procedureOptions = procedures.sort().map((value) => {
    const newUrlSearchParams = new URLSearchParams(urlSearchParams);
    newUrlSearchParams.set(SEARCH_PARAMS.procedureCode, value.code);
    return {
      value: `${pathname}?${newUrlSearchParams.toString()}`,
      label: `${value.code} - ${value.name}`,
    };
  });

  return (
    <ComboBoxResponsive
      asLink
      onSelect={(value) => {
        router.replace(value);
        return;
      }}
      options={procedureOptions}
      placeholder="Izberi postopek"
      inputPlaceholder="Išči po imenu ali kodi postopka"
      defaultSelected={procedureOptions.find((option) => {
        const optionProcedureCode = option.value.split('=').pop();
        return optionProcedureCode === currentProcedureCode;
      })}
    />
  );
}
