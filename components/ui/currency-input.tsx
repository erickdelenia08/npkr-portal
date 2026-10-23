"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: number | null
  onChange?: (value: number) => void
  prefix?: string
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, prefix = "Rp", disabled, ...props }, ref) => {
    const formatDisplay = (num: number | null | undefined): string => {
      if (num === null || num === undefined || isNaN(num)) return ""
      return new Intl.NumberFormat("id-ID").format(num)
    }

    const [displayValue, setDisplayValue] = React.useState<string>(() => formatDisplay(value))

    React.useEffect(() => {
      setDisplayValue(formatDisplay(value))
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      // Strip everything except digits
      const digits = raw.replace(/\D/g, "")
      if (!digits) {
        setDisplayValue("")
        onChange?.(0)
        return
      }

      const num = parseInt(digits, 10)
      setDisplayValue(new Intl.NumberFormat("id-ID").format(num))
      onChange?.(num)
    }

    return (
      <div className="relative flex items-center w-full">
        {prefix && (
          <span className="absolute left-3 text-sm font-medium text-muted-foreground select-none pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={displayValue}
          onChange={handleChange}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-background py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            prefix ? "pl-9 pr-3" : "px-3",
            className
          )}
          {...props}
        />
      </div>
    )
  }
)

CurrencyInput.displayName = "CurrencyInput"
