import * as React from "react"
import { format, startOfDay, startOfMonth, startOfYear, endOfDay, subDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, X } from "lucide-react"
import type { DateRange } from "react-day-picker"

export type { DateRange }

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
  className?: string
  placeholder?: string
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
  placeholder = "Selecione um intervalo",
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  const handlePreset = (preset: 'today' | 'yesterday' | '7days' | 'month' | 'year') => {
    const now = new Date()
    let from: Date
    let to: Date = endOfDay(now)

    switch (preset) {
      case 'today':
        from = startOfDay(now)
        break
      case 'yesterday':
        from = startOfDay(subDays(now, 1))
        to = endOfDay(subDays(now, 1))
        break
      case '7days':
        from = startOfDay(subDays(now, 6))
        break
      case 'month':
        from = startOfMonth(now)
        break
      case 'year':
        from = startOfYear(now)
        break
    }

    onDateRangeChange({ from, to })
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDateRangeChange(undefined)
  }

  const formatDateRange = () => {
    if (!dateRange?.from) return placeholder

    if (dateRange.to) {
      return `${format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`
    }

    return format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full lg:w-[280px] justify-start text-left font-normal",
            !dateRange && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="flex-1 truncate">{formatDateRange()}</span>
          {dateRange && (
            <X
              className="h-4 w-4 ml-2 hover:text-destructive cursor-pointer"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
        {/* Preset Buttons */}
        <div className="flex flex-col items-center gap-2 p-3 border-b">
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreset('today')}
              className="text-xs h-8"
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreset('yesterday')}
              className="text-xs h-8"
            >
              Ontem
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreset('7days')}
              className="text-xs h-8"
            >
              7 Dias
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreset('month')}
              className="text-xs h-8"
            >
              Este mês
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreset('year')}
              className="text-xs h-8"
            >
              Este ano
            </Button>
          </div>
          {dateRange && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDateRangeChange(undefined)}
              className="text-xs h-8 text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Dual Calendar */}
        <Calendar
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={onDateRangeChange}
          numberOfMonths={2}
          disabled={{ after: new Date() }}
        />
      </PopoverContent>
    </Popover>
  )
}
