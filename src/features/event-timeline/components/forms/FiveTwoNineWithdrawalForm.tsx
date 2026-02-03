import React, { useEffect } from "react";
import { Input, Select, Checkbox } from "@/components/ui";
import { H3, H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface FiveTwoNineWithdrawalFormProps {
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
];

const WITHDRAWAL_PURPOSE_OPTIONS = [
  { value: "tuition_fees", label: "Tuition & Mandatory Fees" },
  { value: "room_board", label: "Room & Board" },
  { value: "books_supplies", label: "Books & Required Supplies" },
  { value: "technology", label: "Required Technology/Equipment" },
  { value: "k12_tuition", label: "K-12 Tuition (up to $10k/year)" },
  { value: "student_loan_repayment", label: "Student Loan Repayment (up to $10k lifetime)" },
  { value: "apprenticeship", label: "Qualified Apprenticeship Expenses" },
  { value: "non_qualified", label: "Non-Qualified Withdrawal" },
];

const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semester", label: "Per Semester" },
  { value: "annually", label: "Annually" },
  { value: "one_time", label: "One-time Withdrawal" },
];

export const FiveTwoNineWithdrawalForm: React.FC<FiveTwoNineWithdrawalFormProps> = ({
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
    EventType.FIVE_TWO_NINE_WITHDRAWAL
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Set default values based on typical 529 withdrawal characteristics
  useEffect(() => {
    if (formData.taxable === undefined) {
      const isNonQualified = formData.withdrawalPurpose === "non_qualified";
      onChange("taxable", isNonQualified); // Only non-qualified withdrawals are taxable
    }
    if (!formData.frequency) {
      onChange("frequency", "semester");
    }
    if (!formData.withdrawalPurpose) {
      onChange("withdrawalPurpose", "tuition_fees");
    }
  }, [formData.taxable, formData.frequency, formData.withdrawalPurpose, onChange]);

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
  const withdrawalPurpose = formData.withdrawalPurpose || "tuition_fees";
  const isNonQualified = withdrawalPurpose === "non_qualified";

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          529 Plan Account Details
        </H3>
        <div className="space-y-4">
          <Input
            label="529 Plan Name"
            value={formData.planName || ""}
            onChange={(e) =>
              onChange("planName", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., State 529 Plan, Vanguard 529"
            error={getFieldError("planName")}
          />

          <Input
            label="Plan Provider/State"
            value={formData.planProvider || ""}
            onChange={(e) =>
              onChange("planProvider", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Virginia 529, Fidelity, Vanguard"
            error={getFieldError("planProvider")}
          />

          <Input
            label="Beneficiary Name"
            value={formData.beneficiaryName || ""}
            onChange={(e) =>
              onChange("beneficiaryName", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., John Doe Jr., Child 1"
            error={getFieldError("beneficiaryName")}
            helperText="The student using these education funds"
          />

          <Input
            label="Account Number (Optional)"
            value={formData.accountNumber || ""}
            onChange={(e) =>
              onChange("accountNumber", (e.target as HTMLInputElement).value)
            }
            placeholder="529 account identifier"
            error={getFieldError("accountNumber")}
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
          Withdrawal Details
        </H3>
        <div className="space-y-4">
          <Select
            label="Withdrawal Purpose"
            options={WITHDRAWAL_PURPOSE_OPTIONS}
            value={withdrawalPurpose}
            onChange={(value) => onChange("withdrawalPurpose", value)}
            placeholder="Select use of funds"
            error={getFieldError("withdrawalPurpose")}
            helperText="Purpose determines tax treatment of withdrawal"
          />

          <Select
            label="Withdrawal Frequency"
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={(value) => onChange("frequency", value)}
            error={getFieldError("frequency")}
          />

          <Input
            label={`Withdrawal Amount (${isOneTime ? "Total" : frequency === "semester" ? "Per Semester" : frequency === "annually" ? "Annual" : frequency === "quarterly" ? "Quarterly" : "Monthly"})`}
            type="text"
            value={formatNumberWithCommas(formData.amount || "")}
            onChange={(e) =>
              onChange(
                "amount",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder={isOneTime ? "30,000" : frequency === "semester" ? "15,000" : frequency === "annually" ? "30,000" : frequency === "quarterly" ? "7,500" : "2,500"}
            error={getFieldError("amount")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText={`${isOneTime ? "One-time" : frequency === "semester" ? "Per semester" : frequency === "annually" ? "Annual" : frequency === "quarterly" ? "Quarterly" : "Monthly"} withdrawal from 529 plan`}
          />

          <Select
            label="Destination Account"
            options={ACCOUNT_TYPE_OPTIONS}
            value={formData.targetAccountType || ""}
            onChange={(value) => onChange("targetAccountType", value)}
            placeholder="Account to receive funds"
            error={getFieldError("targetAccountType")}
            helperText="Account where withdrawal proceeds will be deposited"
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
          Education Institution & Expenses
        </H3>
        <div className="space-y-4">
          <Input
            label="Institution Name"
            value={formData.institutionName || ""}
            onChange={(e) =>
              onChange("institutionName", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., University of Virginia, Local Community College"
            error={getFieldError("institutionName")}
            helperText="Educational institution where funds will be used"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Student Grade Level"
              value={formData.gradeLevel || ""}
              onChange={(e) =>
                onChange("gradeLevel", (e.target as HTMLInputElement).value)
              }
              placeholder="e.g., Freshman, K-12, Graduate"
              error={getFieldError("gradeLevel")}
            />
            <Input
              label="Academic Year"
              value={formData.academicYear || ""}
              onChange={(e) =>
                onChange("academicYear", (e.target as HTMLInputElement).value)
              }
              placeholder="e.g., 2024-2025"
              error={getFieldError("academicYear")}
            />
          </div>

          {withdrawalPurpose === "room_board" && (
            <Input
              label="Room & Board Allowance Limit"
              type="text"
              value={formatNumberWithCommas(formData.roomBoardLimit || "")}
              onChange={(e) =>
                onChange(
                  "roomBoardLimit",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="15,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Annual room & board allowance set by the institution"
              error={getFieldError("roomBoardLimit")}
            />
          )}

          {withdrawalPurpose === "k12_tuition" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>K-12 Limitation:</strong> Maximum $10,000 per year per beneficiary for K-12 tuition expenses.
              </p>
            </div>
          )}

          {withdrawalPurpose === "student_loan_repayment" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>Student Loan Limitation:</strong> Maximum $10,000 lifetime per beneficiary for qualified student loan repayment.
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Tax Treatment & Timeline
        </H3>
        <div className="space-y-4">
          <Checkbox
            label="Taxable Withdrawal"
            checked={formData.taxable || false}
            onChange={(checked) => onChange("taxable", checked)}
            helperText={isNonQualified ? "Non-qualified withdrawals: earnings taxable + 10% penalty" : "Qualified withdrawals: tax-free when used for eligible expenses"}
          />

          {isNonQualified && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Earnings Portion"
                type="text"
                value={formatNumberWithCommas(formData.earningsPortion || "")}
                onChange={(e) =>
                  onChange(
                    "earningsPortion",
                    parseFormattedNumber((e.target as HTMLInputElement).value)
                  )
                }
                placeholder="5,000"
                leftIcon={<span className="text-text-tertiary">$</span>}
                helperText="Earnings portion subject to tax + penalty"
                error={getFieldError("earningsPortion")}
              />
              <Input
                label="Penalty Amount"
                type="text"
                value={formatNumberWithCommas(formData.penaltyAmount || "")}
                onChange={(e) =>
                  onChange(
                    "penaltyAmount",
                    parseFormattedNumber((e.target as HTMLInputElement).value)
                  )
                }
                placeholder="500"
                leftIcon={<span className="text-text-tertiary">$</span>}
                helperText="10% penalty on earnings (calculated separately)"
                error={getFieldError("penaltyAmount")}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Withdrawal Start Year"
              type="number"
              value={getYearMonth(formData.startDateOffset).year}
              onChange={(e) =>
                handleYearMonthChange(
                  "startDateOffset",
                  (e.target as HTMLInputElement).value,
                  getYearMonth(formData.startDateOffset).month || "01"
                )
              }
              placeholder="2030"
              error={getFieldError("startDateOffset")}
              helperText="When withdrawals begin"
            />
            <Input
              label="Withdrawal Start Month"
              type="number"
              min="1"
              max="12"
              value={getYearMonth(formData.startDateOffset).month}
              onChange={(e) =>
                handleYearMonthChange(
                  "startDateOffset",
                  getYearMonth(formData.startDateOffset).year || "2030",
                  (e.target as HTMLInputElement).value
                )
              }
              placeholder="08"
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
                    getYearMonth(formData.endDateOffset).month || "01"
                  )
                }
                placeholder="Leave blank for indefinite withdrawals"
                error={getFieldError("endDateOffset")}
              />
              <Input
                label="Annual Withdrawal Growth Rate"
                type="number"
                step="0.01"
                value={formData.annualGrowthRate || ""}
                onChange={(e) =>
                  onChange("annualGrowthRate", parseFloat((e.target as HTMLInputElement).value))
                }
                placeholder="5.0"
                rightIcon={<span className="text-text-tertiary">%</span>}
                helperText="Annual increase (college cost inflation)"
                error={getFieldError("annualGrowthRate")}
              />
            </div>
          )}
        </div>
      </div>

      {/* Tax Treatment Information */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-green-600">💰</span>
          </div>
          <div className="ml-3">
            <H4 color="success">
              529 Withdrawal Tax Treatment
            </H4>
            <BodyBase color="success" className="mt-1">
              <strong>Qualified Withdrawals:</strong> Tax-free when used for eligible education expenses<br />
              <strong>Non-Qualified:</strong> Earnings portion taxable as ordinary income + 10% penalty<br />
              <strong>Contribution Basis:</strong> Always returned tax-free (already taxed when contributed)<br />
              <strong>Record Keeping:</strong> Save receipts to document qualified expenses
            </BodyBase>
          </div>
        </div>
      </div>

      {/* Qualified Expenses Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-600">📚</span>
          </div>
          <div className="ml-3">
            <H4 color="info">
              Qualified Education Expenses (2024)
            </H4>
            <BodyBase color="info" className="mt-1">
              <strong>Higher Education:</strong> Tuition, fees, books, supplies, equipment, room & board (if enrolled at least half-time)<br />
              <strong>K-12 Tuition:</strong> Up to $10,000 per year per beneficiary<br />
              <strong>Student Loans:</strong> Up to $10,000 lifetime per beneficiary for repayment<br />
              <strong>Apprenticeships:</strong> Fees, books, supplies, and equipment for registered programs
            </BodyBase>
            <p className="mt-2 text-xs text-blue-600">
              Room & board amounts cannot exceed the school's official cost of attendance allowance.
            </p>
          </div>
        </div>
      </div>

      {/* Planning Considerations */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-purple-600">🎯</span>
          </div>
          <div className="ml-3">
            <H4 className="text-sm font-medium text-purple-800">
              529 Withdrawal Planning Tips
            </H4>
            <p className="mt-1 text-sm text-purple-700">
              • <strong>Timing:</strong> Withdraw funds in the same tax year as paying qualified expenses<br />
              • <strong>Coordination:</strong> Consider impact on tax credits (American Opportunity, Lifetime Learning)<br />
              • <strong>Beneficiary Changes:</strong> Can change to family member if original beneficiary doesn't need funds<br />
              • <strong>Leftover Funds:</strong> Consider rolling to siblings or keep for grandchildren
            </p>
          </div>
        </div>
      </div>

      {isNonQualified && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-600">⚠️</span>
            </div>
            <div className="ml-3">
              <H4 color="danger">
                Non-Qualified Withdrawal Tax Impact
              </H4>
              <BodyBase color="danger" className="mt-1">
                Non-qualified withdrawals trigger taxes and penalties on the earnings portion only.
                The contribution basis (money you put in) is returned tax-free. You'll receive
                Form 1099-Q reporting the withdrawal and must calculate the taxable portion
                when filing your tax return.
              </BodyBase>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
