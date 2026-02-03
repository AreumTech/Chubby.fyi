/**
 * Home Improvement Event Form
 * 
 * Form for recording home improvement projects - kitchen remodels, bathroom renovations,
 * additions, landscaping, and other property upgrades.
 */

import React, { useState } from 'react';
import { EventType, EventPriority, StandardAccountType } from '@/types';
import { formatCurrency } from '@/utils/formatting';
import { H2, H3, H4, BodyBase, FormLabel, Caption } from '@/components/ui/Typography';

interface HomeImprovementEventData {
  id: string;
  type: EventType.HOME_IMPROVEMENT;
  name: string;
  description: string;
  monthOffset: number;
  priority: EventPriority;
  
  // Project details
  projectType: 'kitchen' | 'bathroom' | 'addition' | 'roof' | 'landscaping' | 'flooring' | 'hvac' | 'other';
  projectScope: 'minor' | 'major' | 'full_renovation';
  
  // Cost breakdown
  totalCost: number;
  laborCost: number;
  materialCost: number;
  permitCost?: number;
  contingencyPercentage: number; // Buffer for overruns
  
  // Financing
  paymentSource: StandardAccountType;
  isFinanced?: boolean;
  financing?: {
    loanAmount: number;
    interestRate: number;
    termMonths: number;
    monthlyPayment: number;
  };
  
  // Value impact
  expectedValueIncrease?: number; // How much this adds to home value
  roiPercentage?: number; // Return on investment
  
  // Timeline
  projectDurationMonths: number;
  plannedStartMonth: number;
}

