/**
 * Real Estate Purchase Form
 * 
 * Comprehensive form for creating home purchase events that properly models:
 * - Real estate asset creation
 * - Mortgage financing
 * - Down payment liquidation
 * - Closing costs
 */

import React, { useState, useEffect } from 'react';
import { EventType, EventPriority } from '../../../../types/events/base';
import { RealEstatePurchaseEvent, calculateMonthlyMortgagePayment, calculateTotalCashNeeded } from '../../../../types/events/realEstate';
import { AccountType } from '@/types';
import { useEventFormValidation } from '@/hooks/useFormValidation';
import { H3, H4, FormLabel, Caption, Mono, BodyBase } from '@/components/ui/Typography';

interface RealEstatePurchaseFormProps {
  formData: Partial<RealEstatePurchaseEvent>;
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

export const RealEstatePurchaseForm: React.FC<RealEstatePurchaseFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [calculatedPayment, setCalculatedPayment] = useState<number>(0);
  const [totalCashNeeded, setTotalCashNeeded] = useState<number>(0);

  const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
    EventType.REAL_ESTATE_PURCHASE
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Default form state
  const property = formData.property || {
    id: `property-${Date.now()}`,
    name: '',
    type: 'primary_residence' as const,
    purchasePrice: 0,
    purchaseDate: new Date().toISOString().split('T')[0]
  };

  const financing = formData.financing || {
    downPaymentAmount: 0,
    downPaymentSource: 'cash' as const,
    mortgage: {
      principalAmount: 0,
      annualInterestRate: 0.07,
      termInMonths: 360,
      mortgageId: `mortgage-${property.id}`
    }
  };

  const closingCosts = formData.closingCosts || {
    totalAmount: 0,
    source: 'cash' as const
  };

  // Calculate mortgage payment when financing details change
  useEffect(() => {
    if (financing.mortgage) {
      const payment = calculateMonthlyMortgagePayment(
        financing.mortgage.principalAmount,
        financing.mortgage.annualInterestRate,
        financing.mortgage.termInMonths
      );
      setCalculatedPayment(payment);
      
      // Update form data with calculated payment
      onChange('financing', {
        ...financing,
        mortgage: {
          ...financing.mortgage,
          monthlyPayment: payment
        }
      });
    }
  }, [financing.mortgage?.principalAmount, financing.mortgage?.annualInterestRate, financing.mortgage?.termInMonths]);

  // Calculate total cash needed
  useEffect(() => {
    const total = financing.downPaymentAmount + closingCosts.totalAmount;
    setTotalCashNeeded(total);
  }, [financing.downPaymentAmount, closingCosts.totalAmount]);

  // Auto-calculate mortgage principal when purchase price or down payment changes
  useEffect(() => {
    if (property.purchasePrice && financing.downPaymentAmount) {
      const mortgagePrincipal = property.purchasePrice - financing.downPaymentAmount;
      if (mortgagePrincipal > 0) {
        onChange('financing', {
          ...financing,
          mortgage: {
            ...financing.mortgage,
            principalAmount: mortgagePrincipal
          }
        });
      }
    }
  }, [property.purchasePrice, financing.downPaymentAmount]);

  const handlePropertyChange = (field: string, value: any) => {
    const updatedProperty = { ...property, [field]: value };
    onChange('property', updatedProperty);
  };

  const handleFinancingChange = (field: string, value: any) => {
    if (field.startsWith('mortgage.')) {
      const mortgageField = field.split('.')[1];
      const updatedFinancing = {
        ...financing,
        mortgage: {
          ...financing.mortgage,
          [mortgageField]: value
        }
      };
      onChange('financing', updatedFinancing);
    } else {
      const updatedFinancing = { ...financing, [field]: value };
      onChange('financing', updatedFinancing);
    }
  };

  const handleClosingCostsChange = (field: string, value: any) => {
    const updatedClosingCosts = { ...closingCosts, [field]: value };
    onChange('closingCosts', updatedClosingCosts);
  };

