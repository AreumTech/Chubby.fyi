import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H3, H4, BodyBase } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface RsuSaleFormProps {
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

const ACCOUNT_TYPES = [
  { value: "taxable", label: "Taxable Brokerage Account" },
  { value: "cash", label: "Cash/Savings Account" },
  { value: "tax_deferred", label: "401(k)/403(b) - Tax Deferred" },
  { value: "roth", label: "Roth IRA/401(k) - Tax Free" },
];

const FREQUENCY_OPTIONS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUALLY", label: "Annually" },
  { value: "ONE_TIME", label: "One Time" },
];

export const RsuSaleForm: React.FC<RsuSaleFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  const { startYear, startMonth } = useStartDate();
  
  const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
    EventType.RSU_SALE
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  const getYearMonth = (offset?: number) => {
    if (offset === undefined) return { year: "", month: "" };
    const result = getCalendarYearAndMonthFromMonthOffset(
      startYear,
      startMonth,
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

  const frequency = formData.frequency || "ONE_TIME";
  const isOneTime = frequency === "ONE_TIME";

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          RSU Sale Details
        </H3>
        <div className="space-y-4">
          <Input
            label="Description"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., AAPL RSU Sale for Diversification"
            error={getFieldError("description")}
          />
          
          <Input
            label="Company Symbol"
            value={formData.symbol || ""}
            onChange={(e) =>
              onChange("symbol", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., AAPL, MSFT, GOOGL"
            error={getFieldError("symbol")}
            helperText="Stock ticker symbol"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Source Account"
              options={ACCOUNT_TYPES}
              value={formData.sourceAccountType || ""}
              onChange={(value) => onChange("sourceAccountType", value)}
              placeholder="Account holding the shares"
              error={getFieldError("sourceAccountType")}
              helperText="Account where shares are currently held"
            />

            <Select
              label="Target Account"
              options={ACCOUNT_TYPES}
              value={formData.targetAccountType || ""}
              onChange={(value) => onChange("targetAccountType", value)}
              placeholder="Account for sale proceeds"
              error={getFieldError("targetAccountType")}
              helperText="Account where cash proceeds will go"
            />
          </div>

          <Select
            label="Sale Frequency"
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={(value) => onChange("frequency", value)}
            error={getFieldError("frequency")}
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Sale Details & Tax Information
        </H3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Number of Shares"
              type="text"
              value={formatNumberWithCommas(formData.shares || "")}
              onChange={(e) =>
                onChange(
                  "shares",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="500"
              error={getFieldError("shares")}
              helperText="Shares to sell per period"
            />

            <Input
              label="Sale Price Per Share (Optional)"
              type="text"
              value={formatNumberWithCommas(formData.salePrice || "")}
              onChange={(e) =>
                onChange(
                  "salePrice",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="175.00"
              leftIcon={<span className="text-text-tertiary">$</span>}
              error={getFieldError("salePrice")}
              helperText="Expected sale price per share"
            />
          </div>

          <Input
            label="Total Sale Proceeds (if shares/price not specified)"
            type="text"
            value={formatNumberWithCommas(formData.totalProceeds || "")}
            onChange={(e) =>
              onChange(
                "totalProceeds",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="87,500"
            leftIcon={<span className="text-text-tertiary">$</span>}
            error={getFieldError("totalProceeds")}
            helperText="Total proceeds if exact shares/price unknown"
          />

          <Input
            label="Cost Basis Per Share (Optional)"
            type="text"
            value={formatNumberWithCommas(formData.costBasisPerShare || "")}
            onChange={(e) =>
              onChange(
                "costBasisPerShare",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="150.00"
            leftIcon={<span className="text-text-tertiary">$</span>}
            error={getFieldError("costBasisPerShare")}
            helperText="Original vesting price (for capital gains calculation)"
          />

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
            {!isOneTime && (
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
            )}
          </div>
        </div>
      </div>

      {/* RSU Sale Information */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-amber-600">💡</span>
          </div>
          <div className="ml-3">
            <H4 color="warning">
              RSU Sale Tax Considerations
            </H4>
            <BodyBase color="warning" className="mt-1">
              • Capital gains/losses calculated from vesting price (cost basis)<br />
              • Short-term gains (held &lt;1 year) taxed as ordinary income<br />
              • Long-term gains (held &gt;1 year) get preferential tax rates<br />
              • Consider timing sales to optimize tax treatment<br />
              • Track wash sale rules if repurchasing within 30 days
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};