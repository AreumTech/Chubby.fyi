import React, { useEffect } from "react";
import { Input } from "@/components/ui";
import { H3, H4, BodyBase } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface RealEstateAppreciationFormProps {
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

export const RealEstateAppreciationForm: React.FC<RealEstateAppreciationFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
    EventType.REAL_ESTATE_APPRECIATION
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Set default appreciation rate
  useEffect(() => {
    if (!formData.annualAppreciationRate) {
      onChange("annualAppreciationRate", 3.0); // Default to 3% annual appreciation
    }
  }, [formData.annualAppreciationRate, onChange]);

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

  const handleYearMonthChange = (
    field: string,
    year: string,
    month: string
  ) => {
    if (year && month) {
      onDateChange(field, year, month);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Property Details
        </H3>
        <div className="space-y-4">
          <Input
            label="Property Name"
            value={formData.propertyName || ""}
            onChange={(e) =>
              onChange("propertyName", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Primary Residence, Rental Property #1"
            error={getFieldError("propertyName")}
          />

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Property Category
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.category || "primary-residence"}
                onChange={(e) => onChange("category", e.target.value)}
              >
                <option value="primary-residence">Primary Residence</option>
                <option value="investment-property">Investment Property</option>
                <option value="vacation-home">Vacation Home</option>
              </select>
            </div>
          </div>

          <Input
            label="Current Property Value"
            type="text"
            value={formatNumberWithCommas(formData.currentValue || "")}
            onChange={(e) =>
              onChange(
                "currentValue",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="500,000"
            error={getFieldError("currentValue")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Current estimated market value of the property"
          />

          <Input
            label="Tax Basis (Purchase Price)"
            type="text"
            value={formatNumberWithCommas(formData.taxBasis || "")}
            onChange={(e) =>
              onChange(
                "taxBasis",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="400,000"
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Original purchase price for capital gains calculations"
            error={getFieldError("taxBasis")}
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Appreciation Schedule
        </H3>
        <div className="space-y-4">
          <Input
            label="Annual Appreciation Rate"
            type="number"
            step="0.01"
            value={formData.annualAppreciationRate || 3.0}
            onChange={(e) =>
              onChange("annualAppreciationRate", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="3.0"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Expected annual property value growth rate"
            error={getFieldError("annualAppreciationRate")}
          />

          <Input
            label="Volatility (Optional)"
            type="number"
            step="0.01"
            value={formData.volatility || ""}
            onChange={(e) =>
              onChange("volatility", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="5.0"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Standard deviation for Monte Carlo simulation (leave blank for deterministic)"
            error={getFieldError("volatility")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Tracking Year"
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
              label="End Tracking Year (Optional)"
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
            label="Reassessment Frequency"
            type="number"
            value={formData.reassessmentFrequency || 12}
            onChange={(e) =>
              onChange("reassessmentFrequency", parseInt((e.target as HTMLInputElement).value))
            }
            placeholder="12"
            rightIcon={<span className="text-text-tertiary">months</span>}
            helperText="How often to update property value (default: annually)"
            error={getFieldError("reassessmentFrequency")}
          />
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-green-600">📊</span>
          </div>
          <div className="ml-3">
            <H4 color="success" className="text-green-800">
              Real Estate Appreciation Guidelines
            </H4>
            <BodyBase color="success" className="mt-1 text-green-700" as="div">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Historical average:</strong> U.S. real estate appreciates ~3-4%/yr long-term</li>
                <li><strong>Regional variation:</strong> High-growth areas may see 5-8%, while stable areas see 2-3%</li>
                <li><strong>Economic cycles:</strong> Real estate cycles through boom and bust periods</li>
                <li><strong>Inflation impact:</strong> Real appreciation after inflation is typically 1-2%</li>
                <li><strong>Consider volatility:</strong> Add 5-10% volatility for realistic Monte Carlo modeling</li>
              </ul>
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};