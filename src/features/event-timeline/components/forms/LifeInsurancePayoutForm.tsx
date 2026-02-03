import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface LifeInsurancePayoutFormProps {
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

const BENEFICIARY_TYPE_OPTIONS = [
  { value: "spouse", label: "Spouse" },
  { value: "children", label: "Children" },
  { value: "estate", label: "Estate" },
  { value: "trust", label: "Trust" },
  { value: "charity", label: "Charity" },
  { value: "other", label: "Other" },
];

const ACCOUNT_TYPE_OPTIONS = [
  { value: "cash", label: "Cash/Checking" },
  { value: "taxable", label: "Taxable Investment Account" },
];

const PAYOUT_METHOD_OPTIONS = [
  { value: "lump_sum", label: "Lump Sum Payment" },
  { value: "installments", label: "Installment Payments" },
  { value: "interest_only", label: "Interest Only (Principal Retained)" },
  { value: "life_income", label: "Life Income Annuity" },
];

export const LifeInsurancePayoutForm: React.FC<LifeInsurancePayoutFormProps> = ({
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
    EventType.LIFE_INSURANCE_PAYOUT
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Set default values
  useEffect(() => {
    if (formData.taxable === undefined) {
      onChange("taxable", false); // Life insurance payouts are typically tax-free
    }
    if (!formData.payoutMethod) {
      onChange("payoutMethod", "lump_sum");
    }
  }, [formData.taxable, formData.payoutMethod, onChange]);

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

  const payoutMethod = formData.payoutMethod || "lump_sum";
  const isInstallments = payoutMethod === "installments" || payoutMethod === "interest_only" || payoutMethod === "life_income";

  return (
    <div className="space-y-6">
      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Life Insurance Policy Information
        </H4>
        <div className="space-y-4">
          <Input
            label="Policy Name"
            value={formData.policyName || ""}
            onChange={(e) =>
              onChange("policyName", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Term Life Policy, Whole Life Policy"
            error={getFieldError("policyName")}
          />

          <Input
            label="Policy ID (Optional)"
            value={formData.policyId || ""}
            onChange={(e) =>
              onChange("policyId", (e.target as HTMLInputElement).value)
            }
            placeholder="Policy number linking to premium policy"
            error={getFieldError("policyId")}
            helperText="Should match the Policy ID from the premium event"
          />

          <Input
            label="Insurance Company"
            value={formData.insuranceCompany || ""}
            onChange={(e) =>
              onChange("insuranceCompany", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., State Farm, Prudential, MetLife"
            error={getFieldError("insuranceCompany")}
          />
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Payout Details
        </H4>
        <div className="space-y-4">
          <Input
            label="Death Benefit Amount"
            type="text"
            value={formatNumberWithCommas(formData.payoutAmount || "")}
            onChange={(e) =>
              onChange(
                "payoutAmount",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="500,000"
            error={getFieldError("payoutAmount")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Total death benefit to be paid"
          />

          <Select
            label="Payout Method"
            options={PAYOUT_METHOD_OPTIONS}
            value={payoutMethod}
            onChange={(value) => onChange("payoutMethod", value)}
            placeholder="How the benefit will be paid"
            error={getFieldError("payoutMethod")}
            helperText="Method of benefit distribution"
          />

          {isInstallments && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Monthly Payment Amount"
                type="text"
                value={formatNumberWithCommas(formData.monthlyPayment || "")}
                onChange={(e) =>
                  onChange(
                    "monthlyPayment",
                    parseFormattedNumber((e.target as HTMLInputElement).value)
                  )
                }
                placeholder="5,000"
                leftIcon={<span className="text-text-tertiary">$</span>}
                helperText="For installment payments"
                error={getFieldError("monthlyPayment")}
              />
              <Input
                label="Payment Period (Years)"
                type="number"
                value={formData.paymentPeriodYears || ""}
                onChange={(e) =>
                  onChange("paymentPeriodYears", parseInt((e.target as HTMLInputElement).value))
                }
                placeholder="20"
                helperText="Duration of payments"
                error={getFieldError("paymentPeriodYears")}
              />
            </div>
          )}

          <Select
            label="Destination Account"
            options={ACCOUNT_TYPE_OPTIONS}
            value={formData.targetAccountType || ""}
            onChange={(value) => onChange("targetAccountType", value)}
            placeholder="Account to receive payout"
            error={getFieldError("targetAccountType")}
            helperText="Account where benefit will be deposited"
          />
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Beneficiary & Tax Information
        </H4>
        <div className="space-y-4">
          <Select
            label="Beneficiary Type"
            options={BENEFICIARY_TYPE_OPTIONS}
            value={formData.beneficiaryType || ""}
            onChange={(value) => onChange("beneficiaryType", value)}
            placeholder="Select beneficiary type"
            error={getFieldError("beneficiaryType")}
            helperText="Relationship of the beneficiary to insured"
          />

          <Input
            label="Beneficiary Name"
            value={formData.beneficiaryName || ""}
            onChange={(e) =>
              onChange("beneficiaryName", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Jane Smith, Smith Family Trust"
            error={getFieldError("beneficiaryName")}
          />

          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.taxable || false}
                onChange={(e) => onChange("taxable", e.target.checked)}
                className="rounded border-gray-300 focus:ring-blue-500"
              />
              <BodyBase className="font-medium text-text-primary">Taxable Benefit</BodyBase>
            </label>
            <Caption className="text-text-tertiary">Life insurance death benefits are typically tax-free</Caption>
          </div>
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
          Event Timing
        </H4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Trigger Year"
              type="number"
              value={getYearMonth(formData.startDateOffset).year}
              onChange={(e) =>
                handleYearMonthChange(
                  "startDateOffset",
                  (e.target as HTMLInputElement).value,
                  getYearMonth(formData.startDateOffset).month || "01"
                )
              }
              placeholder="2050"
              error={getFieldError("startDateOffset")}
              helperText="Expected year of claim event"
            />
            <Input
              label="Trigger Month"
              type="number"
              min="1"
              max="12"
              value={getYearMonth(formData.startDateOffset).month}
              onChange={(e) =>
                handleYearMonthChange(
                  "startDateOffset",
                  getYearMonth(formData.startDateOffset).year || "2050",
                  (e.target as HTMLInputElement).value
                )
              }
              placeholder="01"
              error={getFieldError("startDateOffset")}
            />
          </div>

          <Input
            label="Processing Delay (Months)"
            type="number"
            value={formData.processingDelayMonths || ""}
            onChange={(e) =>
              onChange("processingDelayMonths", parseInt((e.target as HTMLInputElement).value))
            }
            placeholder="2"
            helperText="Typical delay between claim and payout (usually 1-3 months)"
            error={getFieldError("processingDelayMonths")}
          />
        </div>
      </div>

      {/* Life Insurance Payout Information Panel */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-green-600">💰</span>
          </div>
          <div className="ml-3">
            <BodyBase className="font-medium text-green-800">
              Life Insurance Payout Information
            </BodyBase>
            <BodyBase className="mt-1 text-green-700">
              <strong>Tax Treatment:</strong> Death benefits are generally income tax-free to beneficiaries<br />
              <strong>Payout Options:</strong> Lump sum, installments, or annuity payments<br />
              <strong>Processing Time:</strong> Claims typically take 1-3 months to process<br />
              <strong>Required Documents:</strong> Death certificate, claim forms, policy documents
            </BodyBase>
            <Caption className="mt-2 text-green-600">
              Consider the beneficiary's financial situation when choosing payout method.
            </Caption>
          </div>
        </div>
      </div>

      {/* Scenario Planning Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-amber-600">⚠️</span>
          </div>
          <div className="ml-3">
            <BodyBase className="font-medium text-amber-800">
              Scenario Planning Note
            </BodyBase>
            <BodyBase className="mt-1 text-amber-700">
              This payout event is typically used for scenario modeling and "what-if" analysis.
              The trigger year should reflect your planning assumptions about life expectancy
              or specific scenario testing.
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};