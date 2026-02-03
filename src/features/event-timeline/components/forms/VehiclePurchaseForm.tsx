/**
 * Vehicle Purchase Event Form
 * 
 * Form for recording vehicle purchases - cars, trucks, motorcycles, etc.
 * Handles both cash purchases and financed purchases.
 */

import React, { useState } from 'react';
import { H2, H3, H4, BodyBase, Caption, FormLabel } from "@/components/ui/Typography";
import { EventType, EventPriority, StandardAccountType } from '@/types';
import { formatCurrency } from '@/utils/formatting';

interface VehiclePurchaseEventData {
  id: string;
  type: EventType.VEHICLE_PURCHASE;
  name: string;
  description: string;
  monthOffset: number;
  priority: EventPriority;
  
  // Vehicle details
  vehicleType: 'car' | 'truck' | 'motorcycle' | 'rv' | 'boat' | 'other';
  vehicleDetails: {
    make?: string;
    model?: string;
    year?: number;
    condition: 'new' | 'used' | 'certified_pre_owned';
  };
  
  // Purchase details
  purchasePrice: number;
  downPayment: number;
  sourceAccount: StandardAccountType; // Where down payment comes from
  
  // Financing (if applicable)
  isFinanced: boolean;
  financing?: {
    loanAmount: number;
    interestRate: number;
    termMonths: number;
    monthlyPayment: number;
  };
  
  // Additional costs
  additionalCosts?: {
    salesTax?: number;
    registration?: number;
    insurance?: number; // First year insurance prepayment
    warrantyExtended?: number;
  };
}

