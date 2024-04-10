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
import { useState } from 'react';

type SelectOption = {
  value: string;
  label: string;
};

export interface ComboBoxResponsiveProps {
  options: SelectOption[];
  defaultSelected?: SelectOption | null;
  onSelect?: (value: string) => void;
}

export function ComboBoxResponsive({
  options,
  defaultSelected,
  onSelect,
}: ComboBoxResponsiveProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [selectedOption, setSelectedOption] = useState<SelectOption | null>(
    defaultSelected ?? null
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[22ch] justify-start">
            {!!selectedOption?.label ? (
              <>{selectedOption.label}</>
            ) : (
              <>Izberi dataset</>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <OptionList
            options={options}
            setOpen={setOpen}
            setSelectedStatus={setSelectedOption}
            onSelect={onSelect}
            selectedOption={selectedOption}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="min-w-[22ch] justify-start">
          {!!selectedOption?.label ? (
            <>{selectedOption.label}</>
          ) : (
            <>Izberi dataset</>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mt-4 border-t">
          <OptionList
            options={options}
            setOpen={setOpen}
            setSelectedStatus={setSelectedOption}
            onSelect={onSelect}
            selectedOption={selectedOption}
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
}

function OptionList({
  setOpen,
  setSelectedStatus,
  options,
  onSelect,
  selectedOption,
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
      <CommandInput placeholder="Išči dataset..." />
      <CommandList>
        <CommandEmpty>Žal, nisem našel iskanega.</CommandEmpty>
        <CommandGroup>
          {options.map((option) => (
            <CommandItem
              key={option.value}
              value={option.value}
              onSelect={onSelectChange}
              disabled={option.value === selectedOption?.value}
            >
              <Check
                className={cn(
                  'mr-2 h-4 w-4',
                  option.value === selectedOption?.value
                    ? 'opacity-100'
                    : 'opacity-0'
                )}
              />
              {option.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
