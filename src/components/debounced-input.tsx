'use client';

import { useDebouncedCallback } from 'use-debounce';

import type { InputProps } from './ui/input';
import { Input } from './ui/input';

export type DebouncedInputProps = InputProps & {
  debounceTime?: number;
};

export function DebouncedInput({
  onChange,
  debounceTime = 300,
  ...props
}: DebouncedInputProps) {
  if (!onChange) {
    throw new Error('onChange is required');
  }

  const debounced = useDebouncedCallback((e) => onChange(e), debounceTime);

  return (
    <Input
      {...props}
      onChange={(e) => {
        debounced(e);
      }}
    />
  );
}
