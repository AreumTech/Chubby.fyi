import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H3, H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface TuitionPaymentFormProps {
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
  { value: "529", label: "529 Education Savings Plan" },
  { value: "tax_deferred", label: "Traditional IRA/401k" },
  { value: "roth", label: "Roth IRA/401k" },
];

const EDUCATION_LEVEL_OPTIONS = [
  { value: "k12", label: "K-12 Education" },
  { value: "undergraduate", label: "Undergraduate College" },
  { value: "graduate", label: "Graduate School" },
  { value: "professional", label: "Professional School (Law, Medical, etc.)" },
  { value: "trade_vocational", label: "Trade/Vocational School" },
  { value: "continuing_education", label: "Continuing Education/Certification" },
];

const FREQUENCY_OPTIONS = [
  { value: "semester", label: "Per Semester" },
  { value: "quarter", label: "Per Quarter" },
  { value: "annually", label: "Annually" },
  { value: "monthly", label: "Monthly" },
  { value: "one_time", label: "One-time Payment" },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "direct", label: "Direct to Institution" },
  { value: "student_account", label: "Via Student Account" },
  { value: "financial_aid", label: "Through Financial Aid Office" },
  { value: "third_party", label: "Third-party Payment Service" },
];

const TAX_CREDIT_OPTIONS = [
  { value: "american_opportunity", label: "American Opportunity Credit" },
  { value: "lifetime_learning", label: "Lifetime Learning Credit" },
  { value: "tuition_deduction", label: "Tuition & Fees Deduction" },
  { value: "none", label: "No Tax Benefit" },
];

