import React, { useEffect } from "react";
import { Input } from "@/components/ui";
import { RequiredMinimumDistributionEvent, EventType } from "@/types";
import type { AccountType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";
import { H3, H4, Body, BodyBase, Caption, FormLabel } from "@/components/ui/Typography";

interface RequiredMinimumDistributionFormProps {
  formData: Partial<RequiredMinimumDistributionEvent>;
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

export const RequiredMinimumDistributionForm: React.FC<RequiredMinimumDistributionFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
    EventType.REQUIRED_MINIMUM_DISTRIBUTION
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

  const handleAmountChange = (value: string) => {
    const numericValue = parseFormattedNumber(value);
    onChange("amount", numericValue);
  };

  // Calculate age at start date for RMD eligibility
  const ageAtStart = currentAge + Math.floor((formData.startDateOffset || 0) / 12);

  return (
    <div className="space-y-6">
      {/* RMD Overview */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <H4 className="text-blue-800">
              Required Minimum Distribution (RMD)
            </H4>
            <div className="mt-2">
              <BodyBase className="text-blue-700">RMDs are mandatory withdrawals from tax-deferred retirement accounts starting at age 73 (for those born after 1959). The amount is calculated based on your account balance and IRS life expectancy tables.</BodyBase>
            </div>
          </div>
        </div>
      </div>

      {/* Age Warning */}
      {ageAtStart < 73 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <H4 className="text-amber-800">
                Age Notice
              </H4>
              <div className="mt-2">
                <BodyBase className="text-amber-700">You will be {ageAtStart} years old at the start date. RMDs typically begin at age 73. Consider if this timing is appropriate for your situation.</BodyBase>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <div className="space-y-4">
        <H3>
          RMD Details
        </H3>

        <div className="grid grid-cols-1 gap-4">
          <Input
            label="RMD Description"
            type="text"
            value={formData.source || ""}
            onChange={(e) => onChange("source", e.target.value)}
            placeholder="e.g., 'Traditional IRA RMD', '401k RMD'"
            required
            error={hasFieldError("source") ? getFieldError("source") : undefined}
          />
        </div>
      </div>

      {/* Account Selection */}
      <div className="space-y-4">
        <H3>Source Account</H3>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <FormLabel className="mb-2">
              Retirement Account Type
            </FormLabel>
            <select
              value={formData.sourceAccountType || ""}
              onChange={(e) => onChange("sourceAccountType", e.target.value as AccountType)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select account type</option>
              <option value="tax_deferred">Traditional 401(k)</option>
              <option value="tax_deferred">Traditional IRA</option>
              <option value="tax_deferred">SEP-IRA</option>
              <option value="tax_deferred">SIMPLE IRA</option>
              <option value="tax_deferred">Inherited IRA</option>
            </select>
            <Caption color="tertiary" className="mt-1">
              RMDs apply to tax-deferred retirement accounts. Roth IRAs do not require RMDs during the owner's lifetime.
            </Caption>
          </div>
        </div>
      </div>

      {/* RMD Calculation Method */}
      <div className="space-y-4">
        <H3>Distribution Amount</H3>

        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <input
              id="autoCalculate"
              type="radio"
              name="calculationMethod"
              checked={formData.autoCalculateRMD !== false}
              onChange={(e) => onChange("autoCalculateRMD", e.target.checked)}
              className="text-blue-600 focus:ring-blue-500"
            />
            <BodyBase as="label" htmlFor="autoCalculate" color="secondary">
              Automatically calculate based on account balance and IRS tables (Recommended)
            </BodyBase>
          </div>

          <div className="flex items-center space-x-3">
            <input
              id="manualAmount"
              type="radio"
              name="calculationMethod"
              checked={formData.autoCalculateRMD === false}
              onChange={(e) => onChange("autoCalculateRMD", !e.target.checked)}
              className="text-blue-600 focus:ring-blue-500"
            />
            <BodyBase as="label" htmlFor="manualAmount" color="secondary">
              Specify fixed annual amount
            </BodyBase>
          </div>
        </div>

        {formData.autoCalculateRMD === false && (
          <div className="ml-6 mt-3">
            <Input
              label="Annual RMD Amount"
              type="text"
              value={formatNumberWithCommas(formData.amount)}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="$15,000"
              required
              error={hasFieldError("amount") ? getFieldError("amount") : undefined}
            />
          </div>
        )}
      </div>

      {/* Distribution Schedule */}
      <div className="space-y-4">
        <H3>Distribution Schedule</H3>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <FormLabel className="mb-1">
              First RMD Date
            </FormLabel>
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
            <Caption color="tertiary" className="mt-1">
              RMDs must be taken by December 31st each year (April 1st for the first year only)
            </Caption>
          </div>

          <div>
            <FormLabel className="mb-2">
              Distribution Frequency
            </FormLabel>
            <select
              value={formData.frequency || "annual"}
              onChange={(e) => onChange("frequency", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="annual">Annual (December)</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="semi_annual">Semi-Annual</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tax Withholding */}
      <div className="space-y-4">
        <H3>Tax Withholding</H3>

        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <input
              id="taxWithholding"
              type="checkbox"
              checked={formData.withholdTaxes || false}
              onChange={(e) => onChange("withholdTaxes", e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <BodyBase as="label" htmlFor="taxWithholding" color="secondary">
              Withhold federal income taxes from distribution
            </BodyBase>
          </div>

          {formData.withholdTaxes && (
            <div className="ml-6">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Withholding Percentage (%)"
                  type="number"
                  value={formData.withholdingPercentage?.toString() || ""}
                  onChange={(e) => onChange("withholdingPercentage", parseFloat(e.target.value) || 0)}
                  placeholder="20"
                  min="0"
                  max="50"
                  step="1"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Important Notes */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <H4 className="text-red-800">
              Important RMD Rules
            </H4>
            <div className="mt-2">
              <BodyBase as="ul" className="list-disc list-inside space-y-1 text-red-700">
                <li>Failure to take RMDs results in a 50% penalty on the shortfall amount</li>
                <li>RMDs are generally taxable as ordinary income</li>
                <li>RMD amounts increase each year based on decreasing life expectancy</li>
                <li>Consult with a tax professional for complex situations</li>
              </BodyBase>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="space-y-4">
        <H3>Additional Details</H3>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <FormLabel className="mb-1">
              Description (Optional)
            </FormLabel>
            <textarea
              value={formData.description || ""}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder="Additional notes about this RMD..."
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};