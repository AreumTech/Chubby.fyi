import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface AnnualGiftFormProps {
  formData: any; // Using any for flexibility with gift-specific properties
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

const ACCOUNT_TYPE_OPTIONS = [
  { value: "cash", label: "Cash/Checking" },
  { value: "taxable", label: "Taxable Investment Account" },
  { value: "tax_deferred", label: "Traditional IRA/401k" },
  { value: "roth", label: "Roth IRA/401k" },
];

const GIFT_TYPE_OPTIONS = [
  { value: "cash", label: "Cash Gift" },
  { value: "securities", label: "Securities/Stocks" },
  { value: "real_estate", label: "Real Estate" },
  { value: "business_interest", label: "Business Interest" },
  { value: "life_insurance", label: "Life Insurance Policy" },
  { value: "trust_funding", label: "Trust Funding" },
  { value: "tuition_payment", label: "Direct Tuition Payment" },
  { value: "medical_payment", label: "Direct Medical Payment" },
  { value: "other", label: "Other Asset" },
];

const RELATIONSHIP_OPTIONS = [
  { value: "child", label: "Child" },
  { value: "grandchild", label: "Grandchild" },
  { value: "spouse", label: "Spouse" },
  { value: "parent", label: "Parent" },
  { value: "sibling", label: "Sibling" },
  { value: "family_member", label: "Other Family Member" },
  { value: "friend", label: "Friend" },
  { value: "charity", label: "Charitable Organization" },
  { value: "trust", label: "Trust" },
];

const FREQUENCY_OPTIONS = [
  { value: "annually", label: "Annually" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "one_time", label: "One-time Gift" },
];

export const AnnualGiftForm: React.FC<AnnualGiftFormProps> = ({
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
    EventType.ANNUAL_GIFT
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Set default values
  useEffect(() => {
    if (formData.taxable === undefined) {
      const isCharitableGift = formData.recipientRelationship === "charity";
      onChange("taxable", false); // Gifts are generally not taxable to recipient
    }
    if (!formData.frequency) {
      onChange("frequency", "annually");
    }
    if (!formData.giftType) {
      onChange("giftType", "cash");
    }
  }, [formData.taxable, formData.frequency, formData.giftType, formData.recipientRelationship, onChange]);

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

  const frequency = formData.frequency || "annually";
  const isOneTime = frequency === "one_time";
  const giftType = formData.giftType || "cash";
  const isDirectPayment = giftType === "tuition_payment" || giftType === "medical_payment";
  const isCharitableGift = formData.recipientRelationship === "charity";

  return (
    <div className="space-y-6">
      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Gift Recipient Information
        </H4>
        <div className="space-y-4">
          <Input
            label="Recipient Name"
            value={formData.recipientName || ""}
            onChange={(e) =>
              onChange("recipientName", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., John Doe Jr., ABC Charity"
            error={getFieldError("recipientName")}
          />

          <Select
            label="Relationship to Recipient"
            options={RELATIONSHIP_OPTIONS}
            value={formData.recipientRelationship || ""}
            onChange={(value) => onChange("recipientRelationship", value)}
            placeholder="Select relationship"
            error={getFieldError("recipientRelationship")}
            helperText="Relationship affects gift tax exclusions and exemptions"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Recipient Age"
              type="number"
              min="0"
              max="120"
              value={formData.recipientAge || ""}
              onChange={(e) =>
                onChange("recipientAge", parseInt((e.target as HTMLInputElement).value))
              }
              placeholder="25"
              helperText="Age may affect gift strategies"
              error={getFieldError("recipientAge")}
            />
            <Input
              label="Recipient SSN/EIN (Optional)"
              value={formData.recipientTaxId || ""}
              onChange={(e) =>
                onChange("recipientTaxId", (e.target as HTMLInputElement).value)
              }
              placeholder="XXX-XX-XXXX or XX-XXXXXXX"
              helperText="Required for gift tax reporting"
              error={getFieldError("recipientTaxId")}
            />
          </div>
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Gift Details
        </H4>
        <div className="space-y-4">
          <Select
            label="Type of Gift"
            options={GIFT_TYPE_OPTIONS}
            value={giftType}
            onChange={(value) => onChange("giftType", value)}
            placeholder="Select gift type"
            error={getFieldError("giftType")}
            helperText="Type of asset being gifted"
          />

          <Select
            label="Gift Frequency"
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={(value) => onChange("frequency", value)}
            error={getFieldError("frequency")}
          />

          <Input
            label={`Gift Amount (${isOneTime ? "Total" : frequency === "annually" ? "Annual" : frequency === "quarterly" ? "Quarterly" : "Monthly"})`}
            type="text"
            value={formatNumberWithCommas(formData.amount || "")}
            onChange={(e) =>
              onChange(
                "amount",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder={isOneTime ? "50,000" : frequency === "annually" ? "18,000" : frequency === "quarterly" ? "4,500" : "1,500"}
            error={getFieldError("amount")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText={`${isOneTime ? "One-time" : frequency === "annually" ? "Annual" : frequency === "quarterly" ? "Quarterly" : "Monthly"} gift amount`}
          />

          {giftType !== "cash" && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Asset Description"
                value={formData.assetDescription || ""}
                onChange={(e) =>
                  onChange("assetDescription", (e.target as HTMLInputElement).value)
                }
                placeholder="e.g., 100 shares of AAPL, 123 Main St property"
                error={getFieldError("assetDescription")}
                helperText="Description of the non-cash asset"
              />
              <Input
                label="Asset Fair Market Value"
                type="text"
                value={formatNumberWithCommas(formData.fairMarketValue || "")}
                onChange={(e) =>
                  onChange(
                    "fairMarketValue",
                    parseFormattedNumber((e.target as HTMLInputElement).value)
                  )
                }
                placeholder="18,000"
                leftIcon={<span className="text-text-tertiary">$</span>}
                helperText="FMV on date of gift (for gift tax purposes)"
                error={getFieldError("fairMarketValue")}
              />
            </div>
          )}

          <Select
            label="Source Account"
            options={ACCOUNT_TYPE_OPTIONS}
            value={formData.sourceAccountType || ""}
            onChange={(value) => onChange("sourceAccountType", value)}
            placeholder="Account to gift from"
            error={getFieldError("sourceAccountType")}
            helperText="Account where gift funds/assets will come from"
          />
        </div>
      </div>

      {isDirectPayment && (
        <div>
          <H4 className="mb-4 flex items-center">
            <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
            Direct Payment Details
          </H4>
          <div className="space-y-4">
            <Input
              label={giftType === "tuition_payment" ? "Educational Institution" : "Healthcare Provider"}
              value={formData.paymentRecipient || ""}
              onChange={(e) =>
                onChange("paymentRecipient", (e.target as HTMLInputElement).value)
              }
              placeholder={giftType === "tuition_payment" ? "University of Virginia" : "Regional Medical Center"}
              error={getFieldError("paymentRecipient")}
              helperText="Institution receiving direct payment"
            />

            <Input
              label={giftType === "tuition_payment" ? "Student Account Number" : "Patient Account Number"}
              value={formData.accountNumber || ""}
              onChange={(e) =>
                onChange("accountNumber", (e.target as HTMLInputElement).value)
              }
              placeholder="Student/Patient ID"
              error={getFieldError("accountNumber")}
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <BodyBase className="text-blue-800">
                <strong>Unlimited Gift Tax Exclusion:</strong> Direct payments to educational institutions for tuition 
                and medical providers for medical care are excluded from gift tax limits and don't count toward 
                the annual gift tax exclusion.
              </BodyBase>
            </div>
          </div>
        </div>
      )}

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Tax Considerations
        </H4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Annual Gift Tax Exclusion (2024)"
              type="text"
              value={formatNumberWithCommas(formData.annualExclusion || "18000")}
              onChange={(e) =>
                onChange(
                  "annualExclusion",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="18,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="2024 annual gift tax exclusion per recipient"
              error={getFieldError("annualExclusion")}
            />
            <Input
              label="Lifetime Exemption Used"
              type="text"
              value={formatNumberWithCommas(formData.lifetimeExemptionUsed || "")}
              onChange={(e) =>
                onChange(
                  "lifetimeExemptionUsed",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="0"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Amount of lifetime exemption used for this gift"
              error={getFieldError("lifetimeExemptionUsed")}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="splitGift"
              checked={formData.splitGift || false}
              onChange={(e) => onChange("splitGift", e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <label htmlFor="splitGift" className="text-sm font-medium text-gray-700">
                Split Gift with Spouse
              </label>
              <Caption color="tertiary" className="block">
                Doubles annual exclusion to $36,000 per recipient (married couples only)
              </Caption>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="charitableDeduction"
              checked={formData.charitableDeduction || false}
              onChange={(e) => onChange("charitableDeduction", e.target.checked)}
              disabled={!isCharitableGift}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
            />
            <div>
              <label htmlFor="charitableDeduction" className="text-sm font-medium text-gray-700">
                Charitable Gift Tax Deduction
              </label>
              <Caption color="tertiary" className="block">
                Claim tax deduction for charitable gifts
              </Caption>
            </div>
          </div>

          {formData.charitableDeduction && (
            <Input
              label="Charitable Deduction Amount"
              type="text"
              value={formatNumberWithCommas(formData.charitableDeductionAmount || "")}
              onChange={(e) =>
                onChange(
                  "charitableDeductionAmount",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="18,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Tax deduction amount for charitable gift"
              error={getFieldError("charitableDeductionAmount")}
            />
          )}
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
          Gift Timeline
        </H4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Gift Start Year"
              type="number"
              value={getYearMonth(formData.startDateOffset).year}
              onChange={(e) =>
                handleYearMonthChange(
                  "startDateOffset",
                  (e.target as HTMLInputElement).value,
                  getYearMonth(formData.startDateOffset).month || "12"
                )
              }
              placeholder="2024"
              error={getFieldError("startDateOffset")}
              helperText="When gift-giving begins"
            />
            <Input
              label="Gift Start Month"
              type="number"
              min="1"
              max="12"
              value={getYearMonth(formData.startDateOffset).month}
              onChange={(e) =>
                handleYearMonthChange(
                  "startDateOffset",
                  getYearMonth(formData.startDateOffset).year || "2024",
                  (e.target as HTMLInputElement).value
                )
              }
              placeholder="12"
              helperText="Month for annual gifts"
              error={getFieldError("startDateOffset")}
            />
          </div>

          {!isOneTime && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="End Year (Optional)"
                type="number"
                value={getYearMonth(formData.endDateOffset).year}
                onChange={(e) =>
                  handleYearMonthChange(
                    "endDateOffset",
                    (e.target as HTMLInputElement).value,
                    getYearMonth(formData.endDateOffset).month || "12"
                  )
                }
                placeholder="Leave blank for indefinite gifts"
                error={getFieldError("endDateOffset")}
              />
              <Input
                label="Annual Gift Growth Rate"
                type="number"
                step="0.01"
                value={formData.annualGrowthRate || ""}
                onChange={(e) =>
                  onChange("annualGrowthRate", parseFloat((e.target as HTMLInputElement).value))
                }
                placeholder="3.0"
                rightIcon={<span className="text-text-tertiary">%</span>}
                helperText="Annual increase in gift amount"
                error={getFieldError("annualGrowthRate")}
              />
            </div>
          )}

          <Input
            label="Gift Purpose/Notes"
            value={formData.giftPurpose || ""}
            onChange={(e) =>
              onChange("giftPurpose", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Education funding, Home down payment, General support"
            error={getFieldError("giftPurpose")}
            helperText="Purpose or notes about the gift"
          />
        </div>
      </div>

      {/* Gift Tax Information Panel */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-green-600">🎁</span>
          </div>
          <div className="ml-3">
            <BodyBase weight="medium" className="text-green-800">
              Gift Tax Rules (2024)
            </BodyBase>
            <BodyBase className="mt-1 text-green-700">
              <strong>Annual Exclusion:</strong> $18,000 per recipient ($36,000 for married couples)<br />
              <strong>Lifetime Exemption:</strong> $13.61M per person ($27.22M for couples)<br />
              <strong>Direct Payments:</strong> Unlimited for tuition and medical expenses<br />
              <strong>Charitable Gifts:</strong> Unlimited deduction for qualified charities
            </BodyBase>
            <Caption className="mt-2 text-green-600">
              Gifts above annual exclusion require Form 709 filing and use lifetime exemption.
            </Caption>
          </div>
        </div>
      </div>

      {/* Strategic Giving Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-600">💡</span>
          </div>
          <div className="ml-3">
            <BodyBase weight="medium" className="text-blue-800">
              Strategic Gifting Considerations
            </BodyBase>
            <BodyBase className="mt-1 text-blue-700">
              • <strong>Timing:</strong> Make gifts by December 31st to use annual exclusion<br />
              • <strong>Appreciating Assets:</strong> Gift assets likely to appreciate to remove future growth from estate<br />
              • <strong>Generation-Skipping:</strong> Consider GST tax for gifts to grandchildren<br />
              • <strong>Basis Step-up:</strong> Highly appreciated assets may be better kept for inheritance
            </BodyBase>
          </div>
        </div>
      </div>

      {/* Asset-Specific Considerations */}
      {giftType === "securities" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-amber-600">📈</span>
            </div>
            <div className="ml-3">
              <BodyBase weight="medium" className="text-amber-800">
                Securities Gift Considerations
              </BodyBase>
              <BodyBase className="mt-1 text-amber-700">
                <strong>Valuation:</strong> Use average high/low on gift date<br />
                <strong>Cost Basis:</strong> Recipient inherits your cost basis<br />
                <strong>Timing:</strong> Consider gifting depreciated assets vs. selling for tax loss<br />
                <strong>Documentation:</strong> Keep records of cost basis and gift date valuation
              </BodyBase>
            </div>
          </div>
        </div>
      )}

      {isCharitableGift && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-purple-600">❤️</span>
            </div>
            <div className="ml-3">
              <BodyBase weight="medium" className="text-purple-800">
                Charitable Giving Benefits
              </BodyBase>
              <BodyBase className="mt-1 text-purple-700">
                <strong>Tax Deduction:</strong> Up to 50-60% of AGI for cash gifts<br />
                <strong>No Gift Tax:</strong> Unlimited gifts to qualified 501(c)(3) organizations<br />
                <strong>Estate Reduction:</strong> Removes assets from taxable estate<br />
                <strong>Advanced Strategies:</strong> Consider donor advised funds, charitable trusts
              </BodyBase>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};