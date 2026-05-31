"use client";

import PhoneInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import labels from "react-phone-number-input/locale/en";
import { cn } from "@/lib/utils";

type PhoneNumberInputProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  defaultCountry?: any;
  className?: string;
  id?: string;
  name?: string;
};

export function PhoneNumberInput({
  value,
  onChange,
  placeholder = "Enter phone number",
  disabled = false,
  required = false,
  defaultCountry = "UG",
  className,
  id,
  name,
}: PhoneNumberInputProps) {
  return (
    <PhoneInput
      id={id}
      name={name}
      international
      defaultCountry={defaultCountry}
      countryCallingCodeEditable={false}
      flags={flags}
      labels={labels}
      value={value || undefined}
      onChange={(next) => onChange(next || "")}
      disabled={disabled}
      required={required}
      placeholder={placeholder}
      className={cn("phone-field", className)}
    />
  );
}
