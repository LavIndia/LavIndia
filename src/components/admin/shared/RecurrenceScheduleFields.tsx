"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { css, cx } from "styled-system/css";

export type RecurrenceValue = {
  isRecurring: boolean;
  recurrenceType: string;
  recurrenceDaysOfWeek: number[];
  recurrenceDayOfMonth: number;
  recurrenceStartTime: string;
  recurrenceEndTime: string;
};

export const defaultRecurrenceValue = (): RecurrenceValue => ({
  isRecurring: false,
  recurrenceType: "WEEKLY",
  recurrenceDaysOfWeek: [],
  recurrenceDayOfMonth: 1,
  recurrenceStartTime: "",
  recurrenceEndTime: "",
});

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const fieldGroup = css({ display: "flex", flexDirection: "column", gap: "2" });
const grid2 = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "4",
  sm: { gridTemplateColumns: "1fr 1fr" },
});

export function RecurrenceScheduleFields({
  value,
  onChange,
  description,
}: {
  value: RecurrenceValue;
  onChange: (value: RecurrenceValue) => void;
  description?: string;
}) {
  const toggleWeekday = (day: number) => {
    onChange({
      ...value,
      recurrenceDaysOfWeek: value.recurrenceDaysOfWeek.includes(day)
        ? value.recurrenceDaysOfWeek.filter((d) => d !== day)
        : [...value.recurrenceDaysOfWeek, day].sort(),
    });
  };

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
      {description && (
        <p className={css({ fontSize: "xs", color: "fg.muted" })}>{description}</p>
      )}

      <div
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderRadius: "lg",
          border: "1px solid",
          borderColor: "border.subtle",
          padding: "3",
        })}
      >
        <div className={css({ display: "flex", flexDirection: "column", gap: "0.5" })}>
          <Label htmlFor="isRecurring">Repeats on a schedule</Label>
          <p className={css({ fontSize: "xs", color: "fg.muted" })}>
            Off = active for the entire Start/End Date window
          </p>
        </div>
        <Switch
          id="isRecurring"
          checked={value.isRecurring}
          onCheckedChange={(checked) => onChange({ ...value, isRecurring: checked })}
        />
      </div>

      {value.isRecurring && (
        <>
          <div className={fieldGroup}>
            <Label htmlFor="recurrenceType">Repeats</Label>
            <Select
              value={value.recurrenceType}
              onValueChange={(v) => onChange({ ...value, recurrenceType: v })}
            >
              <SelectTrigger id="recurrenceType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Every day</SelectItem>
                <SelectItem value="WEEKLY">On specific weekdays</SelectItem>
                <SelectItem value="MONTHLY">On a day of the month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {value.recurrenceType === "WEEKLY" && (
            <div className={fieldGroup}>
              <Label>Active on</Label>
              <div className={css({ display: "flex", flexWrap: "wrap", gap: "2" })}>
                {WEEKDAYS.map((day) => {
                  const active = value.recurrenceDaysOfWeek.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleWeekday(day.value)}
                      className={cx(
                        css({
                          paddingInline: "3",
                          paddingBlock: "1.5",
                          borderRadius: "full",
                          fontSize: "sm",
                          fontWeight: "medium",
                          border: "1px solid",
                        }),
                        active
                          ? css({ borderColor: "accent.default", background: "gold.50", color: "gold.700" })
                          : css({ borderColor: "border.subtle", background: "transparent", color: "fg.muted" }),
                      )}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {value.recurrenceType === "MONTHLY" && (
            <div className={fieldGroup}>
              <Label htmlFor="recurrenceDayOfMonth">Day of month</Label>
              <Input
                id="recurrenceDayOfMonth"
                type="number"
                min="1"
                max="31"
                value={value.recurrenceDayOfMonth}
                onChange={(e) =>
                  onChange({ ...value, recurrenceDayOfMonth: parseInt(e.target.value) || 1 })
                }
              />
            </div>
          )}

          <div className={grid2}>
            <div className={fieldGroup}>
              <Label htmlFor="recurrenceStartTime">Active from (optional)</Label>
              <Input
                id="recurrenceStartTime"
                type="time"
                value={value.recurrenceStartTime}
                onChange={(e) => onChange({ ...value, recurrenceStartTime: e.target.value })}
              />
            </div>
            <div className={fieldGroup}>
              <Label htmlFor="recurrenceEndTime">Active until (optional)</Label>
              <Input
                id="recurrenceEndTime"
                type="time"
                value={value.recurrenceEndTime}
                onChange={(e) => onChange({ ...value, recurrenceEndTime: e.target.value })}
              />
            </div>
          </div>
          <p className={css({ fontSize: "xs", color: "fg.muted" })}>
            Leave both blank to be active all day on matching days. Times are in IST.
          </p>
        </>
      )}
    </div>
  );
}
