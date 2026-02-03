import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H3, H4, BodyBase } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";
import { HelpIcon, LabelWithHelp } from "@/components/HelpTooltip";

interface MegaBackdoorRothFormProps {
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

const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "annually", label: "Annually" },
];

const CONVERSION_TIMING_OPTIONS = [
  { value: "immediate", label: "Immediate (within days)" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annual (year-end)" },
];

const SOURCE_ACCOUNT_TYPES = [
  { value: "tax_deferred", label: "After-Tax 401(k)" },
];

const TARGET_ACCOUNT_TYPES = [
  { value: "roth", label: "Roth IRA" },
  { value: "roth", label: "Roth 401(k)" },
];

export const MegaBackdoorRothForm: React.FC<MegaBackdoorRothFormProps> = ({
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
    EventType.MEGA_BACKDOOR_ROTH
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Set default values
  useEffect(() => {
    if (!formData.sourceAccountType) {
      onChange("sourceAccountType", "tax_deferred");
    }
    if (!formData.targetAccountType) {
      onChange("targetAccountType", "roth");
    }
    if (!formData.frequency) {
      onChange("frequency", "monthly");
    }
    if (!formData.conversionTiming) {
      onChange("conversionTiming", "immediate");
    }
    if (!formData.immediateConversion) {
      onChange("immediateConversion", true);
    }
  }, [
    formData.sourceAccountType,
    formData.targetAccountType,
    formData.frequency,
    formData.conversionTiming,
    formData.immediateConversion,
    onChange
  ]);

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

  const frequency = formData.frequency || "monthly";
  const isAnnual = frequency === "annually";
  const conversionTiming = formData.conversionTiming;
  const immediateConversion = formData.immediateConversion;

  // Calculate annual contribution for display
  const calculateAnnualContribution = () => {
    const amount = formData.amount || 0;
    return isAnnual ? amount : amount * 12;
  };

  // Calculate maximum contribution limit
  const currentYear = new Date().getFullYear();
  const contributionLimit = currentYear >= 2024 ? 69000 : 66000; // Approximate limits
  const standardLimit = currentYear >= 2024 ? 23000 : 22500;
  const maxAfterTaxLimit = contributionLimit - standardLimit;

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Mega Backdoor Roth Strategy
          <HelpIcon concept="megaBackdoorRoth" className="ml-2" />
        </H3>
        <div className="space-y-4">
          <Input
            label="Strategy Description"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Annual Mega Backdoor Roth Conversion"
            error={getFieldError("description")}
          />

          <Select
            label="Contribution Frequency"
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={(value) => onChange("frequency", value)}
            error={getFieldError("frequency")}
            helperText="How often to make after-tax contributions"
          />

          <Select
            label="Conversion Timing"
            options={CONVERSION_TIMING_OPTIONS}
            value={conversionTiming || "immediate"}
            onChange={(value) => {
              onChange("conversionTiming", value);
              onChange("immediateConversion", value === "immediate");
            }}
            error={getFieldError("conversionTiming")}
            helperText="When to convert after-tax contributions to Roth"
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Contribution Details
        </H3>
        <div className="space-y-4">
          <Input
            label={`After-Tax Contribution (${isAnnual ? "Annual" : "Monthly"})`}
            type="text"
            value={formatNumberWithCommas(formData.amount || "")}
            onChange={(e) =>
              onChange(
                "amount",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder={isAnnual ? "46,000" : "3,833"}
            error={getFieldError("amount")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText={`${isAnnual ? "Annual" : "Monthly"} after-tax 401(k) contribution amount`}
          />

          {!isAnnual && formData.amount && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-sm text-gray-600">
                <strong>Annual Contribution:</strong> ${formatNumberWithCommas(calculateAnnualContribution())}
              </div>
            </div>
          )}

          <Input
            label={`Maximum Contribution Limit (${currentYear})`}
            type="text"
            value={formatNumberWithCommas(formData.maxContributionLimit || maxAfterTaxLimit)}
            onChange={(e) =>
              onChange(
                "maxContributionLimit",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Maximum after-tax contribution allowed (Total limit minus standard contribution)"
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
            helperText="Expected annual increase in contribution amount"
            error={getFieldError("annualGrowthRate")}
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Account Flow
        </H3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">From Account</label>
              <div className="input bg-gray-50 text-gray-600 cursor-not-allowed">
                After-Tax 401(k)
              </div>
              <div className="text-tertiary text-xs mt-1">
                After-tax contributions to employer 401(k)
              </div>
            </div>
            
            <div>
              <label className="input-label">To Account</label>
              <div className="input bg-gray-50 text-gray-600 cursor-not-allowed">
                Roth IRA/401(k)
              </div>
              <div className="text-tertiary text-xs mt-1">
                Roth account for tax-free growth
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Requirements Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-amber-600">⚠️</span>
          </div>
          <div className="ml-3">
            <H4 color="warning" className="text-amber-800">
              Employer Plan Requirements
            </H4>
            <BodyBase color="warning" className="mt-1 text-amber-700">
              <strong>Your 401(k) plan must support:</strong><br />
              • After-tax contributions beyond the standard limit<br />
              • In-service distributions or immediate Roth conversions<br />
              • Separate accounting for after-tax contributions<br /><br />
              <strong>Not all employers offer these features.</strong> Check with HR or plan administrator.
            </BodyBase>
          </div>
        </div>
      </div>

      {/* Income Limit Information */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-green-600">💰</span>
          </div>
          <div className="ml-3">
            <H4 color="success" className="text-green-800">
              High Earner Strategy
            </H4>
            <BodyBase color="success" className="mt-1 text-green-700">
              <strong>Ideal for high-income earners who:</strong><br />
              • Exceed Roth IRA income limits ($150K single, $236K married)<br />
              • Have maxed out standard 401(k) contributions<br />
              • Want additional tax-free retirement savings<br />
              • Have high current tax rates but expect lower rates in retirement
            </BodyBase>
          </div>
        </div>
      </div>

      {/* Tax Benefits */}
      {immediateConversion && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-blue-600">💡</span>
            </div>
            <div className="ml-3">
              <H4 color="info" className="text-blue-800">
                Immediate Conversion Benefits
              </H4>
              <BodyBase color="info" className="mt-1 text-blue-700">
                • Minimal tax impact (only growth between contribution and conversion)<br />
                • Avoids pro-rata rule complications<br />
                • Maximizes tax-free growth period<br />
                • Reduces administrative complexity
              </BodyBase>
            </div>
          </div>
        </div>
      )}

      {/* Annual Limit Warning */}
      {formData.amount && calculateAnnualContribution() > maxAfterTaxLimit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-600">🚫</span>
            </div>
            <div className="ml-3">
              <H4 color="danger" className="text-red-800">
                Contribution Limit Exceeded
              </H4>
              <BodyBase color="danger" className="mt-1 text-red-700">
                Your annual contribution of ${formatNumberWithCommas(calculateAnnualContribution())}
                exceeds the estimated after-tax limit of ${formatNumberWithCommas(maxAfterTaxLimit)} for {currentYear}.
                <br /><br />
                <strong>Total 401(k) limit:</strong> ${formatNumberWithCommas(contributionLimit)}<br />
                <strong>Standard contribution limit:</strong> ${formatNumberWithCommas(standardLimit)}<br />
                <strong>Available for after-tax:</strong> ${formatNumberWithCommas(maxAfterTaxLimit)}
              </BodyBase>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};