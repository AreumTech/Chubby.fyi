/**
 * Education Expense Event Form
 * 
 * Form for recording continuing education expenses - professional certifications,
 * graduate school, vocational training, and other career development costs.
 * This is different from 529 education savings - this is for immediate education expenses.
 */

import React, { useState } from 'react';
import { EventType, EventPriority, StandardAccountType } from '@/types';
import { formatCurrency } from '@/utils/formatting';
import { H2, H3, H4, BodyBase, Caption, FormLabel } from '@/components/ui/Typography';

interface EducationExpenseEventData {
  id: string;
  type: EventType.EDUCATION_EXPENSE;
  name: string;
  description: string;
  monthOffset: number;
  priority: EventPriority;
  
  // Education details
  educationType: 'certification' | 'graduate_degree' | 'professional_training' | 'vocational' | 'conference' | 'online_course' | 'other';
  institution?: string;
  programName?: string;
  duration: 'one_time' | 'semester' | 'annual' | 'multi_year';
  
  // Cost breakdown
  totalCost: number;
  tuitionCost: number;
  booksMaterialsCost?: number;
  technologyCost?: number;
  examFeesCost?: number;
  
  // Payment details
  paymentSource: StandardAccountType;
  isEmployerReimbursed?: boolean;
  reimbursementAmount?: number;
  reimbursementDelay?: number; // months until reimbursement
  
  // Career impact
  expectedSalaryIncrease?: number;
  careerAdvancement?: string;
  isRequiredForJob?: boolean;
  
  // Tax implications
  isTaxDeductible?: boolean;
  qualifiesForCredit?: boolean; // Education tax credits
}

