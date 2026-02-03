/**
 * Family Event Form
 * 
 * Form for recording major family events with financial impact - 
 * marriages, births, divorces, elderly care, and other family transitions.
 */

import React, { useState } from 'react';
import { H2, H3, H4, BodyBase, Caption, FormLabel } from "@/components/ui/Typography";
import { EventType, EventPriority, StandardAccountType } from '@/types';
import { formatCurrency } from '@/utils/formatting';

interface FamilyEventData {
  id: string;
  type: EventType;
  name: string;
  description: string;
  monthOffset: number;
  priority: EventPriority;
  
  // Event details
  eventType: 'marriage' | 'birth_adoption' | 'divorce' | 'elderly_care' | 'death' | 'child_support' | 'family_emergency' | 'other';
  familyMember?: string; // Who is affected
  
  // Financial impact
  oneTimeCosts?: number; // Immediate costs (wedding, legal fees, etc.)
  monthlyExpenseChange?: number; // Ongoing monthly change (positive or negative)
  durationMonths?: number; // How long the monthly change lasts
  
  // Specific cost categories
  costs?: {
    legal?: number;
    medical?: number;
    childcare?: number;
    eldercare?: number;
    ceremony?: number; // Wedding, funeral, etc.
    other?: number;
  };
  
  // Income impact
  incomeChange?: number; // Monthly income change (spouse working, reduced hours, etc.)
  incomeChangeDuration?: number; // Duration in months
  
  // Tax implications
  dependentStatusChange?: 'add_dependent' | 'remove_dependent' | 'no_change';
  filingStatusChange?: 'single_to_married' | 'married_to_single' | 'no_change';
  
  // Funding source
  fundingSource: StandardAccountType;
  useEmergencyFund?: boolean;
  
  // Insurance implications
  insuranceChanges?: {
    healthInsurance?: 'add_family' | 'individual_to_family' | 'no_change';
    lifeInsurance?: 'increase_coverage' | 'add_policy' | 'no_change';
    disabilityInsurance?: 'add_coverage' | 'no_change';
  };
}

