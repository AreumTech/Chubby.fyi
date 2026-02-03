import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";
import { HelpIcon, LabelWithHelp } from "@/components/HelpTooltip";

// Form data type - uses generic record to allow dynamic property access
type CapitalGainsFormData = Record<string, any>;

interface CapitalGainsRealizationFormProps {
  formData: CapitalGainsFormData;
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

const SOURCE_ACCOUNT_TYPES = [
  { value: "taxable", label: "Taxable Brokerage Account" },
  { value: "cash", label: "Cash/Money Market" },
];

const SALE_STRATEGIES = [
  { value: "specific_amount", label: "Sell Specific Dollar Amount" },
  { value: "percentage_of_portfolio", label: "Sell Percentage of Portfolio" },
  { value: "specific_security", label: "Sell Specific Securities" },
];

const GAIN_TYPES = [
  { value: "long_term", label: "Long-Term Gains (held > 1 year)" },
  { value: "short_term", label: "Short-Term Gains (held ≤ 1 year)" },
  { value: "mixed", label: "Mixed Long & Short-Term" },
];

const PROCEEDS_DESTINATIONS = [
  { value: "cash", label: "Hold as Cash" },
  { value: "taxable", label: "Reinvest in Taxable Account" },
  { value: "tax_deferred", label: "Move to Tax-Deferred Account" },
  { value: "roth", label: "Move to Roth Account" },
];

export const CapitalGainsRealizationForm: React.FC<CapitalGainsRealizationFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  // Use centralized date settings
  const { startYear, startMonth } = useStartDate();
  
  const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
    EventType.STRATEGIC_CAPITAL_GAINS_REALIZATION
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Set default values
  useEffect(() => {
    if (!formData.sourceAccountType) {
      onChange("sourceAccountType", "taxable");
    }
    if (!formData.saleStrategy) {
      onChange("saleStrategy", "specific_amount");
    }
  }, [formData.sourceAccountType, formData.saleStrategy, onChange]);

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

  const saleStrategy = formData.saleStrategy || "specific_amount";
  const gainType = formData.gainType;
  const isLongTerm = gainType === "long_term";

