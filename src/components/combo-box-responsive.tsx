'use client';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export type SelectOption = {
  value: string;
  label: string;
};

export interface ComboBoxResponsiveProps {
  options: SelectOption[];
  defaultSelected?: SelectOption | null;
  onSelect?: (value: string) => void;
  asLink?: boolean;
  placeholder?: string;
  inputPlaceholder?: string;
}

export function ComboBoxResponsive({
  options,
  defaultSelected,
  onSelect,
  asLink,
  placeholder = 'Izberi',
  inputPlaceholder,
}: ComboBoxResponsiveProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [selectedOption, setSelectedOption] = useState<SelectOption | null>(
    defaultSelected ?? null
  );

  const selectedOptionLabel = selectedOption?.label ? (
    <span className="truncate">{selectedOption.label}</span>
  ) : (
    <>{placeholder}</>
  );

  const triggerButton = (
    <Button variant="outline" className="w-full justify-start">
      {selectedOptionLabel}
    </Button>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
        <PopoverContent className="max-w-full p-0" align="start">
          <OptionList
            options={options}
            setOpen={setOpen}
            setSelectedStatus={setSelectedOption}
            onSelect={onSelect}
            selectedOption={selectedOption}
            asLink={asLink}
            inputPlaceholder={inputPlaceholder}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
      <DrawerContent>
        <div className="mt-4 border-t">
          <OptionList
            options={options}
            setOpen={setOpen}
            setSelectedStatus={setSelectedOption}
            onSelect={onSelect}
            selectedOption={selectedOption}
            asLink={asLink}
            inputPlaceholder={inputPlaceholder}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

interface OptionListProps {
  options: ComboBoxResponsiveProps['options'];
  setOpen: (open: boolean) => void;
  setSelectedStatus: (option: SelectOption | null) => void;
  onSelect?: (value: string) => void;
  selectedOption?: SelectOption | null;
  asLink?: boolean;
  inputPlaceholder?: string;
}

const CheckIcon = ({ isSelected }: { isSelected?: boolean | undefined }) => {
  return (
    <span className="mr-2">
      <Check
        className={cn('h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')}
      />
    </span>
  );
};

function OptionList({
  setOpen,
  setSelectedStatus,
  options,
  onSelect,
  selectedOption,
  asLink,
  inputPlaceholder = 'Išči...',
}: OptionListProps) {
  const onSelectChange = (value: string) => {
    onSelect?.(value);
    setSelectedStatus(options.find((option) => option.value === value) || null);
    setOpen(false);
  };

  return (
    <Command
      filter={(value, search) => {
        const label = options.find((option) => option.value === value)?.label;
        const isMatch =
          label && label.toLowerCase().includes(search.toLowerCase());
        return isMatch ? 1 : 0;
      }}
    >
      <CommandInput placeholder={inputPlaceholder} typeof="search" />
      <CommandList>
        <CommandEmpty>Žal, nisem našel iskanega.</CommandEmpty>
        <CommandGroup>
          {asLink ? null : (
            <CommandItem
              key="empty"
              value=""
              onSelect={onSelectChange}
              disabled={!selectedOption}
            >
              <CheckIcon isSelected={!selectedOption} />
              Vsi
            </CommandItem>
          )}
          {options.map((option) => (
            <CommandItem
              key={option.value}
              value={option.value}
              onSelect={onSelectChange}
              disabled={option.value === selectedOption?.value}
              asChild={asLink}
            >
              {asLink ? (
                <Link href={option.value}>
                  <CheckIcon
                    isSelected={option.value === selectedOption?.value}
                  />
                  {option.label}
                </Link>
              ) : (
                <>
                  <CheckIcon
                    isSelected={option.value === selectedOption?.value}
                  />
                  {option.label}
                </>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
