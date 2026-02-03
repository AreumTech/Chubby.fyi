import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H4, BodyBase } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface LiabilityPaymentFormProps {
  formData: Partial<FinancialEvent>;
  onChange: (field: string, value: any) => void;
  onDateChange: (field: string, year: string, month: string) => void;
  baseYear?: number;
  baseMonth?: number;
  currentAge?: number;
  onValidationChange?: (
    isValid: boolean,
    errors: Record<string, string>
  ) => void;
}

const PAYMENT_TYPES = [
  { value: "extra_principal", label: "Extra Principal Payment" },
  { value: "lump_sum", label: "Lump Sum Payment" },
  { value: "payoff", label: "Full Payoff" },
];

export const LiabilityPaymentForm: React.FC<LiabilityPaymentFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
    EventType.LIABILITY_PAYMENT
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  const getYearMonth = (offset?: number) => {
    if (offset === undefined) return { year: "", month: "" };
    const result = getCalendarYearAndMonthFromMonthOffset(
      baseYear,
      baseMonth,
      offset,
      currentAge
    );
    return {
      year: result.year.toString(),
      month: result.monthInYear.toString().padStart(2, "0"),
    };
  };

  const handleYearMonthChange = (
    field: string,
    year: string,
    month: string
  ) => {
    if (year && month) {
      onDateChange(field, year, month);
    }
  };

  const paymentType = (formData.metadata as any)?.paymentType || "extra_principal";
  const isRecurring = paymentType === "extra_principal";

  const handleMetadataChange = (field: string, value: any) => {
    const currentMetadata = formData.metadata || {};
    onChange("metadata", {
      ...currentMetadata,
      [field]: value,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
          Payment Details
        </H4>
        <div className="space-y-4">
          <Input
            label="Payment Description"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Extra Mortgage Payment, Loan Payoff"
            error={getFieldError("description")}
          />

          <Select
            label="Payment Type"
            options={PAYMENT_TYPES}
            value={paymentType}
            onChange={(value) => handleMetadataChange("paymentType", value)}
            helperText="Type of debt payment"
          />

          <Input
            label="Target Liability"
            value={formData.source || ""}
            onChange={(e) =>
              onChange("source", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Primary Mortgage, Student Loan ID"
            error={getFieldError("source")}
            helperText="Which debt this payment applies to"
          />
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Payment Amount & Schedule
        </H4>
        <div className="space-y-4">
          <Input
            label={paymentType === "payoff" ? "Payoff Amount (Optional)" : "Payment Amount"}
            type="text"
            value={formatNumberWithCommas(formData.amount || "")}
            onChange={(e) =>
              onChange(
                "amount",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder={paymentType === "payoff" ? "Leave blank for full payoff" : "1,000"}
            error={getFieldError("amount")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText={
              paymentType === "payoff" 
                ? "Leave blank to pay off remaining balance"
                : isRecurring 
                ? "Monthly extra payment amount"
                : "One-time payment amount"
            }
          />

          {isRecurring ? (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Year"
                type="number"
                value={getYearMonth(formData.startDateOffset).year}
                onChange={(e) =>
                  handleYearMonthChange(
                    "startDateOffset",
                    (e.target as HTMLInputElement).value,
                    getYearMonth(formData.startDateOffset).month || "01"
                  )
                }
                placeholder="2024"
                error={getFieldError("startDateOffset")}
              />
              <Input
                label="End Year (Optional)"
                type="number"
                value={getYearMonth(formData.endDateOffset).year}
                onChange={(e) =>
                  handleYearMonthChange(
                    "endDateOffset",
                    (e.target as HTMLInputElement).value,
                    getYearMonth(formData.endDateOffset).month || "01"
                  )
                }
                placeholder="Leave blank for indefinite"
                error={getFieldError("endDateOffset")}
              />
            </div>
          ) : (
            <Input
              label="Payment Date"
              type="month"
              value={`${getYearMonth(formData.monthOffset).year}-${getYearMonth(formData.monthOffset).month}`}
              onChange={(e) => {
                const [year, month] = (e.target as HTMLInputElement).value.split("-");
                handleYearMonthChange("monthOffset", year, month);
              }}
              error={getFieldError("monthOffset")}
              helperText="When to make the payment"
            />
          )}

          {isRecurring && (
            <Input
              label="Annual Growth Rate"
              type="number"
              step="0.01"
              value={formData.annualGrowthRate || ""}
              onChange={(e) =>
                onChange("annualGrowthRate", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="3.0"
              rightIcon={<span className="text-text-tertiary">%</span>}
              helperText="Annual increase in extra payment amount"
              error={getFieldError("annualGrowthRate")}
            />
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-600">💡</span>
          </div>
          <div className="ml-3">
            <BodyBase className="font-medium text-blue-800">
              Payment Strategy
            </BodyBase>
            <BodyBase className="mt-1 text-blue-700">
              Extra payments reduce principal faster and can save significant interest over time.
              Consider your overall financial goals and liquidity needs before committing to extra payments.
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};