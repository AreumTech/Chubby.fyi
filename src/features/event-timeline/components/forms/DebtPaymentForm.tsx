import React, { useEffect, useRef } from "react";
import { Input } from "@/components/ui";
import { H4, BodyBase, Caption } from "@/components/ui/Typography";
import { DebtPaymentEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface DebtPaymentFormProps {
  formData: Partial<DebtPaymentEvent>;
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

export const DebtPaymentForm: React.FC<DebtPaymentFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
    EventType.DEBT_PAYMENT
  );

  // Use ref for callback to avoid dependency issues causing infinite loops
  const onValidationChangeRef = useRef(onValidationChange);
  onValidationChangeRef.current = onValidationChange;

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChangeRef.current?.(validation.isValid, validation.errors);
  }, [formData, validateForm]);

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

  const handleExtraPaymentChange = (value: string) => {
    const numericValue = parseFormattedNumber(value);
    onChange("extraPayment", numericValue);
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <H4>Debt Payment Details</H4>

        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Debt Name/Description"
            type="text"
            value={formData.source || ""}
            onChange={(e) => onChange("source", e.target.value)}
            placeholder="e.g., 'Student Loan Payment', 'Credit Card Payment'"
            required
            error={hasFieldError("source") ? getFieldError("source") : undefined}
          />

          <Input
            label="Monthly Payment Amount"
            type="text"
            value={formatNumberWithCommas(formData.amount)}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="$450"
            required
            error={hasFieldError("amount") ? getFieldError("amount") : undefined}
          />

          <Input
            label="Extra Payment (Optional)"
            type="text"
            value={formatNumberWithCommas(formData.extraPayment)}
            onChange={(e) => handleExtraPaymentChange(e.target.value)}
            placeholder="$100"
          />
          <Caption color="tertiary" className="-mt-2">
            Additional payment above the minimum to accelerate payoff
          </Caption>
        </div>
      </div>

      {/* Debt Type */}
      <div className="space-y-4">
        <H4>Debt Type</H4>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Debt Type
            </label>
            <select
              value={formData.debtType || ""}
              onChange={(e) => onChange("debtType", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select debt type</option>
              <option value="mortgage">Mortgage</option>
              <option value="student_loan">Student Loan</option>
              <option value="credit_card">Credit Card</option>
              <option value="auto_loan">Auto Loan</option>
              <option value="personal_loan">Personal Loan</option>
              <option value="home_equity">Home Equity Loan/HELOC</option>
              <option value="business_loan">Business Loan</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payment Schedule */}
      <div className="space-y-4">
        <H4>Payment Schedule</H4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Payment Date
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
              Final Payment Date (Optional)
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

        <Caption color="tertiary">
          Leave the final payment date empty if you want payments to continue throughout the simulation
        </Caption>
      </div>

      {/* Payment Strategy */}
      <div className="space-y-4">
        <H4>Payment Strategy</H4>

        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <input
              id="autopay"
              type="checkbox"
              checked={formData.isAutoPay || false}
              onChange={(e) => onChange("isAutoPay", e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <label htmlFor="autopay" className="text-sm text-gray-700">
              Auto-pay enabled (may qualify for interest rate reduction)
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              id="priorityPayoff"
              type="checkbox"
              checked={formData.isPriorityPayoff || false}
              onChange={(e) => onChange("isPriorityPayoff", e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <label htmlFor="priorityPayoff" className="text-sm text-gray-700">
              Priority for debt avalanche/snowball strategy
            </label>
          </div>
        </div>
      </div>

      {/* Tax Implications */}
      <div className="space-y-4">
        <H4>Tax Considerations</H4>

        <div className="flex items-center space-x-3">
          <input
            id="taxDeductible"
            type="checkbox"
            checked={formData.isTaxDeductible || false}
            onChange={(e) => onChange("isTaxDeductible", e.target.checked)}
            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
          />
          <label htmlFor="taxDeductible" className="text-sm text-gray-700">
            Interest payments are tax deductible (e.g., mortgage, student loan, business loan)
          </label>
        </div>

        {formData.isTaxDeductible && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
            <BodyBase color="success">
              Tax-deductible interest will be factored into tax calculations, potentially reducing your effective payment cost.
            </BodyBase>
          </div>
        )}
      </div>

      {/* Impact Summary */}
      <div className="space-y-4">
        <H4>Payment Impact</H4>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800">Monthly Outflow:</span>
              <div className="text-blue-700">
                ${formatNumberWithCommas((formData.amount || 0) + (formData.extraPayment || 0))}
              </div>
            </div>
            <div>
              <span className="font-medium text-blue-800">Payment Type:</span>
              <div className="text-blue-700">
                {formData.debtType ? formData.debtType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not specified'}
              </div>
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
              placeholder="Additional notes about this debt payment..."
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};