export const VehiclePurchaseForm: React.FC<EventFormProps> = ({
  initialData,
  onSave,
  onCancel,
  monthOffsetCalculator
}) => {
  const [formData, setFormData] = useState<VehiclePurchaseEventData>({
    id: initialData?.id || `vehicle-purchase-${Date.now()}`,
    type: EventType.VEHICLE_PURCHASE,
    name: initialData?.name || '',
    description: initialData?.description || '',
    monthOffset: initialData?.monthOffset || 0,
    priority: EventPriority.VEHICLE_PURCHASE,
    
    vehicleType: 'car',
    vehicleDetails: {
      condition: 'used'
    },
    
    purchasePrice: 25000,
    downPayment: 5000,
    sourceAccount: 'cash',
    
    isFinanced: true,
    financing: {
      loanAmount: 20000,
      interestRate: 0.06,
      termMonths: 60,
      monthlyPayment: 386.66
    }
  });

  const updateFormData = (updates: Partial<VehiclePurchaseEventData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateFinancing = (updates: Partial<NonNullable<VehiclePurchaseEventData['financing']>>) => {
    if (formData.financing) {
      updateFormData({
        financing: { ...formData.financing, ...updates }
      });
    }
  };

  const calculateMonthlyPayment = () => {
    if (!formData.financing) return;
    
    const { loanAmount, interestRate, termMonths } = formData.financing;
    const monthlyRate = interestRate / 12;
    const payment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
    
    updateFinancing({ monthlyPayment: Math.round(payment * 100) / 100 });
  };

  const handleFinancingChange = (field: keyof NonNullable<VehiclePurchaseEventData['financing']>, value: number) => {
    updateFinancing({ [field]: value });
    
    // Auto-calculate monthly payment when loan terms change
    if (field === 'loanAmount' || field === 'interestRate' || field === 'termMonths') {
      setTimeout(calculateMonthlyPayment, 100);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const totalCost = formData.purchasePrice + 
    (formData.additionalCosts?.salesTax || 0) +
    (formData.additionalCosts?.registration || 0) +
    (formData.additionalCosts?.insurance || 0) +
    (formData.additionalCosts?.warrantyExtended || 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <H2>Vehicle Purchase</H2>
        <BodyBase color="secondary" className="mt-1">
          Record a vehicle purchase including financing and additional costs
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
            placeholder="e.g., Buy Honda Civic"
            className="w-full p-2 border border-gray-300 rounded-lg"
            required
          />
        </div>
        
        <div>
          <FormLabel className="mb-1">
            Vehicle Type
          </FormLabel>
          <select
            value={formData.vehicleType}
            onChange={(e) => updateFormData({ vehicleType: e.target.value as any })}
            className="w-full p-2 border border-gray-300 rounded-lg"
          >
            <option value="car">Car</option>
            <option value="truck">Truck</option>
            <option value="motorcycle">Motorcycle</option>
            <option value="rv">RV/Motorhome</option>
            <option value="boat">Boat</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Vehicle Details */}
      <div className="space-y-4">
        <H3>Vehicle Details</H3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <FormLabel className="mb-1">
              Make
            </FormLabel>
            <input
              type="text"
              value={formData.vehicleDetails.make || ''}
              onChange={(e) => updateFormData({
                vehicleDetails: { ...formData.vehicleDetails, make: e.target.value }
              })}
              placeholder="e.g., Honda"
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <FormLabel className="mb-1">
              Model
            </FormLabel>
            <input
              type="text"
              value={formData.vehicleDetails.model || ''}
              onChange={(e) => updateFormData({
                vehicleDetails: { ...formData.vehicleDetails, model: e.target.value }
              })}
              placeholder="e.g., Civic"
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <FormLabel className="mb-1">
              Year
            </FormLabel>
            <input
              type="number"
              value={formData.vehicleDetails.year || ''}
              onChange={(e) => updateFormData({
                vehicleDetails: { ...formData.vehicleDetails, year: parseInt(e.target.value) }
              })}
              placeholder="2020"
              min="1980"
              max="2030"
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
        
        <div>
          <FormLabel className="mb-1">
            Condition
          </FormLabel>
          <select
            value={formData.vehicleDetails.condition}
            onChange={(e) => updateFormData({
              vehicleDetails: { ...formData.vehicleDetails, condition: e.target.value as any }
            })}
            className="w-full p-2 border border-gray-300 rounded-lg"
          >
            <option value="new">New</option>
            <option value="used">Used</option>
            <option value="certified_pre_owned">Certified Pre-Owned</option>
          </select>
        </div>
      </div>

      {/* Purchase Details */}
      <div className="space-y-4">
        <H3>Purchase Details</H3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel className="mb-1">
              Purchase Price
            </FormLabel>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={formData.purchasePrice}
                onChange={(e) => updateFormData({ purchasePrice: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 pl-8 border border-gray-300 rounded-lg"
                min="0"
                step="100"
                required
              />
            </div>
          </div>
          
          <div>
            <FormLabel className="mb-1">
              Down Payment
            </FormLabel>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={formData.downPayment}
                onChange={(e) => {
                  const downPayment = parseFloat(e.target.value) || 0;
                  updateFormData({ downPayment });
                  if (formData.financing) {
                    updateFinancing({ loanAmount: formData.purchasePrice - downPayment });
                  }
                }}
                className="w-full p-2 pl-8 border border-gray-300 rounded-lg"
                min="0"
                max={formData.purchasePrice}
                step="100"
                required
              />
            </div>
          </div>
        </div>
        
        <div>
          <FormLabel className="mb-1">
            Down Payment Source Account
          </FormLabel>
          <select
            value={formData.sourceAccount}
            onChange={(e) => updateFormData({ sourceAccount: e.target.value as StandardAccountType })}
            className="w-full p-2 border border-gray-300 rounded-lg"
          >
            <option value="cash">Savings/Cash Account</option>
            <option value="taxable">Investment Account</option>
            <option value="tax_deferred">401(k)/Traditional IRA</option>
            <option value="roth">Roth IRA</option>
          </select>
        </div>
      </div>

      {/* Financing */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isFinanced"
            checked={formData.isFinanced}
            onChange={(e) => updateFormData({ isFinanced: e.target.checked })}
            className="rounded"
          />
          <FormLabel as="label" htmlFor="isFinanced">
            This purchase is financed (loan/lease)
          </FormLabel>
        </div>
        
        {formData.isFinanced && formData.financing && (
          <div className="pl-6 space-y-4 border-l-2 border-blue-200">
            <H4>Financing Details</H4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FormLabel className="mb-1">
                  Loan Amount
                </FormLabel>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={formData.financing.loanAmount}
                    onChange={(e) => handleFinancingChange('loanAmount', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 pl-8 border border-gray-300 rounded-lg"
                    min="0"
                    step="100"
                  />
                </div>
              </div>
              
              <div>
                <FormLabel className="mb-1">
                  Interest Rate (APR)
                </FormLabel>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.financing.interestRate * 100}
                    onChange={(e) => handleFinancingChange('interestRate', (parseFloat(e.target.value) || 0) / 100)}
                    className="w-full p-2 pr-8 border border-gray-300 rounded-lg"
                    min="0"
                    max="30"
                    step="0.1"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">%</span>
                </div>
              </div>
              
              <div>
                <FormLabel className="mb-1">
                  Term (months)
                </FormLabel>
                <input
                  type="number"
                  value={formData.financing.termMonths}
                  onChange={(e) => handleFinancingChange('termMonths', parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  min="6"
                  max="84"
                />
              </div>
              
              <div>
                <FormLabel className="mb-1">
                  Monthly Payment
                </FormLabel>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={formData.financing.monthlyPayment}
                    onChange={(e) => handleFinancingChange('monthlyPayment', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 pl-8 border border-gray-300 rounded-lg bg-gray-50"
                    readOnly
                  />
                </div>
                <Caption color="tertiary" className="mt-1">Auto-calculated</Caption>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <H4 className="mb-2">Purchase Summary</H4>
        <div className="space-y-1">
          <BodyBase className="flex justify-between">
            <span>Purchase Price:</span>
            <span>{formatCurrency(formData.purchasePrice)}</span>
          </BodyBase>
          <BodyBase className="flex justify-between">
            <span>Down Payment:</span>
            <span>{formatCurrency(formData.downPayment)}</span>
          </BodyBase>
          {formData.isFinanced && formData.financing && (
            <BodyBase className="flex justify-between">
              <span>Loan Amount:</span>
              <span>{formatCurrency(formData.financing.loanAmount)}</span>
            </BodyBase>
          )}
          <BodyBase weight="medium" className="flex justify-between border-t pt-1">
            <span>Total Cost:</span>
            <span>{formatCurrency(totalCost)}</span>
          </BodyBase>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-3 pt-4">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save Vehicle Purchase
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