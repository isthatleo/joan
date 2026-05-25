"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { currencyOptions, getCurrencyOption } from "@/lib/reference-data";

type CurrencySelectProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function CurrencySelect({
  value,
  onChange,
  placeholder = "Select currency",
  disabled = false,
  className,
}: CurrencySelectProps) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => getCurrencyOption(value), [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60",
            className
          )}
        >
          <span className={cn("truncate text-left", !selected && "text-muted-foreground")}>
            {selected ? `${selected.code} - ${selected.name}` : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <div className="border-b border-border px-3 py-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <CommandInput placeholder="Search currency by code or name" className="h-9" />
            </div>
          </div>
          <CommandList>
            <CommandEmpty>No currency found.</CommandEmpty>
            {currencyOptions.map((option) => (
              <CommandItem
                key={option.code}
                value={`${option.code} ${option.name}`}
                onSelect={() => {
                  onChange(option.code);
                  setOpen(false);
                }}
                className="flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{option.code}</span>
                  <span className="text-xs text-muted-foreground">{option.name}</span>
                </div>
                {option.code === value ? <Check className="h-4 w-4 text-primary" /> : null}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