export const TuitionPaymentForm: React.FC<TuitionPaymentFormProps> = ({
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
    EventType.TUITION_PAYMENT
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Set default values
  useEffect(() => {
    if (formData.taxable === undefined) {
      onChange("taxable", false); // Tuition payments are expenses, not taxable income
    }
    if (!formData.frequency) {
      onChange("frequency", "semester");
    }
    if (!formData.educationLevel) {
      onChange("educationLevel", "undergraduate");
    }
  }, [formData.taxable, formData.frequency, formData.educationLevel, onChange]);

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

  const frequency = formData.frequency || "semester";
  const isOneTime = frequency === "one_time";
  const educationLevel = formData.educationLevel || "undergraduate";
  const isK12 = educationLevel === "k12";

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Education Institution Details
        </H3>
        <div className="space-y-4">
          <Input
            label="Institution Name"
            value={formData.institutionName || ""}
            onChange={(e) =>
              onChange("institutionName", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., University of Virginia, Local High School"
            error={getFieldError("institutionName")}
          />

          <Select
            label="Education Level"
            options={EDUCATION_LEVEL_OPTIONS}
            value={educationLevel}
            onChange={(value) => onChange("educationLevel", value)}
            placeholder="Select education level"
            error={getFieldError("educationLevel")}
            helperText="Level of education for this tuition payment"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Student Name"
              value={formData.studentName || ""}
              onChange={(e) =>
                onChange("studentName", (e.target as HTMLInputElement).value)
              }
              placeholder="e.g., John Doe Jr., Self"
              error={getFieldError("studentName")}
            />
            <Input
              label="Academic Year"
              value={formData.academicYear || ""}
              onChange={(e) =>
                onChange("academicYear", (e.target as HTMLInputElement).value)
              }
              placeholder="e.g., 2024-2025, Fall 2024"
              error={getFieldError("academicYear")}
            />
          </div>

          <Input
            label="Program/Major"
            value={formData.program || ""}
            onChange={(e) =>
              onChange("program", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Computer Science, MBA, High School"
            error={getFieldError("program")}
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Tuition Payment Details
        </H3>
        <div className="space-y-4">
          <Select
            label="Payment Frequency"
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={(value) => onChange("frequency", value)}
            error={getFieldError("frequency")}
          />

          <Input
            label={`Tuition Amount (${isOneTime ? "Total" : frequency === "semester" ? "Per Semester" : frequency === "quarter" ? "Per Quarter" : frequency === "annually" ? "Annual" : "Monthly"})`}
            type="text"
            value={formatNumberWithCommas(formData.amount || "")}
            onChange={(e) =>
              onChange(
                "amount",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder={isOneTime ? "40,000" : frequency === "semester" ? "15,000" : frequency === "quarter" ? "10,000" : frequency === "annually" ? "30,000" : "2,500"}
            error={getFieldError("amount")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText={`${isOneTime ? "One-time" : frequency === "semester" ? "Per semester" : frequency === "quarter" ? "Per quarter" : frequency === "annually" ? "Annual" : "Monthly"} tuition payment`}
          />

          <Select
            label="Payment Source Account"
            options={ACCOUNT_TYPE_OPTIONS}
            value={formData.sourceAccountType || ""}
            onChange={(value) => onChange("sourceAccountType", value)}
            placeholder="Account to pay tuition from"
            error={getFieldError("sourceAccountType")}
            helperText="Account where tuition payments will be deducted from"
          />

          <Select
            label="Payment Method"
            options={PAYMENT_METHOD_OPTIONS}
            value={formData.paymentMethod || ""}
            onChange={(value) => onChange("paymentMethod", value)}
            placeholder="How payment is made"
            error={getFieldError("paymentMethod")}
            helperText="Method used to pay the institution"
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
          Additional Education Expenses
        </H3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Mandatory Fees"
              type="text"
              value={formatNumberWithCommas(formData.mandatoryFees || "")}
              onChange={(e) =>
                onChange(
                  "mandatoryFees",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="2,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Required institutional fees"
              error={getFieldError("mandatoryFees")}
            />
            <Input
              label="Books & Supplies"
              type="text"
              value={formatNumberWithCommas(formData.booksSupplies || "")}
              onChange={(e) =>
                onChange(
                  "booksSupplies",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="1,200"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Required books and course materials"
              error={getFieldError("booksSupplies")}
            />
          </div>

          {!isK12 && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Room & Board"
                type="text"
                value={formatNumberWithCommas(formData.roomBoard || "")}
                onChange={(e) =>
                  onChange(
                    "roomBoard",
                    parseFormattedNumber((e.target as HTMLInputElement).value)
                  )
                }
                placeholder="12,000"
                leftIcon={<span className="text-text-tertiary">$</span>}
                helperText="On-campus housing and meal costs"
                error={getFieldError("roomBoard")}
              />
              <Input
                label="Technology/Equipment"
                type="text"
                value={formatNumberWithCommas(formData.technologyEquipment || "")}
                onChange={(e) =>
                  onChange(
                    "technologyEquipment",
                    parseFormattedNumber((e.target as HTMLInputElement).value)
                  )
                }
                placeholder="1,500"
                leftIcon={<span className="text-text-tertiary">$</span>}
                helperText="Required computers, software, lab equipment"
                error={getFieldError("technologyEquipment")}
              />
            </div>
          )}

          <Input
            label="Transportation Costs"
            type="text"
            value={formatNumberWithCommas(formData.transportationCosts || "")}
            onChange={(e) =>
              onChange(
                "transportationCosts",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="800"
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Travel to/from school, parking, gas"
            error={getFieldError("transportationCosts")}
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Financial Aid & Tax Benefits
        </H3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Financial Aid/Scholarships"
              type="text"
              value={formatNumberWithCommas(formData.financialAid || "")}
              onChange={(e) =>
                onChange(
                  "financialAid",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="5,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Grants, scholarships, work-study"
              error={getFieldError("financialAid")}
            />
            <Input
              label="Student Loans"
              type="text"
              value={formatNumberWithCommas(formData.studentLoans || "")}
              onChange={(e) =>
                onChange(
                  "studentLoans",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="10,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Federal and private student loans"
              error={getFieldError("studentLoans")}
            />
          </div>

          {!isK12 && (
            <Select
              label="Tax Credit/Deduction"
              options={TAX_CREDIT_OPTIONS}
              value={formData.taxCredit || ""}
              onChange={(value) => onChange("taxCredit", value)}
              placeholder="Select applicable tax benefit"
              error={getFieldError("taxCredit")}
              helperText="Tax credits/deductions for qualified education expenses"
            />
          )}

          {formData.taxCredit && formData.taxCredit !== "none" && (
            <Input
              label="Estimated Tax Benefit"
              type="text"
              value={formatNumberWithCommas(formData.estimatedTaxBenefit || "")}
              onChange={(e) =>
                onChange(
                  "estimatedTaxBenefit",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="2,500"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Estimated annual tax credit or deduction value"
              error={getFieldError("estimatedTaxBenefit")}
            />
          )}
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
          Payment Timeline
        </H3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Payment Start Year"
              type="number"
              value={getYearMonth(formData.startDateOffset).year}
              onChange={(e) =>
                handleYearMonthChange(
                  "startDateOffset",
                  (e.target as HTMLInputElement).value,
                  getYearMonth(formData.startDateOffset).month || "08"
                )
              }
              placeholder="2024"
              error={getFieldError("startDateOffset")}
              helperText="When tuition payments begin"
            />
            <Input
              label="Payment Start Month"
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
              placeholder="08"
              helperText="Typically August/September"
              error={getFieldError("startDateOffset")}
            />
          </div>

          {!isOneTime && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Payment End Year (Optional)"
                type="number"
                value={getYearMonth(formData.endDateOffset).year}
                onChange={(e) =>
                  handleYearMonthChange(
                    "endDateOffset",
                    (e.target as HTMLInputElement).value,
                    getYearMonth(formData.endDateOffset).month || "05"
                  )
                }
                placeholder="2028"
                error={getFieldError("endDateOffset")}
                helperText="When payments end (graduation)"
              />
              <Input
                label="Annual Tuition Inflation Rate"
                type="number"
                step="0.1"
                value={formData.annualGrowthRate || ""}
                onChange={(e) =>
                  onChange("annualGrowthRate", parseFloat((e.target as HTMLInputElement).value))
                }
                placeholder="5.0"
                rightIcon={<span className="text-text-tertiary">%</span>}
                helperText="Annual increase in tuition costs"
                error={getFieldError("annualGrowthRate")}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Student Age"
              type="number"
              min="5"
              max="65"
              value={formData.studentAge || ""}
              onChange={(e) =>
                onChange("studentAge", parseInt((e.target as HTMLInputElement).value))
              }
              placeholder="18"
              helperText="Current age of the student"
              error={getFieldError("studentAge")}
            />
            <Input
              label="Expected Program Duration (Years)"
              type="number"
              step="0.5"
              min="0.5"
              max="10"
              value={formData.programDurationYears || ""}
              onChange={(e) =>
                onChange("programDurationYears", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder={isK12 ? "12" : educationLevel === "undergraduate" ? "4" : educationLevel === "graduate" ? "2" : "4"}
              helperText="Expected years to complete program"
              error={getFieldError("programDurationYears")}
            />
          </div>
        </div>
      </div>

      {/* Education Tax Benefits Information */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-green-600">📊</span>
          </div>
          <div className="ml-3">
            <H4 color="success">
              Education Tax Benefits (2024)
            </H4>
            <BodyBase color="success" className="mt-1">
              <strong>American Opportunity Credit:</strong> Up to $2,500/year for first 4 years of undergrad<br />
              <strong>Lifetime Learning Credit:</strong> Up to $2,000/year for any post-secondary education<br />
              <strong>Tuition & Fees Deduction:</strong> Up to $4,000 deduction (if not claiming credits)<br />
              <strong>Student Loan Interest:</strong> Up to $2,500/year deduction on loan interest
            </BodyBase>
            <Caption color="success" className="mt-2">
              Credits cannot be claimed for expenses paid with 529 funds or tax-free scholarships.
            </Caption>
          </div>
        </div>
      </div>

      {/* College Cost Planning */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-600">🎓</span>
          </div>
          <div className="ml-3">
            <H4 color="info">
              College Cost Averages (2024-2025)
            </H4>
            <BodyBase color="info" className="mt-1">
              <strong>Public In-State:</strong> ~$11,260 tuition + $12,310 room & board<br />
              <strong>Public Out-of-State:</strong> ~$29,150 tuition + $12,310 room & board<br />
              <strong>Private:</strong> ~$41,540 tuition + $14,650 room & board<br />
              <strong>Community College:</strong> ~$3,990 tuition (in-district)
            </BodyBase>
            <Caption color="info" className="mt-2">
              Costs vary significantly by institution and location. Historical inflation: ~5%/yr.
            </Caption>
          </div>
        </div>
      </div>

      {/* Financial Aid Information */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-amber-600">💡</span>
          </div>
          <div className="ml-3">
            <H4 color="warning">
              Financial Aid Planning Tips
            </H4>
            <BodyBase color="warning" className="mt-1">
              • <strong>FAFSA:</strong> Complete early - aid is often first-come, first-served<br />
              • <strong>Merit Scholarships:</strong> Apply broadly, many go unclaimed<br />
              • <strong>Work-Study:</strong> Provides experience and reduces borrowing needs<br />
              • <strong>529 Coordination:</strong> Plan 529 withdrawals to maximize tax benefits
            </BodyBase>
          </div>
        </div>
      </div>

      {/* Payment Planning Note */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-purple-600">⏰</span>
          </div>
          <div className="ml-3">
            <H4 className="text-purple-800">
              Payment Planning Strategy
            </H4>
            <BodyBase className="mt-1 text-purple-700">
              Consider timing of payments to maximize tax benefits and 529 plan utilization.
              Some families split costs between multiple funding sources (529, current income,
              loans) to optimize the overall financial strategy and maintain cash flow flexibility.
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};