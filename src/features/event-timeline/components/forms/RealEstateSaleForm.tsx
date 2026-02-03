import React, { useEffect } from "react";
import { Input, Select, Checkbox } from "@/components/ui";
import { H3, H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface RealEstateSaleFormProps {
  formData: any; // Using any for flexibility with real estate-specific properties
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
];

const PROPERTY_TYPE_OPTIONS = [
  { value: "primary_residence", label: "Primary Residence" },
  { value: "secondary_home", label: "Secondary/Vacation Home" },
  { value: "rental_property", label: "Rental Property" },
  { value: "commercial_property", label: "Commercial Property" },
  { value: "land", label: "Raw Land" },
  { value: "multi_family", label: "Multi-Family Property" },
  { value: "condo", label: "Condominium" },
  { value: "townhome", label: "Townhome" },
  { value: "mobile_home", label: "Mobile Home" },
  { value: "other", label: "Other Real Estate" },
];

const SALE_TYPE_OPTIONS = [
  { value: "traditional", label: "Traditional Sale" },
  { value: "short_sale", label: "Short Sale" },
  { value: "foreclosure", label: "Foreclosure/REO" },
  { value: "auction", label: "Auction Sale" },
  { value: "owner_financing", label: "Owner Financing" },
  { value: "lease_option", label: "Lease-to-Own" },
  { value: "cash_sale", label: "All-Cash Sale" },
  { value: "estate_sale", label: "Estate Sale" },
];

const DEPRECIATION_METHOD_OPTIONS = [
  { value: "straight_line", label: "Straight-Line Depreciation" },
  { value: "accelerated", label: "Accelerated Depreciation" },
  { value: "section_179", label: "Section 179 Deduction" },
  { value: "bonus", label: "Bonus Depreciation" },
  { value: "none", label: "No Depreciation Taken" },
];

export const RealEstateSaleForm: React.FC<RealEstateSaleFormProps> = ({
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
    EventType.REAL_ESTATE_SALE
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Set default values
  useEffect(() => {
    if (formData.taxable === undefined) {
      const propertyType = formData.propertyType;
      // Capital gains generally taxable unless primary residence exclusion applies
      onChange("taxable", propertyType !== "primary_residence");
    }
    if (!formData.propertyType) {
      onChange("propertyType", "primary_residence");
    }
    if (!formData.saleType) {
      onChange("saleType", "traditional");
    }
  }, [formData.taxable, formData.propertyType, formData.saleType, onChange]);

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

  const propertyType = formData.propertyType || "primary_residence";
  const isPrimaryResidence = propertyType === "primary_residence";
  const isRentalProperty = propertyType === "rental_property" || propertyType === "commercial_property";
  const saleType = formData.saleType || "traditional";

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Property Information
        </H3>
        <div className="space-y-4">
          <Input
            label="Property Address"
            value={formData.propertyAddress || ""}
            onChange={(e) =>
              onChange("propertyAddress", (e.target as HTMLInputElement).value)
            }
            placeholder="123 Main Street, City, State, ZIP"
            error={getFieldError("propertyAddress")}
          />

          <Select
            label="Property Type"
            options={PROPERTY_TYPE_OPTIONS}
            value={propertyType}
            onChange={(value) => onChange("propertyType", value)}
            placeholder="Select property type"
            error={getFieldError("propertyType")}
            helperText="Property type affects tax treatment and exemptions"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Property Size (sq ft)"
              type="number"
              value={formData.squareFootage || ""}
              onChange={(e) =>
                onChange("squareFootage", parseInt((e.target as HTMLInputElement).value))
              }
              placeholder="2500"
              helperText="Total square footage"
              error={getFieldError("squareFootage")}
            />
            <Input
              label="Lot Size (acres)"
              type="number"
              step="0.01"
              value={formData.lotSize || ""}
              onChange={(e) =>
                onChange("lotSize", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="0.25"
              helperText="Lot size in acres"
              error={getFieldError("lotSize")}
            />
          </div>

          <Input
            label="Year Built"
            type="number"
            min="1800"
            max="2024"
            value={formData.yearBuilt || ""}
            onChange={(e) =>
              onChange("yearBuilt", parseInt((e.target as HTMLInputElement).value))
            }
            placeholder="2010"
            error={getFieldError("yearBuilt")}
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Sale Transaction Details
        </H3>
        <div className="space-y-4">
          <Select
            label="Sale Type"
            options={SALE_TYPE_OPTIONS}
            value={saleType}
            onChange={(value) => onChange("saleType", value)}
            placeholder="Select sale type"
            error={getFieldError("saleType")}
            helperText="Type of sale transaction"
          />

          <Input
            label="Sale Price (Gross)"
            type="text"
            value={formatNumberWithCommas(formData.salePrice || "")}
            onChange={(e) =>
              onChange(
                "salePrice",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="500,000"
            error={getFieldError("salePrice")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Gross sale price before closing costs"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Real Estate Commission"
              type="text"
              value={formatNumberWithCommas(formData.realEstateCommission || "")}
              onChange={(e) =>
                onChange(
                  "realEstateCommission",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="30,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Total commission paid to agents"
              error={getFieldError("realEstateCommission")}
            />
            <Input
              label="Other Selling Expenses"
              type="text"
              value={formatNumberWithCommas(formData.sellingExpenses || "")}
              onChange={(e) =>
                onChange(
                  "sellingExpenses",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="5,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Closing costs, attorney fees, etc."
              error={getFieldError("sellingExpenses")}
            />
          </div>

          <Input
            label="Net Sale Proceeds"
            type="text"
            value={formatNumberWithCommas(formData.amount || "")}
            onChange={(e) =>
              onChange(
                "amount",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="465,000"
            error={getFieldError("amount")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Sale price minus all selling expenses and commissions"
          />

          <Select
            label="Destination Account"
            options={ACCOUNT_TYPE_OPTIONS}
            value={formData.targetAccountType || ""}
            onChange={(value) => onChange("targetAccountType", value)}
            placeholder="Account to receive sale proceeds"
            error={getFieldError("targetAccountType")}
            helperText="Where sale proceeds will be deposited"
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
          Cost Basis & Capital Gains
        </H3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Original Purchase Price"
              type="text"
              value={formatNumberWithCommas(formData.originalPurchasePrice || "")}
              onChange={(e) =>
                onChange(
                  "originalPurchasePrice",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="300,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="What you originally paid for the property"
              error={getFieldError("originalPurchasePrice")}
            />
            <Input
              label="Purchase Date"
              type="date"
              value={formData.purchaseDate || ""}
              onChange={(e) =>
                onChange("purchaseDate", (e.target as HTMLInputElement).value)
              }
              error={getFieldError("purchaseDate")}
              helperText="When you purchased the property"
            />
          </div>

          <Input
            label="Capital Improvements"
            type="text"
            value={formatNumberWithCommas(formData.capitalImprovements || "")}
            onChange={(e) =>
              onChange(
                "capitalImprovements",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="50,000"
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Major improvements that add to cost basis"
            error={getFieldError("capitalImprovements")}
          />

          {isRentalProperty && (
            <div className="space-y-4">
              <Select
                label="Depreciation Method Used"
                options={DEPRECIATION_METHOD_OPTIONS}
                value={formData.depreciationMethod || ""}
                onChange={(value) => onChange("depreciationMethod", value)}
                placeholder="Select depreciation method"
                error={getFieldError("depreciationMethod")}
                helperText="Method of depreciation claimed on rental property"
              />

              <Input
                label="Total Depreciation Claimed"
                type="text"
                value={formatNumberWithCommas(formData.totalDepreciation || "")}
                onChange={(e) =>
                  onChange(
                    "totalDepreciation",
                    parseFormattedNumber((e.target as HTMLInputElement).value)
                  )
                }
                placeholder="40,000"
                leftIcon={<span className="text-text-tertiary">$</span>}
                helperText="Cumulative depreciation deductions taken"
                error={getFieldError("totalDepreciation")}
              />
            </div>
          )}

          <Input
            label="Adjusted Cost Basis"
            type="text"
            value={formatNumberWithCommas(formData.adjustedBasis || "")}
            onChange={(e) =>
              onChange(
                "adjustedBasis",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="310,000"
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Purchase price + improvements - depreciation"
            error={getFieldError("adjustedBasis")}
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
          Tax Implications
        </H3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Capital Gain/Loss"
              type="text"
              value={formatNumberWithCommas(formData.capitalGain || "")}
              onChange={(e) =>
                onChange(
                  "capitalGain",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="155,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Net proceeds - adjusted basis"
              error={getFieldError("capitalGain")}
            />
            <Input
              label="Years Owned"
              type="number"
              step="0.1"
              value={formData.yearsOwned || ""}
              onChange={(e) =>
                onChange("yearsOwned", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="5.5"
              helperText="Determines long-term vs short-term treatment"
              error={getFieldError("yearsOwned")}
            />
          </div>

          {isPrimaryResidence && (
            <div className="space-y-4">
              <Checkbox
                label="Lived in Property 2 of Last 5 Years"
                checked={formData.residencyTest || false}
                onChange={(checked) => onChange("residencyTest", checked)}
                helperText="Required for primary residence exclusion"
              />

              <Input
                label="Primary Residence Exclusion"
                type="text"
                value={formatNumberWithCommas(formData.primaryResidenceExclusion || "")}
                onChange={(e) =>
                  onChange(
                    "primaryResidenceExclusion",
                    parseFormattedNumber((e.target as HTMLInputElement).value)
                  )
                }
                placeholder="250,000"
                leftIcon={<span className="text-text-tertiary">$</span>}
                helperText="$250k single, $500k married filing jointly"
                error={getFieldError("primaryResidenceExclusion")}
              />
            </div>
          )}

          {isRentalProperty && (
            <div className="space-y-4">
              <Input
                label="Depreciation Recapture Tax"
                type="text"
                value={formatNumberWithCommas(formData.depreciationRecapture || "")}
                onChange={(e) =>
                  onChange(
                    "depreciationRecapture",
                    parseFormattedNumber((e.target as HTMLInputElement).value)
                  )
                }
                placeholder="10,000"
                leftIcon={<span className="text-text-tertiary">$</span>}
                helperText="25% tax on depreciation previously claimed"
                error={getFieldError("depreciationRecapture")}
              />

              <Checkbox
                label="1031 Like-Kind Exchange"
                checked={formData.likeKindExchange || false}
                onChange={(checked) => onChange("likeKindExchange", checked)}
                helperText="Defer capital gains through like-kind exchange"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Estimated Capital Gains Tax"
              type="text"
              value={formatNumberWithCommas(formData.estimatedTax || "")}
              onChange={(e) =>
                onChange(
                  "estimatedTax",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="23,250"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Estimated federal and state capital gains tax"
              error={getFieldError("estimatedTax")}
            />
            <Input
              label="Net Investment Income Tax"
              type="text"
              value={formatNumberWithCommas(formData.niitTax || "")}
              onChange={(e) =>
                onChange(
                  "niitTax",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="5,580"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="3.8% NIIT for high-income taxpayers"
              error={getFieldError("niitTax")}
            />
          </div>
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Sale Timeline & Strategy
        </H3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Sale Year"
              type="number"
              value={getYearMonth(formData.startDateOffset).year}
              onChange={(e) =>
                handleYearMonthChange(
                  "startDateOffset",
                  (e.target as HTMLInputElement).value,
                  getYearMonth(formData.startDateOffset).month || "06"
                )
              }
              placeholder="2024"
              error={getFieldError("startDateOffset")}
              helperText="Year when property is sold"
            />
            <Input
              label="Sale Month"
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
              placeholder="06"
              error={getFieldError("startDateOffset")}
            />
          </div>

          <Input
            label="Sale Strategy/Purpose"
            value={formData.salePurpose || ""}
            onChange={(e) =>
              onChange("salePurpose", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Downsizing, relocation, portfolio rebalancing, liquidity needs"
            error={getFieldError("salePurpose")}
            helperText="Reason for selling and strategic considerations"
          />

          <Input
            label="Real Estate Agent"
            value={formData.realEstateAgent || ""}
            onChange={(e) =>
              onChange("realEstateAgent", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Jane Smith, ABC Realty"
            error={getFieldError("realEstateAgent")}
            helperText="Listing agent or buyer's agent"
          />

          <Input
            label="Expected Days on Market"
            type="number"
            value={formData.daysOnMarket || ""}
            onChange={(e) =>
              onChange("daysOnMarket", parseInt((e.target as HTMLInputElement).value))
            }
            placeholder="45"
            helperText="Expected time to sell"
            error={getFieldError("daysOnMarket")}
          />
        </div>
      </div>

      {/* Capital Gains Tax Information */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-red-600">📊</span>
          </div>
          <div className="ml-3">
            <H4 color="danger" className="text-red-800">
              Capital Gains Tax Rules (2024)
            </H4>
            <BodyBase color="danger" className="mt-1 text-red-700">
              <strong>Long-term (&gt;1 year):</strong> 0%, 15%, or 20% based on income<br />
              <strong>Short-term (≤1 year):</strong> Taxed as ordinary income<br />
              <strong>Primary Residence:</strong> $250k/$500k exclusion if residency test met<br />
              <strong>Depreciation Recapture:</strong> 25% on prior depreciation deductions
            </BodyBase>
            <Caption color="danger" className="mt-2 text-red-600">
              High-income taxpayers may also owe 3.8% Net Investment Income Tax.
            </Caption>
          </div>
        </div>
      </div>

      {/* Primary Residence Exclusion Information */}
      {isPrimaryResidence && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-600">🏠</span>
            </div>
            <div className="ml-3">
              <H4 color="success" className="text-green-800">
                Primary Residence Tax Benefits
              </H4>
              <BodyBase color="success" className="mt-1 text-green-700">
                <strong>Exclusion Amounts:</strong> $250,000 (single), $500,000 (married filing jointly)<br />
                <strong>Residency Test:</strong> Lived in home 2 out of last 5 years<br />
                <strong>Frequency:</strong> Can use exclusion once every 2 years<br />
                <strong>Partial Exclusion:</strong> Available for unforeseen circumstances
              </BodyBase>
              <Caption color="success" className="mt-2 text-green-600">
                This exclusion can eliminate most or all capital gains tax on primary residence sales.
              </Caption>
            </div>
          </div>
        </div>
      )}

      {/* 1031 Exchange Information */}
      {isRentalProperty && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-blue-600">🔄</span>
            </div>
            <div className="ml-3">
              <H4 color="info" className="text-blue-800">
                1031 Like-Kind Exchange Benefits
              </H4>
              <BodyBase color="info" className="mt-1 text-blue-700">
                <strong>Tax Deferral:</strong> Defer all capital gains and depreciation recapture<br />
                <strong>Timeline:</strong> 45 days to identify, 180 days to close on replacement property<br />
                <strong>Equal Value:</strong> Replacement property must be equal or greater value<br />
                <strong>Qualified Intermediary:</strong> Required to hold funds during exchange
              </BodyBase>
              <Caption color="info" className="mt-2 text-blue-600">
                Exchanges allow building wealth through real estate without immediate tax consequences.
              </Caption>
            </div>
          </div>
        </div>
      )}

      {/* Depreciation Recapture Information */}
      {isRentalProperty && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-orange-600">⚠️</span>
            </div>
            <div className="ml-3">
              <H4 color="warning" className="text-orange-800">
                Depreciation Recapture Rules
              </H4>
              <p className="mt-1 text-sm text-orange-700">
                Depreciation claimed on rental properties must be "recaptured" when sold, taxed at 25%.
                This applies even if you didn't claim depreciation deductions - the IRS assumes you
                should have. Consider the timing of sales to manage overall tax impact across multiple years.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Market Timing Considerations */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-purple-600">📈</span>
          </div>
          <div className="ml-3">
            <H4 color="accent" className="text-purple-800">
              Real Estate Sale Timing Considerations
            </H4>
            <BodyBase color="accent" className="mt-1 text-purple-700">
              • <strong>Market Conditions:</strong> Local supply/demand affects sale price and timeline<br />
              • <strong>Season:</strong> Spring/summer typically better for residential sales<br />
              • <strong>Tax Planning:</strong> Time sales to optimize capital gains timing<br />
              • <strong>Replacement Property:</strong> Consider purchase timing for next property
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};