export const EducationExpenseForm: React.FC<EventFormProps> = ({
  initialData,
  onSave,
  onCancel,
  monthOffsetCalculator
}) => {
  const [formData, setFormData] = useState<EducationExpenseEventData>({
    id: initialData?.id || `education-expense-${Date.now()}`,
    type: EventType.EDUCATION_EXPENSE,
    name: initialData?.name || '',
    description: initialData?.description || '',
    monthOffset: initialData?.monthOffset || 0,
    priority: EventPriority.EDUCATION_EXPENSE,
    
    educationType: 'certification',
    duration: 'one_time',
    
    totalCost: 5000,
    tuitionCost: 4000,
    booksMaterialsCost: 500,
    technologyCost: 300,
    examFeesCost: 200,
    
    paymentSource: 'cash',
    isEmployerReimbursed: false,
    
    isRequiredForJob: false,
    isTaxDeductible: false,
    qualifiesForCredit: false
  });

  const updateFormData = (updates: Partial<EducationExpenseEventData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const calculateNetCost = () => {
    const reimbursement = formData.isEmployerReimbursed ? (formData.reimbursementAmount || 0) : 0;
    return Math.max(0, formData.totalCost - reimbursement);
  };

  const calculateTotalCost = () => {
    return (
      formData.tuitionCost +
      (formData.booksMaterialsCost || 0) +
      (formData.technologyCost || 0) +
      (formData.examFeesCost || 0)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update total cost based on breakdown
    const calculatedTotal = calculateTotalCost();
    
    const finalData = {
      ...formData,
      totalCost: calculatedTotal
    };
    
    onSave(finalData);
  };

  const netCost = calculateNetCost();
  const totalCost = calculateTotalCost();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <H2>Education Expense</H2>
        <BodyBase color="secondary" className="mt-1">
          Record continuing education and professional development expenses
        </BodyBase>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FormLabel className="mb-1">
            Education Name
          </FormLabel>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
            placeholder="e.g., PMP Certification"
            className="w-full p-2 border border-gray-300 rounded-lg"
            required
          />
        </div>

        <div>
          <FormLabel className="mb-1">
            Education Type
          </FormLabel>
          <select
            value={formData.educationType}
            onChange={(e) => updateFormData({ educationType: e.target.value as any })}
            className="w-full p-2 border border-gray-300 rounded-lg"
          >
            <option value="certification">Professional Certification</option>
            <option value="graduate_degree">Graduate Degree</option>
            <option value="professional_training">Professional Training</option>
            <option value="vocational">Vocational Training</option>
            <option value="conference">Conference/Workshop</option>
            <option value="online_course">Online Course</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Program Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FormLabel className="mb-1">
            Institution/Provider
          </FormLabel>
          <input
            type="text"
            value={formData.institution || ''}
            onChange={(e) => updateFormData({ institution: e.target.value })}
            placeholder="e.g., PMI, University of ABC"
            className="w-full p-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <FormLabel className="mb-1">
            Duration
          </FormLabel>
          <select
            value={formData.duration}
            onChange={(e) => updateFormData({ duration: e.target.value as any })}
            className="w-full p-2 border border-gray-300 rounded-lg"
          >
            <option value="one_time">One-time</option>
            <option value="semester">Semester</option>
            <option value="annual">Annual</option>
            <option value="multi_year">Multi-year</option>
          </select>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="space-y-4">
        <H3>Cost Breakdown</H3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel className="mb-1">
              Tuition/Course Fee
            </FormLabel>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={formData.tuitionCost}
                onChange={(e) => updateFormData({ tuitionCost: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 pl-8 border border-gray-300 rounded-lg"
                min="0"
                step="100"
                required
              />
            </div>
          </div>

          <div>
            <FormLabel className="mb-1">
              Books & Materials
            </FormLabel>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={formData.booksMaterialsCost || 0}
                onChange={(e) => updateFormData({ booksMaterialsCost: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 pl-8 border border-gray-300 rounded-lg"
                min="0"
                step="50"
              />
            </div>
          </div>

          <div>
            <FormLabel className="mb-1">
              Technology/Equipment
            </FormLabel>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={formData.technologyCost || 0}
                onChange={(e) => updateFormData({ technologyCost: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 pl-8 border border-gray-300 rounded-lg"
                min="0"
                step="50"
              />
            </div>
          </div>

          <div>
            <FormLabel className="mb-1">
              Exam/Certification Fees
            </FormLabel>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={formData.examFeesCost || 0}
                onChange={(e) => updateFormData({ examFeesCost: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 pl-8 border border-gray-300 rounded-lg"
                min="0"
                step="50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div className="space-y-4">
        <H3>Payment Details</H3>

        <div>
          <FormLabel className="mb-1">
            Payment Source
          </FormLabel>
          <select
            value={formData.paymentSource}
            onChange={(e) => updateFormData({ paymentSource: e.target.value as StandardAccountType })}
            className="w-full p-2 border border-gray-300 rounded-lg"
          >
            <option value="cash">Savings/Cash Account</option>
            <option value="taxable">Investment Account</option>
            <option value="tax_deferred">401(k)/Traditional IRA</option>
            <option value="roth">Roth IRA</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isEmployerReimbursed"
            checked={formData.isEmployerReimbursed || false}
            onChange={(e) => updateFormData({ isEmployerReimbursed: e.target.checked })}
            className="rounded"
          />
          <FormLabel as="label" htmlFor="isEmployerReimbursed">
            Employer will reimburse this expense
          </FormLabel>
        </div>
        
        {formData.isEmployerReimbursed && (
          <div className="pl-6 space-y-4 border-l-2 border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FormLabel className="mb-1">
                  Reimbursement Amount
                </FormLabel>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={formData.reimbursementAmount || 0}
                    onChange={(e) => updateFormData({ reimbursementAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 pl-8 border border-gray-300 rounded-lg"
                    min="0"
                    max={totalCost}
                    step="100"
                  />
                </div>
              </div>

              <div>
                <FormLabel className="mb-1">
                  Reimbursement Delay
                </FormLabel>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.reimbursementDelay || 0}
                    onChange={(e) => updateFormData({ reimbursementDelay: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 pr-16 border border-gray-300 rounded-lg"
                    min="0"
                    max="12"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">months</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Career Impact */}
      <div className="space-y-4">
        <H3>Career Impact</H3>

        <div>
          <FormLabel className="mb-1">
            Expected Annual Salary Increase
          </FormLabel>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              type="number"
              value={formData.expectedSalaryIncrease || 0}
              onChange={(e) => updateFormData({ expectedSalaryIncrease: parseFloat(e.target.value) || 0 })}
              className="w-full p-2 pl-8 border border-gray-300 rounded-lg"
              min="0"
              step="1000"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isRequiredForJob"
            checked={formData.isRequiredForJob || false}
            onChange={(e) => updateFormData({ isRequiredForJob: e.target.checked })}
            className="rounded"
          />
          <FormLabel as="label" htmlFor="isRequiredForJob">
            Required for current job or promotion
          </FormLabel>
        </div>
      </div>

      {/* Tax Implications */}
      <div className="space-y-4">
        <H3>Tax Implications</H3>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isTaxDeductible"
              checked={formData.isTaxDeductible || false}
              onChange={(e) => updateFormData({ isTaxDeductible: e.target.checked })}
              className="rounded"
            />
            <FormLabel as="label" htmlFor="isTaxDeductible">
              Qualifies for business expense deduction
            </FormLabel>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="qualifiesForCredit"
              checked={formData.qualifiesForCredit || false}
              onChange={(e) => updateFormData({ qualifiesForCredit: e.target.checked })}
              className="rounded"
            />
            <FormLabel as="label" htmlFor="qualifiesForCredit">
              Qualifies for education tax credits
            </FormLabel>
          </div>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <H4 className="mb-2">Cost Summary</H4>
        <div className="space-y-1">
          <BodyBase className="flex justify-between">
            <span>Tuition/Course Fee:</span>
            <span>{formatCurrency(formData.tuitionCost)}</span>
          </BodyBase>
          <BodyBase className="flex justify-between">
            <span>Books & Materials:</span>
            <span>{formatCurrency(formData.booksMaterialsCost || 0)}</span>
          </BodyBase>
          <BodyBase className="flex justify-between">
            <span>Technology/Equipment:</span>
            <span>{formatCurrency(formData.technologyCost || 0)}</span>
          </BodyBase>
          <BodyBase className="flex justify-between">
            <span>Exam/Certification Fees:</span>
            <span>{formatCurrency(formData.examFeesCost || 0)}</span>
          </BodyBase>
          <BodyBase weight="medium" className="flex justify-between border-t pt-1">
            <span>Total Cost:</span>
            <span>{formatCurrency(totalCost)}</span>
          </BodyBase>
          {formData.isEmployerReimbursed && formData.reimbursementAmount && (
            <>
              <BodyBase className="flex justify-between text-green-600">
                <span>Employer Reimbursement:</span>
                <span>-{formatCurrency(formData.reimbursementAmount)}</span>
              </BodyBase>
              <BodyBase weight="medium" className="flex justify-between text-green-600">
                <span>Net Cost to You:</span>
                <span>{formatCurrency(netCost)}</span>
              </BodyBase>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-3 pt-4">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save Education Expense
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};