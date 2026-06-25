"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: string;
  onChange?: (value: string) => void;
  error?: boolean;
}

const COUNTRY_CODES = [
  { code: "+91", label: "🇮🇳 +91" },
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+61", label: "🇦🇺 +61" },
  { code: "+81", label: "🇯🇵 +81" },
  { code: "+971", label: "🇦🇪 +971" },
];

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = "", onChange, error, ...props }, ref) => {
    const [countryCode, setCountryCode] = React.useState("+91");
    const [phoneNumber, setPhoneNumber] = React.useState("");

    React.useEffect(() => {
      if (value) {
        const matchedCode = COUNTRY_CODES.find((c) => value.startsWith(c.code));
        if (matchedCode) {
          setCountryCode(matchedCode.code);
          setPhoneNumber(value.slice(matchedCode.code.length));
        } else {
          if (value.startsWith("+")) {
            const split = value.match(/^(\+\d{1,4})(.*)$/);
            if (split) {
              setCountryCode(split[1]);
              setPhoneNumber(split[2]);
            } else {
              setPhoneNumber(value);
            }
          } else {
            setPhoneNumber(value);
          }
        }
      } else {
        setPhoneNumber("");
      }
    }, [value]);

    const handleCodeChange = (code: string | null) => {
      const newCode = code || "+91";
      setCountryCode(newCode);
      if (onChange) {
        onChange(`${newCode}${phoneNumber}`);
      }
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newNumber = e.target.value.replace(/\D/g, ""); // Only allow digits
      setPhoneNumber(newNumber);
      if (onChange) {
        onChange(`${countryCode}${newNumber}`);
      }
    };

    return (
      <div className={cn("flex w-full", className)}>
        <Select value={countryCode} onValueChange={handleCodeChange}>
          <SelectTrigger 
            className={cn(
              "w-[100px] rounded-r-none border-r-0 bg-muted/20 focus:ring-0 focus:ring-offset-0",
              error ? "border-destructive text-destructive" : ""
            )}
            tabIndex={-1}
          >
            <SelectValue placeholder="+91" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_CODES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          {...props}
          ref={ref}
          type="tel"
          value={phoneNumber}
          onChange={handleNumberChange}
          className={cn(
            "rounded-l-none focus-visible:ring-offset-0 focus-visible:ring-1",
            error ? "border-destructive focus-visible:ring-destructive" : ""
          )}
          placeholder="XXXXXXXXXX"
        />
      </div>
    );
  }
);
PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
