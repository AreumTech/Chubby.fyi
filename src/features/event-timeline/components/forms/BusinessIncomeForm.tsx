import React, { useEffect } from "react";
import { Input } from "@/components/ui";
import { H4, BodyBase, Caption } from "@/components/ui/Typography";
import { BusinessIncomeEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

// Form data type - uses generic record to allow dynamic property access
type BusinessIncomeFormData = Record<string, any>;

interface BusinessIncomeFormProps {
  formData: BusinessIncomeFormData;
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

export const BusinessIncomeForm: React.FC<BusinessIncomeFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
    EventType.BUSINESS_INCOME
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

  const startYearMonth = getYearMonth(formData.startDateOffset);
  const endYearMonth = getYearMonth(formData.endDateOffset);

  const handleAmountChange = (value: string) => {
    const numericValue = parseFormattedNumber(value);
    onChange("amount", numericValue);
  };

  const handleGrowthRateChange = (value: string) => {
    const numericValue = parseFloat(value) / 100;
    onChange("annualGrowthRate", isNaN(numericValue) ? 0 : numericValue);
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <H4>
          Business Income Details
        </H4>

        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Business Name/Source"
            type="text"
            value={formData.source || ""}
            onChange={(e) => onChange("source", e.target.value)}
            placeholder="e.g., 'ABC Consulting', 'E-commerce Store'"
            required
            error={hasFieldError("source") ? getFieldError("source") : undefined}
          />

          <Input
            label="Monthly Business Income"
            type="text"
            value={formatNumberWithCommas(formData.amount ?? "")}
            onChange={(e) => {
              handleAmountChange(e.target.value);
              // Ensure frequency is set to monthly for business income
              if (!formData.frequency) {
                onChange("frequency", "monthly");
              }
            }}
            placeholder="$8,500"
            required
            error={hasFieldError("amount") ? getFieldError("amount") : undefined}
            helperText="Monthly business income - will be converted to monthly for simulation"
          />

          <div className="flex items-center space-x-2">
            <input
              id="isNet"
              type="checkbox"
              checked={formData.isNet || false}
              onChange={(e) => onChange("isNet", e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <label htmlFor="isNet" className="text-sm text-gray-700">
              This amount is after business expenses and taxes (net income)
            </label>
          </div>
        </div>
      </div>

      {/* Business Type */}
      <div className="space-y-4">
        <H4>Business Type</H4>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Business Structure
            </label>
            <select
              value={formData.businessType || ""}
              onChange={(e) => onChange("businessType", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select business type</option>
              <option value="sole_proprietorship">Sole Proprietorship</option>
              <option value="partnership">Partnership</option>
              <option value="llc">LLC</option>
              <option value="s_corp">S Corporation</option>
              <option value="c_corp">C Corporation</option>
              <option value="consulting">Consulting/Freelance</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timing */}
      <div className="space-y-4">
        <H4>Income Timeline</H4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={startYearMonth.month}
                onChange={(e) =>
                  onDateChange("startDateOffset", startYearMonth.year, e.target.value)
                }
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Month</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={(i + 1).toString().padStart(2, "0")}>
                    {new Date(2024, i).toLocaleDateString("en-US", {
                      month: "short",
                    })}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={startYearMonth.year}
                onChange={(e) =>
                  onDateChange("startDateOffset", e.target.value, startYearMonth.month)
                }
                placeholder="Year"
                min="2020"
                max="2100"
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date (Optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={endYearMonth.month}
                onChange={(e) =>
                  onDateChange("endDateOffset", endYearMonth.year, e.target.value)
                }
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Month</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={(i + 1).toString().padStart(2, "0")}>
                    {new Date(2024, i).toLocaleDateString("en-US", {
                      month: "short",
                    })}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={endYearMonth.year}
                onChange={(e) =>
                  onDateChange("endDateOffset", e.target.value, endYearMonth.month)
                }
                placeholder="Year"
                min="2020"
                max="2100"
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Growth Settings */}
      <div className="space-y-4">
        <H4>Growth Projections</H4>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <Input
              label="Annual Growth Rate (%)"
              type="number"
              value={((formData.annualGrowthRate || 0) * 100).toString()}
              onChange={(e) => handleGrowthRateChange(e.target.value)}
              placeholder="5.0"
              step="0.1"
            />
            <Caption color="tertiary" className="mt-1">
              Expected annual growth in business income (consider market conditions and business maturity)
            </Caption>
          </div>
        </div>
      </div>

      {/* Tax Considerations */}
      <div className="space-y-4">
        <H4>Tax Considerations</H4>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <BodyBase weight="medium" className="text-yellow-800">
                Important Tax Information
              </BodyBase>
              <BodyBase className="mt-2 text-yellow-700">
                <p>Business income may require quarterly estimated tax payments. Consider:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Self-employment tax (15.3% for sole proprietors)</li>
                  <li>Quarterly estimated tax payments</li>
                  <li>Business expense deductions</li>
                  <li>Retirement plan contributions (SEP-IRA, Solo 401k)</li>
                </ul>
              </BodyBase>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="space-y-4">
        <H4>Additional Details</H4>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={formData.description || ""}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder="Additional notes about your business income..."
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};