  return (
    <div className="space-y-6">
      {/* Property Details Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <H4 className="mb-4">🏠 Property Details</H4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel required>Property Name</FormLabel>
            <input
              type="text"
              value={property.name}
              onChange={(e) => handlePropertyChange('name', e.target.value)}
              placeholder="e.g., 123 Main St, Anytown"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              error={getFieldError('property.name')}
            />
          </div>

          <div>
            <FormLabel required>Property Type</FormLabel>
            <select
              value={property.type}
              onChange={(e) => handlePropertyChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="primary_residence">Primary Residence</option>
              <option value="rental_property">Rental Property</option>
              <option value="vacation_home">Vacation Home</option>
              <option value="commercial">Commercial Property</option>
              <option value="land">Land</option>
            </select>
          </div>

          <div>
            <FormLabel required>Purchase Price</FormLabel>
            <input
              type="number"
              value={property.purchasePrice || ''}
              onChange={(e) => handlePropertyChange('purchasePrice', parseFloat(e.target.value) || 0)}
              placeholder="1200000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              error={getFieldError('property.purchasePrice')}
            />
            <Caption color="secondary" className="mt-1">Total purchase price of the property</Caption>
          </div>

          <div>
            <FormLabel>Purchase Date</FormLabel>
            <input
              type="date"
              value={property.purchaseDate}
              onChange={(e) => handlePropertyChange('purchaseDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Rental Income for Investment Properties */}
        {property.type === 'rental_property' && (
          <div className="mt-4">
            <FormLabel>Annual Rental Income</FormLabel>
            <input
              type="number"
              value={property.annualRentalIncome || ''}
              onChange={(e) => handlePropertyChange('annualRentalIncome', parseFloat(e.target.value) || 0)}
              placeholder="36000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Caption color="secondary" className="mt-1">Expected annual rental income</Caption>
          </div>
        )}
      </div>

      {/* Financing Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <H4 className="mb-4">💳 Financing Details</H4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel required>Down Payment Amount</FormLabel>
            <input
              type="number"
              value={financing.downPaymentAmount || ''}
              onChange={(e) => handleFinancingChange('downPaymentAmount', parseFloat(e.target.value) || 0)}
              placeholder="240000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              error={getFieldError('financing.downPaymentAmount')}
            />
            <Caption color="secondary" className="mt-1">
              {property.purchasePrice > 0 && financing.downPaymentAmount > 0
                ? `${((financing.downPaymentAmount / property.purchasePrice) * 100).toFixed(1)}% down`
                : 'Amount paid upfront'
              }
            </Caption>
          </div>

          <div>
            <FormLabel required>Down Payment Source</FormLabel>
            <select
              value={financing.downPaymentSource}
              onChange={(e) => handleFinancingChange('downPaymentSource', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cash">Cash/Savings</option>
              <option value="taxable">Taxable Investment Account</option>
              <option value="401k">401(k) Loan</option>
              <option value="ira">IRA Withdrawal</option>
              <option value="multiple">Multiple Sources</option>
            </select>
          </div>
        </div>

        {/* Mortgage Details */}
        {property.purchasePrice > financing.downPaymentAmount && (
          <div className="mt-6 p-4 bg-white rounded-lg border border-blue-200">
            <H4 weight="semibold" className="mb-3">🏦 Mortgage Details</H4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <FormLabel>Loan Amount</FormLabel>
                <input
                  type="number"
                  value={financing.mortgage?.principalAmount || 0}
                  onChange={(e) => handleFinancingChange('mortgage.principalAmount', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  readOnly
                />
                <Caption color="secondary" className="mt-1">Auto-calculated: Purchase Price - Down Payment</Caption>
              </div>

              <div>
                <FormLabel>Interest Rate (Annual %)</FormLabel>
                <input
                  type="number"
                  step="0.01"
                  value={(financing.mortgage?.annualInterestRate || 0) * 100}
                  onChange={(e) => handleFinancingChange('mortgage.annualInterestRate', (parseFloat(e.target.value) || 0) / 100)}
                  placeholder="7.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <FormLabel>Term (Years)</FormLabel>
                <select
                  value={financing.mortgage?.termInMonths || 360}
                  onChange={(e) => handleFinancingChange('mortgage.termInMonths', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={360}>30 Years</option>
                  <option value={300}>25 Years</option>
                  <option value={240}>20 Years</option>
                  <option value={180}>15 Years</option>
                  <option value={120}>10 Years</option>
                </select>
              </div>
            </div>

            {calculatedPayment > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <BodyBase weight="medium" className="text-green-800">
                  Monthly Payment (P&I): <Mono weight="bold" className="text-green-800">${calculatedPayment.toLocaleString()}</Mono>
                </BodyBase>
                <Caption className="text-green-600 mt-1">
                  This does not include property taxes, insurance, or PMI
                </Caption>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Closing Costs Section */}
      <div className="bg-yellow-50 p-4 rounded-lg">
        <H4 className="mb-4">📋 Closing Costs</H4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel required>Total Closing Costs</FormLabel>
            <input
              type="number"
              value={closingCosts.totalAmount || ''}
              onChange={(e) => handleClosingCostsChange('totalAmount', parseFloat(e.target.value) || 0)}
              placeholder="25000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              error={getFieldError('closingCosts.totalAmount')}
            />
            <Caption color="secondary" className="mt-1">
              {property.purchasePrice > 0
                ? `Typically 2-5% of purchase price ($${(property.purchasePrice * 0.025).toLocaleString()} - $${(property.purchasePrice * 0.05).toLocaleString()})`
                : 'Lender fees, title insurance, appraisal, etc.'
              }
            </Caption>
          </div>

          <div>
            <FormLabel required>Closing Costs Source</FormLabel>
            <select
              value={closingCosts.source}
              onChange={(e) => handleClosingCostsChange('source', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cash">Cash/Savings</option>
              <option value="taxable">Taxable Investment Account</option>
              <option value="multiple">Multiple Sources</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      {totalCashNeeded > 0 && (
        <div className="bg-purple-50 p-4 rounded-lg">
          <H4 className="mb-3">💰 Cash Required Summary</H4>

          <div className="space-y-2">
            <div className="flex justify-between">
              <BodyBase color="secondary">Down Payment:</BodyBase>
              <Mono weight="medium">${financing.downPaymentAmount.toLocaleString()}</Mono>
            </div>
            <div className="flex justify-between">
              <BodyBase color="secondary">Closing Costs:</BodyBase>
              <Mono weight="medium">${closingCosts.totalAmount.toLocaleString()}</Mono>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <BodyBase weight="semibold">Total Cash Needed:</BodyBase>
              <Mono weight="bold" className="text-purple-600">${totalCashNeeded.toLocaleString()}</Mono>
            </div>
          </div>

          {calculatedPayment > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex justify-between">
                <BodyBase color="secondary">Monthly Mortgage Payment (P&I):</BodyBase>
                <Mono weight="semibold" className="text-blue-600">${calculatedPayment.toLocaleString()}</Mono>
              </div>
              <Caption color="secondary" className="mt-1">
                Add ~$200-500/month for property taxes, insurance, and potential PMI
              </Caption>
            </div>
          )}
        </div>
      )}

      {/* Advanced Options Toggle */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {showAdvanced ? '🔼 Hide Advanced Options' : '🔽 Show Advanced Options'}
        </button>
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <H4>⚙️ Advanced Options</H4>

          {/* Custom Mortgage ID */}
          <div>
            <FormLabel>Custom Mortgage ID</FormLabel>
            <input
              type="text"
              value={financing.mortgage?.mortgageId || ''}
              onChange={(e) => handleFinancingChange('mortgage.mortgageId', e.target.value)}
              placeholder={`mortgage-${property.id}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Caption color="secondary" className="mt-1">Unique identifier for this mortgage liability</Caption>
          </div>

          {/* Property Expenses for Rental Properties */}
          {property.type === 'rental_property' && (
            <div>
              <H4 weight="semibold" className="mb-2">Annual Property Expenses</H4>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Property Tax"
                  onChange={(e) => handlePropertyChange('annualExpenses', {
                    ...property.annualExpenses,
                    propertyTax: parseFloat(e.target.value) || 0
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Insurance"
                  onChange={(e) => handlePropertyChange('annualExpenses', {
                    ...property.annualExpenses,
                    insurance: parseFloat(e.target.value) || 0
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Maintenance"
                  onChange={(e) => handlePropertyChange('annualExpenses', {
                    ...property.annualExpenses,
                    maintenance: parseFloat(e.target.value) || 0
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Management"
                  onChange={(e) => handlePropertyChange('annualExpenses', {
                    ...property.annualExpenses,
                    management: parseFloat(e.target.value) || 0
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RealEstatePurchaseForm;