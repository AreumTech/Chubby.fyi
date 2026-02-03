import React, { useEffect } from "react";
import { Input } from "@/components/ui";
import { H3, BodyBase, Label } from "@/components/ui/Typography";
import { FinancialEvent, EventType, AccountType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface PropertyMaintenanceFormProps {
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

export const PropertyMaintenanceForm: React.FC<PropertyMaintenanceFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
    EventType.PROPERTY_MAINTENANCE
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Set default maintenance schedule
  useEffect(() => {
    if (!formData.maintenanceSchedule) {
      onChange("maintenanceSchedule", {
        routine: 1.0, // 1% of property value annually
        major: {
          frequency: 15, // Every 15 years
          cost: 5.0, // 5% of property value
        },
        emergency: {
          annualProbability: 10.0, // 10% chance per year
          averageCost: 2.0, // 2% of property value
        },
      });
    }
  }, [formData.maintenanceSchedule, onChange]);

  // Set default growth rate
  useEffect(() => {
    if (!formData.annualGrowthRate) {
      onChange("annualGrowthRate", 3.0); // Default to 3% inflation
    }
  }, [formData.annualGrowthRate, onChange]);

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

  const handleMaintenanceScheduleChange = (section: string, field: string, value: any) => {
    const currentSchedule = formData.maintenanceSchedule || {
      routine: 1.0,
      major: { frequency: 15, cost: 5.0 },
      emergency: { annualProbability: 10.0, averageCost: 2.0 },
    };

    if (section === "routine") {
      onChange("maintenanceSchedule", {
        ...currentSchedule,
        routine: value,
      });
    } else {
      onChange("maintenanceSchedule", {
        ...currentSchedule,
        [section]: {
          ...currentSchedule[section],
          [field]: value,
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
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

          <Input
            label="Base Annual Maintenance Cost"
            type="text"
            value={formatNumberWithCommas(formData.annualMaintenanceCost || "")}
            onChange={(e) =>
              onChange(
                "annualMaintenanceCost",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="5,000"
            error={getFieldError("annualMaintenanceCost")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Fixed annual maintenance costs (landscaping, HVAC service, etc.)"
          />

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label className="block">
                Payment Account
              </Label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.paymentAccount || 'cash'}
                onChange={(e) => onChange("paymentAccount", e.target.value as AccountType)}
              >
                <option value="cash">Cash/Checking</option>
                <option value="taxable">Taxable Brokerage</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="taxDeductible"
              checked={formData.taxDeductible || false}
              onChange={(e) => onChange("taxDeductible", e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label as="label" htmlFor="taxDeductible">
              Tax deductible (for rental properties)
            </Label>
          </div>
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Maintenance Schedule
        </H3>
        <div className="space-y-4">
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
            label="Annual Cost Growth Rate"
            type="number"
            step="0.01"
            value={formData.annualGrowthRate || 3.0}
            onChange={(e) =>
              onChange("annualGrowthRate", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="3.0"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="How maintenance costs increase annually (typically matches inflation)"
            error={getFieldError("annualGrowthRate")}
          />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
          Advanced Maintenance Model
        </h3>
        <div className="space-y-4">
          <Input
            label="Routine Maintenance Rate"
            type="number"
            step="0.01"
            value={formData.maintenanceSchedule?.routine || 1.0}
            onChange={(e) =>
              handleMaintenanceScheduleChange("routine", "", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="1.0"
            rightIcon={<span className="text-text-tertiary">% of value</span>}
            helperText="Annual routine maintenance as % of property value (typically 1-2%)"
            error={getFieldError("maintenanceSchedule.routine")}
          />

          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium text-gray-900">Major Maintenance Projects</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Frequency"
                type="number"
                value={formData.maintenanceSchedule?.major?.frequency || 15}
                onChange={(e) =>
                  handleMaintenanceScheduleChange("major", "frequency", parseInt((e.target as HTMLInputElement).value))
                }
                placeholder="15"
                rightIcon={<span className="text-text-tertiary">years</span>}
                helperText="Years between major projects (roof, HVAC, etc.)"
              />
              <Input
                label="Cost"
                type="number"
                step="0.01"
                value={formData.maintenanceSchedule?.major?.cost || 5.0}
                onChange={(e) =>
                  handleMaintenanceScheduleChange("major", "cost", parseFloat((e.target as HTMLInputElement).value))
                }
                placeholder="5.0"
                rightIcon={<span className="text-text-tertiary">% of value</span>}
                helperText="Cost as % of property value"
              />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium text-gray-900">Emergency Repairs</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Annual Probability"
                type="number"
                step="0.01"
                value={formData.maintenanceSchedule?.emergency?.annualProbability || 10.0}
                onChange={(e) =>
                  handleMaintenanceScheduleChange("emergency", "annualProbability", parseFloat((e.target as HTMLInputElement).value))
                }
                placeholder="10.0"
                rightIcon={<span className="text-text-tertiary">%</span>}
                helperText="Chance of emergency repair each year"
              />
              <Input
                label="Average Cost"
                type="number"
                step="0.01"
                value={formData.maintenanceSchedule?.emergency?.averageCost || 2.0}
                onChange={(e) =>
                  handleMaintenanceScheduleChange("emergency", "averageCost", parseFloat((e.target as HTMLInputElement).value))
                }
                placeholder="2.0"
                rightIcon={<span className="text-text-tertiary">% of value</span>}
                helperText="Average cost as % of property value"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-orange-600">🔧</span>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-orange-800">
              Property Maintenance Guidelines
            </h4>
            <div className="mt-1 text-sm text-orange-700">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Rule of thumb:</strong> Budget 1-3% of property value annually for maintenance</li>
                <li><strong>Age matters:</strong> Newer properties need 1%, older properties may need 3%+</li>
                <li><strong>Major items:</strong> Roof (20 years), HVAC (15 years), Water heater (10 years)</li>
                <li><strong>Regional factors:</strong> Climate affects maintenance needs significantly</li>
                <li><strong>DIY vs. Professional:</strong> Labor costs vary widely by location and skill level</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};