export const FamilyEventForm: React.FC<EventFormProps> = ({
  initialData,
  onSave,
  onCancel,
  monthOffsetCalculator
}) => {
  const [formData, setFormData] = useState<FamilyEventData>({
    id: initialData?.id || `family-event-${Date.now()}`,
    type: EventType.ONE_TIME_EVENT, // Using ONE_TIME_EVENT since FAMILY_EVENT doesn't exist in types
    name: initialData?.name || '',
    description: initialData?.description || '',
    monthOffset: initialData?.monthOffset || 0,
    priority: EventPriority.USER_ACTION,
    
    eventType: 'marriage',
    
    oneTimeCosts: 0,
    monthlyExpenseChange: 0,
    durationMonths: 12,
    
    costs: {
      legal: 0,
      medical: 0,
      childcare: 0,
      eldercare: 0,
      ceremony: 0,
      other: 0
    },
    
    incomeChange: 0,
    incomeChangeDuration: 12,
    
    dependentStatusChange: 'no_change',
    filingStatusChange: 'no_change',
    
    fundingSource: 'cash',
    useEmergencyFund: false,
    
    insuranceChanges: {
      healthInsurance: 'no_change',
      lifeInsurance: 'no_change',
      disabilityInsurance: 'no_change'
    }
  });

  const updateFormData = (updates: Partial<FamilyEventData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateCosts = (costCategory: keyof NonNullable<FamilyEventData['costs']>, value: number) => {
    setFormData(prev => ({
      ...prev,
      costs: {
        ...prev.costs,
        [costCategory]: value
      }
    }));
  };

  const updateInsurance = (insuranceType: keyof NonNullable<FamilyEventData['insuranceChanges']>, value: string) => {
    setFormData(prev => ({
      ...prev,
      insuranceChanges: {
        ...prev.insuranceChanges,
        [insuranceType]: value
      }
    }));
  };

  const calculateTotalOneTimeCosts = () => {
    const costs = formData.costs || {};
    return (formData.oneTimeCosts || 0) + 
           (costs.legal || 0) + 
           (costs.medical || 0) + 
           (costs.childcare || 0) + 
           (costs.eldercare || 0) + 
           (costs.ceremony || 0) + 
           (costs.other || 0);
  };

  const calculateTotalMonthlyImpact = () => {
    const expenseChange = formData.monthlyExpenseChange || 0;
    const incomeChange = formData.incomeChange || 0;
    return incomeChange - expenseChange; // Net monthly impact
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const totalOneTime = calculateTotalOneTimeCosts();
  const monthlyImpact = calculateTotalMonthlyImpact();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <H2>Family Event</H2>
        <BodyBase color="secondary" className="mt-1">
          Record major family events with financial impact
        </BodyBase>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FormLabel className="mb-1">
            Event Name
          </FormLabel>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
            placeholder="e.g., Wedding, Baby Born"
            className="w-full p-2 border border-gray-300 rounded-lg"
            required
          />
        </div>
        
        <div>
          <FormLabel className="mb-1">
            Event Type
          </FormLabel>
          <select
            value={formData.eventType}
            onChange={(e) => updateFormData({ eventType: e.target.value as any })}
            className="w-full p-2 border border-gray-300 rounded-lg"
          >
            <option value="marriage">Marriage/Wedding</option>
            <option value="birth_adoption">Birth/Adoption</option>
            <option value="divorce">Divorce/Separation</option>
            <option value="elderly_care">Elderly Care</option>
            <option value="death">Death in Family</option>
            <option value="child_support">Child Support</option>
            <option value="family_emergency">Family Emergency</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Family Member */}
      <div>
        <FormLabel className="mb-1">
          Family Member (Optional)
        </FormLabel>
        <input
          type="text"
          value={formData.familyMember || ''}
          onChange={(e) => updateFormData({ familyMember: e.target.value })}
          placeholder="e.g., Spouse, Child, Parent"
          className="w-full p-2 border border-gray-300 rounded-lg"
        />
      </div>

      {/* One-Time Costs */}
      <div className="space-y-4">
        <H3>One-Time Costs</H3>
        
        <div>
          <FormLabel className="mb-1">
            General One-Time Expense
          </FormLabel>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              type="number"
              value={formData.oneTimeCosts || 0}
              onChange={(e) => updateFormData({ oneTimeCosts: parseFloat(e.target.value) || 0 })}
              className="w-full p-2 pl-8 border border-gray-300 rounded-lg"
              min="0"
              step="500"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel className="mb-1">
              Legal Fees
            </FormLabel>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={formData.costs?.legal || 0}
                onChange={(e) => updateCosts('legal', parseFloat(e.target.value) || 0)}
                className="w-full p-2 pl-8 border border-gray-300 rounded-lg"
                min="0"
                step="500"
              />
            </div>
          </div>
          
          <div>
            <FormLabel className="mb-1">
              Medical Costs
            </FormLabel>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={formData.costs?.medical || 0}
                onChange={(e) => updateCosts('medical', parseFloat(e.target.value) || 0)}
                className="w-full p-2 pl-8 border border-gray-300 rounded-lg"
                min="0"
                step="500"
              />
            </div>
          </div>
          
          <div>
            <FormLabel className="mb-1">
              Ceremony/Event Costs
            </FormLabel>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={formData.costs?.ceremony || 0}
                onChange={(e) => updateCosts('ceremony', parseFloat(e.target.value) || 0)}
                className="w-full p-2 pl-8 border border-gray-300 rounded-lg"
                min="0"
                step="500"
              />
            </div>
          </div>
          
          <div>
            <FormLabel className="mb-1">
              Other Costs
            </FormLabel>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={formData.costs?.other || 0}
                onChange={(e) => updateCosts('other', parseFloat(e.target.value) || 0)}
                className="w-full p-2 pl-8 border border-gray-300 rounded-lg"
                min="0"
                step="500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ongoing Financial Impact */}
      <div className="space-y-4">
        <H3>Ongoing Financial Impact</H3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel className="mb-1">
              Monthly Expense Change
            </FormLabel>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={formData.monthlyExpenseChange || 0}
                onChange={(e) => updateFormData({ monthlyExpenseChange: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 pl-8 border border-gray-300 rounded-lg"
                step="100"
              />
            </div>
            <Caption color="tertiary" className="mt-1">Positive = increased expenses</Caption>
          </div>
          
          <div>
            <FormLabel className="mb-1">
              Monthly Income Change
            </FormLabel>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={formData.incomeChange || 0}
                onChange={(e) => updateFormData({ incomeChange: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 pl-8 border border-gray-300 rounded-lg"
                step="100"
              />
            </div>
            <Caption color="tertiary" className="mt-1">Positive = increased income</Caption>
          </div>
          
          <div>
            <FormLabel className="mb-1">
              Duration (Months)
            </FormLabel>
            <input
              type="number"
              value={formData.durationMonths || 12}
              onChange={(e) => updateFormData({ durationMonths: parseInt(e.target.value) || 12 })}
              className="w-full p-2 border border-gray-300 rounded-lg"
              min="1"
              max="600"
            />
          </div>
        </div>
      </div>

      {/* Tax Status Changes */}
      <div className="space-y-4">
        <H3>Tax Status Changes</H3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel className="mb-1">
              Dependent Status Change
            </FormLabel>
            <select
              value={formData.dependentStatusChange || 'no_change'}
              onChange={(e) => updateFormData({ dependentStatusChange: e.target.value as any })}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="no_change">No Change</option>
              <option value="add_dependent">Add Dependent</option>
              <option value="remove_dependent">Remove Dependent</option>
            </select>
          </div>
          
          <div>
            <FormLabel className="mb-1">
              Filing Status Change
            </FormLabel>
            <select
              value={formData.filingStatusChange || 'no_change'}
              onChange={(e) => updateFormData({ filingStatusChange: e.target.value as any })}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="no_change">No Change</option>
              <option value="single_to_married">Single to Married</option>
              <option value="married_to_single">Married to Single</option>
            </select>
          </div>
        </div>
      </div>

      {/* Funding */}
      <div className="space-y-4">
        <H3>Funding Source</H3>
        
        <div>
          <FormLabel className="mb-1">
            Primary Funding Source
          </FormLabel>
          <select
            value={formData.fundingSource}
            onChange={(e) => updateFormData({ fundingSource: e.target.value as StandardAccountType })}
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
            id="useEmergencyFund"
            checked={formData.useEmergencyFund || false}
            onChange={(e) => updateFormData({ useEmergencyFund: e.target.checked })}
            className="rounded"
          />
          <FormLabel as="label" htmlFor="useEmergencyFund">
            Use emergency fund if needed
          </FormLabel>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <H4 className="mb-2">Financial Summary</H4>
        <div className="space-y-1">
          <BodyBase className="flex justify-between">
            <span>Total One-Time Costs:</span>
            <span className="text-red-600">{formatCurrency(totalOneTime)}</span>
          </BodyBase>
          <BodyBase className="flex justify-between">
            <span>Net Monthly Impact:</span>
            <span className={monthlyImpact >= 0 ? "text-green-600" : "text-red-600"}>
              {monthlyImpact >= 0 ? '+' : ''}{formatCurrency(monthlyImpact)}/month
            </span>
          </BodyBase>
          <BodyBase className="flex justify-between">
            <span>Duration:</span>
            <span>{formData.durationMonths} months</span>
          </BodyBase>
          <BodyBase weight="medium" className="flex justify-between border-t pt-1">
            <span>Total Impact ({formData.durationMonths} months):</span>
            <span className={monthlyImpact >= 0 ? "text-green-600" : "text-red-600"}>
              {formatCurrency(totalOneTime + (monthlyImpact * (formData.durationMonths || 0)))}
            </span>
          </BodyBase>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-3 pt-4">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save Family Event
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