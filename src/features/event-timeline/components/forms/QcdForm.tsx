import React, { useEffect } from 'react';
import { Input } from "@/components/ui";
import { H3, H4, BodyBase, Caption } from "@/components/ui/Typography";
import { QualifiedCharitableDistributionEvent, EventType } from '@/types';
import type { AccountType } from '@/types';
import { getCalendarYearAndMonthFromMonthOffset } from '@/utils/financialCalculations';
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface QcdFormProps {
    formData: Partial<QualifiedCharitableDistributionEvent>;
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

export const QcdForm: React.FC<QcdFormProps> = ({
    formData,
    onChange,
    onDateChange,
    baseYear = 2024,
    baseMonth = 1,
    currentAge = 30,
    onValidationChange,
}) => {
    const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
        EventType.QUALIFIED_CHARITABLE_DISTRIBUTION
    );

    useEffect(() => {
        const validation = validateForm(formData);
        onValidationChange?.(validation.isValid, validation.errors);
    }, [formData, validateForm, onValidationChange]);

    const getYearMonth = (offset?: number) => {
        if (offset === undefined) return { year: '', month: '' };
        const result = getCalendarYearAndMonthFromMonthOffset(
            baseYear,
            baseMonth,
            offset,
            currentAge
        );
        return {
            year: result.year.toString(),
            month: result.monthInYear.toString().padStart(2, '0')
        };
    };

    const handleYearMonthChange = (field: string, year: string, month: string) => {
        if (year && month) {
            onDateChange(field, year, month);
        }
    };

    const handleAmountChange = (value: string) => {
        const numericValue = parseFormattedNumber(value);
        onChange('amount', numericValue);
    };

    const handleRmdAmountChange = (value: string) => {
        const numericValue = parseFormattedNumber(value);
        onChange('satisfiesRmdAmount', numericValue);
    };

    const { year, month } = getYearMonth(formData.monthOffset);
    const ageAtDistribution = currentAge + Math.floor((formData.monthOffset || 0) / 12);
    const isEligibleByAge = ageAtDistribution >= 70.5;

    return (
        <div className="space-y-6">
            {/* Age Eligibility Warning */}
            {!isEligibleByAge && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <H4 color="warning">Age Eligibility Notice</H4>
                            <BodyBase color="warning" className="mt-2">
                                <p>You will be {ageAtDistribution} years old at the distribution date. QCDs are only available to individuals age 70½ or older.</p>
                            </BodyBase>
                        </div>
                    </div>
                </div>
            )}

            {/* QCD Overview */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <H4 color="info">Qualified Charitable Distribution</H4>
                        <BodyBase color="info" className="mt-2">
                            <p>QCDs allow direct transfers from your IRA to qualifying charities, excluding the distribution from taxable income and potentially satisfying RMD requirements.</p>
                        </BodyBase>
                    </div>
                </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
                <H3>
                    Charitable Distribution Details
                </H3>

                <div className="grid grid-cols-1 gap-4">
                    <Input
                        label="Charitable Organization Name"
                        type="text"
                        value={formData.metadata?.charityName || ""}
                        onChange={(e) => onChange("metadata", { 
                            ...formData.metadata, 
                            charityName: e.target.value 
                        })}
                        placeholder="e.g., American Red Cross, Local Community Foundation"
                        required
                        error={hasFieldError("charityName") ? getFieldError("charityName") : undefined}
                    />

                    <Input
                        label="Annual Distribution Amount"
                        type="text"
                        value={formatNumberWithCommas(formData.amount)}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        placeholder="$5,000"
                        required
                        error={hasFieldError("amount") ? getFieldError("amount") : undefined}
                    />
                    <Caption color="secondary" className="-mt-2">
                        Maximum annual QCD limit is $105,000 for 2024
                    </Caption>
                </div>
            </div>

            {/* Distribution Timing */}
            <div className="space-y-4">
                <H3>Distribution Timeline</H3>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Distribution Month
                        </label>
                        <select
                            value={month}
                            onChange={(e) => handleYearMonthChange('monthOffset', year, e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Select month</option>
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={(i + 1).toString().padStart(2, "0")}>
                                    {new Date(2024, i).toLocaleDateString("en-US", {
                                        month: "long",
                                    })}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Distribution Year
                        </label>
                        <input
                            type="number"
                            value={year}
                            onChange={(e) => handleYearMonthChange('monthOffset', e.target.value, month)}
                            placeholder="2024"
                            min="2020"
                            max="2100"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                </div>
            </div>

            {/* Source Account */}
            <div className="space-y-4">
                <H3>Source IRA Account</H3>

                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            IRA Account Type
                        </label>
                        <select
                            value={formData.sourceAccountType || ""}
                            onChange={(e) => onChange("sourceAccountType", e.target.value as AccountType)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Select IRA account type</option>
                            <option value="ira">Traditional IRA</option>
                            <option value="other">SEP-IRA</option>
                            <option value="other">SIMPLE IRA</option>
                            <option value="ira">Inherited IRA</option>
                        </select>
                        <Caption color="secondary" className="mt-1">
                            QCDs can only come from traditional (tax-deferred) IRA accounts
                        </Caption>
                    </div>
                </div>
            </div>

            {/* RMD Integration */}
            <div className="space-y-4">
                <H3>RMD Satisfaction</H3>

                <div className="grid grid-cols-1 gap-4">
                    <Input
                        label="RMD Satisfaction Amount"
                        type="text"
                        value={formatNumberWithCommas(formData.satisfiesRmdAmount || formData.amount)}
                        onChange={(e) => handleRmdAmountChange(e.target.value)}
                        placeholder={formatNumberWithCommas(formData.amount) || "$5,000"}
                    />
                    <Caption color="secondary" className="-mt-2">
                        Amount that counts toward your Required Minimum Distribution (typically the full distribution amount)
                    </Caption>

                    <div className="flex items-center space-x-3">
                        <input
                            id="satisfiesFullRmd"
                            type="checkbox"
                            checked={formData.satisfiesFullRmd || false}
                            onChange={(e) => onChange("satisfiesFullRmd", e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <label htmlFor="satisfiesFullRmd" className="text-sm text-gray-700">
                            This QCD will satisfy my entire RMD for the year
                        </label>
                    </div>
                </div>
            </div>

            {/* Important QCD Rules */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <H4 color="success">QCD Tax Benefits</H4>
                        <BodyBase color="success" className="mt-2">
                            <ul className="list-disc list-inside space-y-1">
                                <li>Distribution is excluded from taxable income</li>
                                <li>Counts toward RMD requirements</li>
                                <li>May allow you to claim standard deduction while still getting charitable benefit</li>
                                <li>No charitable deduction limit restrictions</li>
                            </ul>
                        </BodyBase>
                    </div>
                </div>
            </div>

            {/* Important Rules Warning */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <H4 color="danger">Important QCD Requirements</H4>
                        <BodyBase color="danger" className="mt-2">
                            <ul className="list-disc list-inside space-y-1">
                                <li>Must be age 70½ or older when distribution is made</li>
                                <li>Annual limit: $105,000 for 2024</li>
                                <li>Must transfer directly from IRA to qualified charity</li>
                                <li>Cannot claim charitable deduction for QCD amounts</li>
                                <li>Must be to qualifying 501(c)(3) organization</li>
                            </ul>
                        </BodyBase>
                    </div>
                </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-4">
                <H3>Additional Details</H3>

                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description (Optional)
                        </label>
                        <textarea
                            value={formData.description || ""}
                            onChange={(e) => onChange("description", e.target.value)}
                            placeholder="Additional notes about this charitable distribution..."
                            rows={3}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};