  return (
    <div className="space-y-6">
      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
          Investment Sale Details
          <HelpIcon concept="capitalGains" className="ml-2" />
        </H4>
        <div className="space-y-4">
          <Input
            label="Sale Description"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Rebalance portfolio, Raise cash for purchase"
            error={getFieldError("description")}
          />

          <Input
            label="Sale Date"
            type="month"
            value={`${getYearMonth(formData.monthOffset).year}-${getYearMonth(formData.monthOffset).month}`}
            onChange={(e) => {
              const [year, month] = (e.target as HTMLInputElement).value.split("-");
              handleYearMonthChange("monthOffset", year, month);
            }}
            error={getFieldError("monthOffset")}
            helperText="When to execute the sale"
          />
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Sale Strategy
        </H4>
        <div className="space-y-4">
          <Select
            label="Sale Strategy"
            options={SALE_STRATEGIES}
            value={saleStrategy}
            onChange={(value) => onChange("saleStrategy", value)}
            error={getFieldError("saleStrategy")}
            helperText="How to determine what to sell"
          />

          {saleStrategy === "specific_amount" && (
            <Input
              label="Sale Amount"
              type="text"
              value={formatNumberWithCommas(formData.amount || "")}
              onChange={(e) =>
                onChange(
                  "amount",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="50,000"
              error={getFieldError("amount")}
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Dollar amount of investments to sell"
            />
          )}

          {saleStrategy === "percentage_of_portfolio" && (
            <>
              <Input
                label="Percentage to Sell"
                type="number"
                step="0.1"
                value={formData.percentageToSell || ""}
                onChange={(e) =>
                  onChange("percentageToSell", parseFloat((e.target as HTMLInputElement).value))
                }
                placeholder="25.0"
                rightIcon={<span className="text-text-tertiary">%</span>}
                error={getFieldError("percentageToSell")}
                helperText="Percentage of portfolio to sell"
              />
              <Input
                label="Estimated Sale Amount"
                type="text"
                value={formatNumberWithCommas(formData.amount || "")}
                onChange={(e) =>
                  onChange(
                    "amount",
                    parseFormattedNumber((e.target as HTMLInputElement).value)
                  )
                }
                placeholder="50,000"
                error={getFieldError("amount")}
                leftIcon={<span className="text-text-tertiary">$</span>}
                helperText="Estimated dollar value based on current portfolio"
              />
            </>
          )}

          {saleStrategy === "specific_security" && (
            <>
              <Input
                label="Security to Sell"
                value={formData.securityToSell || ""}
                onChange={(e) =>
                  onChange("securityToSell", (e.target as HTMLInputElement).value)
                }
                placeholder="e.g., VTSAX, AAPL, Bond Fund"
                error={getFieldError("securityToSell")}
                helperText="Specific investment or fund to sell"
              />
              <Input
                label="Sale Amount"
                type="text"
                value={formatNumberWithCommas(formData.amount || "")}
                onChange={(e) =>
                  onChange(
                    "amount",
                    parseFormattedNumber((e.target as HTMLInputElement).value)
                  )
                }
                placeholder="50,000"
                error={getFieldError("amount")}
                leftIcon={<span className="text-text-tertiary">$</span>}
                helperText="Dollar amount of this security to sell"
              />
            </>
          )}

          <Select
            label="Source Account"
            options={SOURCE_ACCOUNT_TYPES}
            value={formData.sourceAccountType || "taxable"}
            onChange={(value) => onChange("sourceAccountType", value)}
            error={getFieldError("sourceAccountType")}
            helperText="Account to sell investments from"
          />
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Tax Implications
        </H4>
        <div className="space-y-4">
          <Select
            label="Expected Gain Type"
            options={GAIN_TYPES}
            value={formData.gainType || ""}
            onChange={(value) => onChange("gainType", value)}
            placeholder="Select expected gain type"
            error={getFieldError("gainType")}
            helperText="How long investments have been held"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Expected Capital Gains"
              type="text"
              value={formatNumberWithCommas(formData.expectedGainsAmount || "")}
              onChange={(e) =>
                onChange(
                  "expectedGainsAmount",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="10,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Estimated capital gains"
            />
            
            <Input
              label="Expected Capital Losses"
              type="text"
              value={formatNumberWithCommas(formData.expectedLossAmount || "")}
              onChange={(e) =>
                onChange(
                  "expectedLossAmount",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="2,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Estimated capital losses"
            />
          </div>

          <Select
            label="Proceeds Destination"
            options={PROCEEDS_DESTINATIONS}
            value={formData.proceedsDestination || "cash"}
            onChange={(value) => onChange("proceedsDestination", value)}
            error={getFieldError("proceedsDestination")}
            helperText="Where to deposit sale proceeds"
          />
        </div>
      </div>

      {/* Tax Treatment Information */}
      {gainType && (
        <div className={`${isLongTerm ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border rounded-lg p-4`}>
          <div className="flex">
            <div className="flex-shrink-0">
              <span className={isLongTerm ? 'text-green-600' : 'text-yellow-600'}>
                {isLongTerm ? '💚' : '⚠️'}
              </span>
            </div>
            <div className="ml-3">
              <BodyBase weight="medium" className={isLongTerm ? 'text-green-800' : 'text-yellow-800'}>
                {isLongTerm ? 'Long-Term Capital Gains' : 'Short-Term Capital Gains'}
              </BodyBase>
              <BodyBase className={`mt-1 ${isLongTerm ? 'text-green-700' : 'text-yellow-700'}`}>
                {isLongTerm ? (
                  <>
                    <strong>Preferential Tax Treatment:</strong><br />
                    • 0%, 15%, or 20% tax rate depending on income<br />
                    • No Medicare surtax for most taxpayers<br />
                    • More tax-efficient than ordinary income
                  </>
                ) : (
                  <>
                    <strong>Ordinary Income Tax Rates:</strong><br />
                    • Taxed at same rate as wages and salary<br />
                    • Rates up to 37% for high earners<br />
                    • Consider holding longer for better treatment
                  </>
                )}
              </BodyBase>
            </div>
          </div>
        </div>
      )}

      {/* General Capital Gains Warning */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-600">💡</span>
          </div>
          <div className="ml-3">
            <BodyBase weight="medium" className="text-blue-800">
              Tax Planning Considerations
            </BodyBase>
            <BodyBase className="mt-1 text-blue-700">
              • Capital gains may affect your tax bracket and Medicare premiums<br />
              • Consider coordinating with tax loss harvesting to offset gains<br />
              • Timing sales across tax years can help manage tax impact<br />
              • Consult a tax professional for complex situations
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};