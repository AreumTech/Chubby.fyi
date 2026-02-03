import React, { useEffect } from "react";
import { Input, Select, Checkbox } from "@/components/ui";
import { H3, H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface InheritanceFormProps {
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
  { value: "tax_deferred", label: "Inherited Traditional IRA" },
  { value: "roth", label: "Inherited Roth IRA" },
];

const ASSET_TYPE_OPTIONS = [
  { value: "cash", label: "Cash & Bank Accounts" },
  { value: "securities", label: "Securities & Stocks" },
  { value: "retirement_accounts", label: "Retirement Accounts" },
  { value: "real_estate", label: "Real Estate" },
  { value: "business_interest", label: "Business Interest" },
  { value: "personal_property", label: "Personal Property" },
  { value: "life_insurance", label: "Life Insurance Proceeds" },
  { value: "trust_distribution", label: "Trust Distribution" },
  { value: "collectibles", label: "Art & Collectibles" },
  { value: "other", label: "Other Assets" },
];

const RELATIONSHIP_OPTIONS = [
  { value: "spouse", label: "Spouse" },
  { value: "parent", label: "Parent" },
  { value: "grandparent", label: "Grandparent" },
  { value: "child", label: "Child" },
  { value: "sibling", label: "Sibling" },
  { value: "family_member", label: "Other Family Member" },
  { value: "friend", label: "Friend" },
  { value: "trust", label: "Trust Beneficiary" },
  { value: "charitable", label: "Charitable Bequest" },
];

const DISTRIBUTION_TYPE_OPTIONS = [
  { value: "outright", label: "Outright Distribution" },
  { value: "installments", label: "Installment Payments" },
  { value: "trust_income", label: "Trust Income Only" },
  { value: "trust_principal", label: "Trust Principal Distribution" },
  { value: "life_estate", label: "Life Estate Interest" },
  { value: "remainder", label: "Remainder Interest" },
];

export const InheritanceForm: React.FC<InheritanceFormProps> = ({
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
    EventType.INHERITANCE
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Set default values
  useEffect(() => {
    if (formData.taxable === undefined) {
      const assetType = formData.assetType;
      // Most inheritances get stepped-up basis and are not immediately taxable
      const isTaxable = assetType === "retirement_accounts";
      onChange("taxable", isTaxable);
    }
    if (!formData.assetType) {
      onChange("assetType", "cash");
    }
    if (!formData.distributionType) {
      onChange("distributionType", "outright");
    }
  }, [formData.taxable, formData.assetType, formData.distributionType, onChange]);

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

  const assetType = formData.assetType || "cash";
  const isRetirementAccount = assetType === "retirement_accounts";
  const isRealEstate = assetType === "real_estate";
  const distributionType = formData.distributionType || "outright";
  const isInstallmentPayments = distributionType === "installments";
  const steppedUpBasis = !isRetirementAccount;

  return (
    <div className="space-y-6">
      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Inheritance Source Information
        </H4>
        <div className="space-y-4">
          <Input
            label="Deceased Person's Name"
            value={formData.deceasedName || ""}
            onChange={(e) =>
              onChange("deceasedName", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., John Smith Sr."
            error={getFieldError("deceasedName")}
          />

          <Select
            label="Relationship to Deceased"
            options={RELATIONSHIP_OPTIONS}
            value={formData.deceasedRelationship || ""}
            onChange={(value) => onChange("deceasedRelationship", value)}
            placeholder="Select relationship"
            error={getFieldError("deceasedRelationship")}
            helperText="Relationship affects estate tax exemptions and tax treatment"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Estate Size (Total)"
              type="text"
              value={formatNumberWithCommas(formData.totalEstateSize || "")}
              onChange={(e) =>
                onChange(
                  "totalEstateSize",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="2,500,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Total size of the deceased's estate"
              error={getFieldError("totalEstateSize")}
            />
            <Input
              label="Your Share Percentage"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={formData.inheritancePercentage || ""}
              onChange={(e) =>
                onChange("inheritancePercentage", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="25.0"
              rightIcon={<span className="text-text-tertiary">%</span>}
              helperText="Your percentage of the total estate"
              error={getFieldError("inheritancePercentage")}
            />
          </div>
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Inherited Asset Details
        </H4>
        <div className="space-y-4">
          <Select
            label="Type of Asset Inherited"
            options={ASSET_TYPE_OPTIONS}
            value={assetType}
            onChange={(value) => onChange("assetType", value)}
            placeholder="Select asset type"
            error={getFieldError("assetType")}
            helperText="Type of asset affects tax treatment and distribution options"
          />

          <Input
            label="Inheritance Value"
            type="text"
            value={formatNumberWithCommas(formData.amount || "")}
            onChange={(e) =>
              onChange(
                "amount",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="500,000"
            error={getFieldError("amount")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Fair market value of your inheritance on date of death"
          />

          <Input
            label="Asset Description"
            value={formData.assetDescription || ""}
            onChange={(e) =>
              onChange("assetDescription", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Family home, Portfolio of blue-chip stocks, Traditional IRA"
            error={getFieldError("assetDescription")}
            helperText="Detailed description of the inherited asset"
          />

          <Select
            label="Distribution Type"
            options={DISTRIBUTION_TYPE_OPTIONS}
            value={distributionType}
            onChange={(value) => onChange("distributionType", value)}
            placeholder="How inheritance is distributed"
            error={getFieldError("distributionType")}
            helperText="Method of receiving the inheritance"
          />

          <Select
            label="Destination Account"
            options={ACCOUNT_TYPE_OPTIONS}
            value={formData.targetAccountType || ""}
            onChange={(value) => onChange("targetAccountType", value)}
            placeholder="Account to receive inheritance"
            error={getFieldError("targetAccountType")}
            helperText="Where inheritance proceeds will be deposited"
          />
        </div>
      </div>

      {isRetirementAccount && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
            Inherited Retirement Account Rules
          </h3>
          <div className="space-y-4">
            <Input
              label="Deceased's Age at Death"
              type="number"
              min="0"
              max="120"
              value={formData.deceasedAge || ""}
              onChange={(e) =>
                onChange("deceasedAge", parseInt((e.target as HTMLInputElement).value))
              }
              placeholder="75"
              helperText="Age affects required distribution rules"
              error={getFieldError("deceasedAge")}
            />

            <Checkbox
              label="Spouse Beneficiary (Rollover Available)"
              checked={formData.spouseBeneficiary || false}
              onChange={(checked) => onChange("spouseBeneficiary", checked)}
              helperText="Spouses can roll inherited accounts into their own IRAs"
              disabled={formData.deceasedRelationship !== "spouse"}
            />

            <Checkbox
              label="10-Year Distribution Rule Applies"
              checked={formData.tenYearRule || false}
              onChange={(checked) => onChange("tenYearRule", checked)}
              helperText="Most non-spouse beneficiaries must withdraw within 10 years"
            />

            <Input
              label="Required Minimum Distribution"
              type="text"
              value={formatNumberWithCommas(formData.requiredDistribution || "")}
              onChange={(e) =>
                onChange(
                  "requiredDistribution",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="25,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Annual RMD required from inherited account"
              error={getFieldError("requiredDistribution")}
            />
          </div>
        </div>
      )}

      {isRealEstate && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
            Inherited Real Estate Details
          </h3>
          <div className="space-y-4">
            <Input
              label="Property Address"
              value={formData.propertyAddress || ""}
              onChange={(e) =>
                onChange("propertyAddress", (e.target as HTMLInputElement).value)
              }
              placeholder="123 Main Street, City, State"
              error={getFieldError("propertyAddress")}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Appraised Value at Death"
                type="text"
                value={formatNumberWithCommas(formData.deathDateValue || "")}
                onChange={(e) =>
                  onChange(
                    "deathDateValue",
                    parseFormattedNumber((e.target as HTMLInputElement).value)
                  )
                }
                placeholder="450,000"
                leftIcon={<span className="text-text-tertiary">$</span>}
                helperText="Property value on date of death (stepped-up basis)"
                error={getFieldError("deathDateValue")}
              />
              <Input
                label="Deceased's Original Basis"
                type="text"
                value={formatNumberWithCommas(formData.originalBasis || "")}
                onChange={(e) =>
                  onChange(
                    "originalBasis",
                    parseFormattedNumber((e.target as HTMLInputElement).value)
                  )
                }
                placeholder="200,000"
                leftIcon={<span className="text-text-tertiary">$</span>}
                helperText="What the deceased originally paid for the property"
                error={getFieldError("originalBasis")}
              />
            </div>

            <Checkbox
              label="Planning to Sell Property"
              checked={formData.planningSale || false}
              onChange={(checked) => onChange("planningSale", checked)}
              helperText="Convert inherited real estate to cash"
            />

            <Checkbox
              label="Keep as Rental Property"
              checked={formData.keepAsRental || false}
              onChange={(checked) => onChange("keepAsRental", checked)}
              helperText="Generate rental income from inherited property"
            />
          </div>
        </div>
      )}

      {isInstallmentPayments && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
            Installment Payment Schedule
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Payment Frequency"
                value={formData.paymentFrequency || ""}
                onChange={(e) =>
                  onChange("paymentFrequency", (e.target as HTMLInputElement).value)
                }
                placeholder="Annually"
                error={getFieldError("paymentFrequency")}
                helperText="How often payments are received"
              />
              <Input
                label="Number of Payments"
                type="number"
                min="1"
                value={formData.numberOfPayments || ""}
                onChange={(e) =>
                  onChange("numberOfPayments", parseInt((e.target as HTMLInputElement).value))
                }
                placeholder="5"
                helperText="Total number of installment payments"
                error={getFieldError("numberOfPayments")}
              />
            </div>

            <Input
              label="Payment Amount"
              type="text"
              value={formatNumberWithCommas(formData.paymentAmount || "")}
              onChange={(e) =>
                onChange(
                  "paymentAmount",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="100,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Amount of each installment payment"
              error={getFieldError("paymentAmount")}
            />
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
          Tax Implications & Estate Administration
        </h3>
        <div className="space-y-4">
          <Checkbox
            label="Stepped-up Cost Basis"
            checked={formData.steppedUpBasis || steppedUpBasis}
            onChange={(checked) => onChange("steppedUpBasis", checked)}
            helperText="Asset basis stepped up to fair market value at death"
            disabled={isRetirementAccount}
          />

          <Checkbox
            label="Subject to Estate Tax"
            checked={formData.subjectToEstateTax || false}
            onChange={(checked) => onChange("subjectToEstateTax", checked)}
            helperText="Estate large enough to owe federal estate tax"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Estate Tax Paid"
              type="text"
              value={formatNumberWithCommas(formData.estateTaxPaid || "")}
              onChange={(e) =>
                onChange(
                  "estateTaxPaid",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="0"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Federal estate tax paid by the estate"
              error={getFieldError("estateTaxPaid")}
            />
            <Input
              label="State Death Tax Paid"
              type="text"
              value={formatNumberWithCommas(formData.stateDeathTax || "")}
              onChange={(e) =>
                onChange(
                  "stateDeathTax",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="0"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="State inheritance or estate tax paid"
              error={getFieldError("stateDeathTax")}
            />
          </div>

          <Input
            label="Estate Administration Costs"
            type="text"
            value={formatNumberWithCommas(formData.administrationCosts || "")}
            onChange={(e) =>
              onChange(
                "administrationCosts",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="15,000"
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Legal, accounting, and administrative costs"
            error={getFieldError("administrationCosts")}
          />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          <div className="w-2 h-2 bg-gray-500 rounded-full mr-3"></div>
          Inheritance Timeline & Details
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date of Death"
              type="date"
              value={formData.dateOfDeath || ""}
              onChange={(e) =>
                onChange("dateOfDeath", (e.target as HTMLInputElement).value)
              }
              error={getFieldError("dateOfDeath")}
              helperText="Date of deceased's death"
            />
            <Input
              label="Expected Distribution Year"
              type="number"
              value={getYearMonth(formData.startDateOffset).year}
              onChange={(e) =>
                handleYearMonthChange(
                  "startDateOffset",
                  (e.target as HTMLInputElement).value,
                  getYearMonth(formData.startDateOffset).month || "06"
                )
              }
              placeholder="2025"
              error={getFieldError("startDateOffset")}
              helperText="When inheritance is expected to be received"
            />
          </div>

          <Input
            label="Executor/Administrator"
            value={formData.executor || ""}
            onChange={(e) =>
              onChange("executor", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Jane Smith (Attorney), ABC Trust Company"
            error={getFieldError("executor")}
            helperText="Person or entity administering the estate"
          />

          <Input
            label="Estate Attorney"
            value={formData.estateAttorney || ""}
            onChange={(e) =>
              onChange("estateAttorney", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Smith & Associates Law Firm"
            error={getFieldError("estateAttorney")}
            helperText="Legal counsel handling estate administration"
          />

          <Input
            label="Special Instructions/Notes"
            value={formData.specialInstructions || ""}
            onChange={(e) =>
              onChange("specialInstructions", (e.target as HTMLInputElement).value)
            }
            placeholder="Any special conditions or notes about the inheritance"
            error={getFieldError("specialInstructions")}
            helperText="Additional details about the inheritance"
          />
        </div>
      </div>

      {/* Inheritance Tax Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-600">💰</span>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">
              Inheritance Tax Treatment (2024)
            </h4>
            <p className="mt-1 text-sm text-blue-700">
              <strong>Federal Estate Tax:</strong> $13.61M exemption per person ($27.22M couples)<br />
              <strong>Stepped-up Basis:</strong> Most assets get new basis equal to date-of-death value<br />
              <strong>Income Tax:</strong> Inheritances generally not taxable income to beneficiaries<br />
              <strong>State Taxes:</strong> Some states impose inheritance or estate taxes with lower exemptions
            </p>
            <p className="mt-2 text-xs text-blue-600">
              Inherited retirement accounts are subject to special distribution rules and income taxes.
            </p>
          </div>
        </div>
      </div>

      {/* Inherited Retirement Account Information */}
      {isRetirementAccount && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-orange-600">⏰</span>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-orange-800">
                Inherited Retirement Account Rules (SECURE Act)
              </h4>
              <p className="mt-1 text-sm text-orange-700">
                <strong>Spouse Beneficiaries:</strong> Can treat as their own IRA or take as beneficiary IRA<br />
                <strong>Non-Spouse Beneficiaries:</strong> Must withdraw within 10 years (no annual RMDs for most)<br />
                <strong>Eligible Designated Beneficiaries:</strong> Minor children, disabled, chronically ill get stretch<br />
                <strong>Roth IRAs:</strong> Same 10-year rule but withdrawals generally tax-free
              </p>
              <p className="mt-2 text-xs text-orange-600">
                Plan withdrawals carefully to minimize tax impact and maximize growth potential.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stepped-up Basis Information */}
      {steppedUpBasis && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-600">📈</span>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-green-800">
                Stepped-up Basis Advantage
              </h4>
              <p className="mt-1 text-sm text-green-700">
                The cost basis of inherited assets is "stepped up" to fair market value on the date of death.
                This eliminates capital gains tax on appreciation that occurred during the deceased's lifetime.
                For highly appreciated assets, this can provide significant tax savings compared to receiving
                the same assets as a gift during the person's lifetime.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estate Planning Considerations */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-purple-600">🎯</span>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-purple-800">
              Estate Planning Impact
            </h4>
            <p className="mt-1 text-sm text-purple-700">
              Consider how this inheritance affects your own estate planning, tax situation, and financial goals.
              Large inheritances may change your risk tolerance, retirement timeline, and charitable giving strategies.
              Consult with financial advisors to optimize the integration of inherited assets into your overall plan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};