export const HomeImprovementForm: React.FC<EventFormProps> = ({
  initialData,
  onSave,
  onCancel,
  monthOffsetCalculator
}) => {
  const [formData, setFormData] = useState<HomeImprovementEventData>({
    id: initialData?.id || `home-improvement-${Date.now()}`,
    type: EventType.HOME_IMPROVEMENT,
    name: initialData?.name || '',
    description: initialData?.description || '',
    monthOffset: initialData?.monthOffset || 0,
    priority: EventPriority.HOME_IMPROVEMENT,
    
    projectType: 'kitchen',
    projectScope: 'major',
    
    totalCost: 50000,
    laborCost: 30000,
    materialCost: 20000,
    permitCost: 2000,
    contingencyPercentage: 20,
    
    paymentSource: 'cash',
    isFinanced: false,
    
    expectedValueIncrease: 35000,
    roiPercentage: 70,
    
    projectDurationMonths: 3,
    plannedStartMonth: 0
  });

  const updateFormData = (updates: Partial<HomeImprovementEventData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateFinancing = (updates: Partial<NonNullable<HomeImprovementEventData['financing']>>) => {
    if (formData.financing) {
      updateFormData({
        financing: { ...formData.financing, ...updates }
      });
    }
  };

  const calculateTotalWithContingency = () => {
    const baseCost = formData.laborCost + formData.materialCost + (formData.permitCost || 0);
    const contingency = baseCost * (formData.contingencyPercentage / 100);
    return baseCost + contingency;
  };

  const calculateROI = () => {
    if (formData.totalCost === 0) return 0;
    return ((formData.expectedValueIncrease || 0) / formData.totalCost) * 100;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update total cost with contingency
    const finalTotalCost = calculateTotalWithContingency();
    const finalROI = calculateROI();
    
    const finalData = {
      ...formData,
      totalCost: finalTotalCost,
      roiPercentage: finalROI
    };
    
    onSave(finalData);
  };

  const totalWithContingency = calculateTotalWithContingency();
  const roi = calculateROI();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <H2>Home Improvement Project</H2>
        <BodyBase color="secondary" className="mt-1">
          Record a home improvement project with costs, financing, and value impact
        </BodyBase>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FormLabel>
            Project Name
          </FormLabel>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
            placeholder="e.g., Kitchen Remodel"
            className="w-full p-2 border border-gray-300 rounded-lg"
            required
          />
        </div>

        <div>
          <FormLabel>
            Project Type
          </FormLabel>
          <select
            value={formData.projectType}
            onChange={(e) => updateFormData({ projectType: e.target.value as any })}
            className="w-full p-2 border border-gray-300 rounded-lg"
          >
            <option value="kitchen">Kitchen Remodel</option>
            <option value="bathroom">Bathroom Renovation</option>
            <option value="addition">Room Addition</option>
            <option value="roof">Roof Replacement</option>
            <option value="landscaping">Landscaping</option>
            <option value="flooring">Flooring</option>
            <option value="hvac">HVAC System</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Project Scope */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Project Scope
        </label>
        <select
          value={formData.projectScope}
          onChange={(e) => updateFormData({ projectScope: e.target.value as any })}
          className="w-full p-2 border border-gray-300 rounded-lg"
        >
          <option value="minor">Minor Updates ($5K-$15K)</option>
          <option value="major">Major Renovation ($15K-$50K)</option>
          <option value="full_renovation">Full Renovation ($50K+)</option>
        </select>
      </div>

      {/* Cost Breakdown */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Cost Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel>
              Labor Cost
            </FormLabel>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={formData.laborCost}
                onChange={(e) => updateFormData({ laborCost: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 pl-8 border border-gray-300 rounded-lg"
                min="0"
                step="500"
                required
              />
            </div>
          </div>
          
          <div>
            <FormLabel>
              Material Cost
            </FormLabel>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={formData.materialCost}
                onChange={(e) => updateFormData({ materialCost: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 pl-8 border border-gray-300 rounded-lg"
                min="0"
                step="500"
                required
              />
            </div>
          </div>
          
          <div>
            <FormLabel>
              Permit/Inspection Costs
            </FormLabel>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={formData.permitCost || 0}
                onChange={(e) => updateFormData({ permitCost: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 pl-8 border border-gray-300 rounded-lg"
                min="0"
                step="100"
              />
            </div>
          </div>
          
          <div>
            <FormLabel>
              Contingency Buffer
            </FormLabel>
            <div className="relative">
              <input
                type="number"
                value={formData.contingencyPercentage}
                onChange={(e) => updateFormData({ contingencyPercentage: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 pr-8 border border-gray-300 rounded-lg"
                min="0"
                max="50"
                step="1"
              />
              <span className="absolute right-3 top-2 text-gray-500">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Recommended: 15-25%</p>
          </div>
        </div>
      </div>

      {/* Payment Source */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Payment Source
        </label>
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

      {/* Value Impact */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Value Impact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel>
              Expected Value Increase
            </FormLabel>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={formData.expectedValueIncrease || 0}
                onChange={(e) => updateFormData({ expectedValueIncrease: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 pl-8 border border-gray-300 rounded-lg"
                min="0"
                step="1000"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">How much this adds to home value</p>
          </div>
          
          <div>
            <FormLabel>
              Return on Investment (ROI)
            </FormLabel>
            <div className="relative">
              <input
                type="number"
                value={Math.round(roi)}
                readOnly
                className="w-full p-2 pr-8 border border-gray-300 rounded-lg bg-gray-50"
              />
              <span className="absolute right-3 top-2 text-gray-500">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
          </div>
        </div>
      </div>

      {/* Project Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Project Summary</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Labor Cost:</span>
            <span>{formatCurrency(formData.laborCost)}</span>
          </div>
          <div className="flex justify-between">
            <span>Material Cost:</span>
            <span>{formatCurrency(formData.materialCost)}</span>
          </div>
          <div className="flex justify-between">
            <span>Permits & Fees:</span>
            <span>{formatCurrency(formData.permitCost || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span>Contingency ({formData.contingencyPercentage}%):</span>
            <span>{formatCurrency(totalWithContingency - (formData.laborCost + formData.materialCost + (formData.permitCost || 0)))}</span>
          </div>
          <div className="flex justify-between font-medium border-t pt-1">
            <span>Total Project Cost:</span>
            <span>{formatCurrency(totalWithContingency)}</span>
          </div>
          {formData.expectedValueIncrease && (
            <div className="flex justify-between text-green-600">
              <span>Expected Value Add:</span>
              <span>{formatCurrency(formData.expectedValueIncrease)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-3 pt-4">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save Home Improvement Project
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