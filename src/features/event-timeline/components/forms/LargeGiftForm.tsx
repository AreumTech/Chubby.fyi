import React, { useEffect } from "react";
import { Input, Select, Checkbox } from "@/components/ui";
import { H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface LargeGiftFormProps {
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
  { value: "business_interest", label: "Business Interest/Partnership" },
  { value: "private_equity", label: "Private Equity/Venture Capital" },
  { value: "collectibles", label: "Art/Collectibles" },
  { value: "life_insurance", label: "Life Insurance Policy" },
  { value: "trust_assets", label: "Trust Assets" },
  { value: "family_limited_partnership", label: "Family Limited Partnership Interest" },
  { value: "other", label: "Other Significant Asset" },
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
  { value: "dynasty_trust", label: "Dynasty Trust" },
  { value: "charitable_trust", label: "Charitable Trust" },
];

const GIFT_STRATEGY_OPTIONS = [
  { value: "outright", label: "Outright Gift" },
  { value: "installment_sale", label: "Installment Sale to Family" },
  { value: "grat", label: "Grantor Retained Annuity Trust (GRAT)" },
  { value: "clat", label: "Charitable Lead Annuity Trust (CLAT)" },
  { value: "crut", label: "Charitable Remainder Unitrust (CRUT)" },
  { value: "crat", label: "Charitable Remainder Annuity Trust (CRAT)" },
  { value: "qualified_personal_residence", label: "Qualified Personal Residence Trust (QPRT)" },
  { value: "intentionally_defective_trust", label: "Intentionally Defective Grantor Trust (IDGT)" },
  { value: "family_limited_partnership", label: "Family Limited Partnership" },
];

export const LargeGiftForm: React.FC<LargeGiftFormProps> = ({
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
    EventType.LARGE_GIFT
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Set default values
  useEffect(() => {
    if (formData.taxable === undefined) {
      onChange("taxable", false); // Large gifts are generally not taxable to recipient
    }
    if (!formData.giftStrategy) {
      onChange("giftStrategy", "outright");
    }
    if (!formData.giftType) {
      onChange("giftType", "cash");
    }
  }, [formData.taxable, formData.giftStrategy, formData.giftType, onChange]);

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

  const giftStrategy = formData.giftStrategy || "outright";
  const giftType = formData.giftType || "cash";
  const isCharitableGift = formData.recipientRelationship === "charity" || 
                           formData.recipientRelationship === "charitable_trust";
  const requiresAppraisal = giftType !== "cash" && giftType !== "securities";

  return (
    <div className="space-y-6">
      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Large Gift Recipients & Structure
        </H4>
        <div className="space-y-4">
          <Input
            label="Primary Recipient Name"
            value={formData.recipientName || ""}
            onChange={(e) =>
              onChange("recipientName", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., John Doe Jr., Smith Family Trust"
            error={getFieldError("recipientName")}
          />

          <Select
            label="Relationship to Recipient"
            options={RELATIONSHIP_OPTIONS}
            value={formData.recipientRelationship || ""}
            onChange={(value) => onChange("recipientRelationship", value)}
            placeholder="Select relationship"
            error={getFieldError("recipientRelationship")}
            helperText="Relationship affects gift and generation-skipping transfer tax"
          />

          <Select
            label="Gift Strategy/Structure"
            options={GIFT_STRATEGY_OPTIONS}
            value={giftStrategy}
            onChange={(value) => onChange("giftStrategy", value)}
            placeholder="Select gifting strategy"
            error={getFieldError("giftStrategy")}
            helperText="Advanced strategies can reduce gift tax impact"
          />

          {formData.recipientRelationship === "grandchild" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <BodyBase className=" text-amber-800">
                <strong>Generation-Skipping Transfer Tax:</strong> Gifts to grandchildren may be subject 
                to GST tax in addition to gift tax. Consider using GST exemption ($13.61M in 2024).
              </BodyBase>
            </div>
          )}
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Large Gift Asset Details
        </H4>
        <div className="space-y-4">
          <Select
            label="Type of Asset Being Gifted"
            options={GIFT_TYPE_OPTIONS}
            value={giftType}
            onChange={(value) => onChange("giftType", value)}
            placeholder="Select asset type"
            error={getFieldError("giftType")}
            helperText="Type of asset affects valuation and tax treatment"
          />

          <Input
            label="Gift Amount/Value"
            type="text"
            value={formatNumberWithCommas(formData.amount || "")}
            onChange={(e) =>
              onChange(
                "amount",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="1,000,000"
            error={getFieldError("amount")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Fair market value of the gift on date of transfer"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Asset Description"
              value={formData.assetDescription || ""}
              onChange={(e) =>
                onChange("assetDescription", (e.target as HTMLInputElement).value)
              }
              placeholder="e.g., 1000 shares AAPL, 123 Oak Street Property"
              error={getFieldError("assetDescription")}
              helperText="Detailed description of the gifted asset"
            />
            <Input
              label="Your Cost Basis"
              type="text"
              value={formatNumberWithCommas(formData.costBasis || "")}
              onChange={(e) =>
                onChange(
                  "costBasis",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="500,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Your original cost in the asset"
              error={getFieldError("costBasis")}
            />
          </div>

          <Select
            label="Source Account/Asset Location"
            options={ACCOUNT_TYPE_OPTIONS}
            value={formData.sourceAccountType || ""}
            onChange={(value) => onChange("sourceAccountType", value)}
            placeholder="Account where asset is held"
            error={getFieldError("sourceAccountType")}
            helperText="Location of the asset being gifted"
          />
        </div>
      </div>

      {requiresAppraisal && (
        <div>
          <H4 className="mb-4 flex items-center">
            <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
            Valuation & Appraisal
          </H4>
          <div className="space-y-4">
            <Input
              label="Professional Appraiser"
              value={formData.appraiserName || ""}
              onChange={(e) =>
                onChange("appraiserName", (e.target as HTMLInputElement).value)
              }
              placeholder="e.g., ABC Valuation Services"
              error={getFieldError("appraiserName")}
              helperText="Qualified appraiser for non-cash assets"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Appraisal Date"
                type="date"
                value={formData.appraisalDate || ""}
                onChange={(e) =>
                  onChange("appraisalDate", (e.target as HTMLInputElement).value)
                }
                error={getFieldError("appraisalDate")}
                helperText="Date of professional appraisal"
              />
              <Input
                label="Appraised Value"
                type="text"
                value={formatNumberWithCommas(formData.appraisedValue || "")}
                onChange={(e) =>
                  onChange(
                    "appraisedValue",
                    parseFormattedNumber((e.target as HTMLInputElement).value)
                  )
                }
                placeholder="950,000"
                leftIcon={<span className="text-text-tertiary">$</span>}
                helperText="Professional appraised fair market value"
                error={getFieldError("appraisedValue")}
              />
            </div>

            <Input
              label="Valuation Discounts Applied"
              type="number"
              step="0.1"
              value={formData.valuationDiscount || ""}
              onChange={(e) =>
                onChange("valuationDiscount", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="25.0"
              rightIcon={<span className="text-text-tertiary">%</span>}
              helperText="Discounts for marketability, minority interest, etc."
              error={getFieldError("valuationDiscount")}
            />
          </div>
        </div>
      )}

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
          Gift & Estate Tax Impact
        </H4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Gift Tax Due"
              type="text"
              value={formatNumberWithCommas(formData.giftTaxDue || "")}
              onChange={(e) =>
                onChange(
                  "giftTaxDue",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="150,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Estimated gift tax owed on this transfer"
              error={getFieldError("giftTaxDue")}
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
              placeholder="982,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Amount of lifetime exemption used for this gift"
              error={getFieldError("lifetimeExemptionUsed")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Remaining Lifetime Exemption"
              type="text"
              value={formatNumberWithCommas(formData.remainingExemption || "")}
              onChange={(e) =>
                onChange(
                  "remainingExemption",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="12,628,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Remaining federal lifetime gift/estate exemption"
              error={getFieldError("remainingExemption")}
            />
            <Input
              label="GST Tax Due (if applicable)"
              type="text"
              value={formatNumberWithCommas(formData.gstTaxDue || "")}
              onChange={(e) =>
                onChange(
                  "gstTaxDue",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="0"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Generation-skipping transfer tax for grandchildren"
              error={getFieldError("gstTaxDue")}
            />
          </div>

          <Checkbox
            label="Split Gift with Spouse"
            checked={formData.splitGift || false}
            onChange={(checked) => onChange("splitGift", checked)}
            helperText="Both spouses consent to treat gift as made half by each"
          />

          <Checkbox
            label="File Form 709 (Gift Tax Return)"
            checked={formData.fileGiftTaxReturn || false}
            onChange={(checked) => onChange("fileGiftTaxReturn", checked)}
            helperText="Required for gifts exceeding annual exclusion"
          />
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Gift Execution Timeline
        </H4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Gift Execution Year"
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
              helperText="Year when large gift is executed"
            />
            <Input
              label="Gift Execution Month"
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
              error={getFieldError("startDateOffset")}
            />
          </div>

          <Input
            label="Gift Purpose & Strategy Notes"
            value={formData.giftPurpose || ""}
            onChange={(e) =>
              onChange("giftPurpose", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Estate tax reduction, succession planning, charitable giving"
            error={getFieldError("giftPurpose")}
            helperText="Strategic purpose and additional notes"
          />

          <Input
            label="Professional Advisors"
            value={formData.advisors || ""}
            onChange={(e) =>
              onChange("advisors", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Estate Attorney: John Smith, CPA: ABC Firm"
            error={getFieldError("advisors")}
            helperText="Key professionals involved in gift planning"
          />
        </div>
      </div>

      {/* Large Gift Tax Information */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-red-600">⚠️</span>
          </div>
          <div className="ml-3">
            <BodyBase className="font-medium text-red-800">
              Large Gift Tax Implications (2024)
            </BodyBase>
            <BodyBase className="mt-1 text-red-700">
              <strong>Federal Gift Tax Rate:</strong> 18-40% on gifts exceeding lifetime exemption<br />
              <strong>Lifetime Exemption:</strong> $13.61M per person ($27.22M for couples)<br />
              <strong>Form 709 Due:</strong> April 15th following year of gift (extensions available)<br />
              <strong>GST Tax:</strong> Additional 40% tax on gifts to grandchildren exceeding GST exemption
            </BodyBase>
            <Caption className="mt-2 text-red-600">
              Large gifts require careful planning and professional guidance to minimize tax impact.
            </Caption>
          </div>
        </div>
      </div>

      {/* Advanced Strategy Information */}
      {giftStrategy !== "outright" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-blue-600">🧠</span>
            </div>
            <div className="ml-3">
              <BodyBase className="font-medium text-blue-800">
                Advanced Gifting Strategy: {giftStrategy.toUpperCase().replace(/_/g, ' ')}
              </BodyBase>
              <BodyBase as="div" className="mt-1 text-blue-700">
                {giftStrategy === "grat" && (
                  <p><strong>GRAT:</strong> Transfer appreciating assets while retaining annuity payments. Excess appreciation passes gift-tax free to beneficiaries.</p>
                )}
                {giftStrategy === "installment_sale" && (
                  <p><strong>Installment Sale:</strong> Sell assets to family members over time, often at favorable terms. Future appreciation benefits family.</p>
                )}
                {giftStrategy === "clat" && (
                  <p><strong>CLAT:</strong> Provides income to charity for a term, then remainder to family at reduced gift tax value.</p>
                )}
                {(giftStrategy === "crut" || giftStrategy === "crat") && (
                  <p><strong>CRT:</strong> Provides income to donor, charitable deduction, and remainder to charity. Can be combined with life insurance.</p>
                )}
                {giftStrategy === "qualified_personal_residence" && (
                  <p><strong>QPRT:</strong> Transfer residence while retaining right to live there. Reduces gift value and removes future appreciation from estate.</p>
                )}
                {giftStrategy === "intentionally_defective_trust" && (
                  <p><strong>IDGT:</strong> Grantor pays income taxes on trust earnings, providing additional tax-free benefit to beneficiaries.</p>
                )}
              </BodyBase>
            </div>
          </div>
        </div>
      )}

      {/* Valuation Considerations */}
      {requiresAppraisal && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-amber-600">📊</span>
            </div>
            <div className="ml-3">
              <BodyBase className="font-medium text-amber-800">
                Valuation Requirements & Strategies
              </BodyBase>
              <BodyBase className="mt-1 text-amber-700">
                <strong>Qualified Appraisal:</strong> Required for non-cash gifts over $5,000<br />
                <strong>Valuation Date:</strong> Use date of gift, not date of appraisal<br />
                <strong>Discounts Available:</strong> Lack of marketability, minority interest, key person<br />
                <strong>IRS Challenge:</strong> Conservative valuations reduce audit risk
              </BodyBase>
              <Caption className="mt-2 text-amber-600">
                Consider timing gifts when asset values are temporarily depressed to maximize exemption usage.
              </Caption>
            </div>
          </div>
        </div>
      )}

      {isCharitableGift && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-600">❤️</span>
            </div>
            <div className="ml-3">
              <BodyBase className="font-medium text-green-800">
                Large Charitable Gift Benefits
              </BodyBase>
              <BodyBase className="mt-1 text-green-700">
                <strong>Unlimited Deduction:</strong> No limit on charitable gifts to qualified organizations<br />
                <strong>No Gift Tax:</strong> Charitable gifts don't count toward gift tax exemption<br />
                <strong>Income Tax Benefit:</strong> Deduction up to 30-60% of AGI depending on asset type<br />
                <strong>Estate Tax:</strong> Reduces taxable estate dollar-for-dollar
              </BodyBase>
            </div>
          </div>
        </div>
      )}

      {/* Professional Guidance Note */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-purple-600">⚖️</span>
          </div>
          <div className="ml-3">
            <BodyBase className="font-medium text-purple-800">
              Professional Guidance Essential
            </BodyBase>
            <BodyBase className="mt-1 text-purple-700">
              Large gifts have significant tax, legal, and family implications. Work with qualified 
              estate planning attorneys, CPAs, and financial advisors to structure gifts optimally 
              and ensure compliance with complex tax rules. Consider state gift taxes where applicable.
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};