/**
 * Location and Family Selection Components
 *
 * Provides UI components for selecting location (HCOL/MCOL/LCOL)
 * and family size (single/couple/family).
 */

import React from 'react';
import { Button } from '@/components/ui';
import { EXPENSE_PRESETS, LocationType, FamilySize } from './expensePresets';

interface LocationSelectorProps {
  selectedLocation: LocationType;
  onLocationChange: (location: LocationType) => void;
}

interface FamilySelectorProps {
  selectedFamily: FamilySize;
  onFamilyChange: (family: FamilySize) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedLocation,
  onLocationChange
}) => {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Where do you live?
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {(Object.keys(EXPENSE_PRESETS) as LocationType[]).map((location) => (
          <Button
            key={location}
            variant={selectedLocation === location ? 'primary' : 'secondary'}
            onClick={() => onLocationChange(location)}
            className="text-left px-3 py-4 min-h-[4rem] flex flex-col justify-center"
          >
            <div className="font-medium text-sm md:text-base">{location}</div>
            <div className="text-xs opacity-80 mt-0.5 leading-tight">
              {EXPENSE_PRESETS[location].name}
            </div>
            <div className="text-xs opacity-60 mt-0.5 leading-tight">
              {EXPENSE_PRESETS[location].examples}
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};

export const FamilySelector: React.FC<FamilySelectorProps> = ({
  selectedFamily,
  onFamilyChange
}) => {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        What&apos;s your household size?
      </label>
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant={selectedFamily === 'single' ? 'primary' : 'secondary'}
          onClick={() => onFamilyChange('single')}
        >
          <div>👤</div>
          <div className="text-sm">Single</div>
        </Button>
        <Button
          variant={selectedFamily === 'couple' ? 'primary' : 'secondary'}
          onClick={() => onFamilyChange('couple')}
        >
          <div>👥</div>
          <div className="text-sm">Couple</div>
        </Button>
        <Button
          variant={selectedFamily === 'family' ? 'primary' : 'secondary'}
          onClick={() => onFamilyChange('family')}
        >
          <div>👨‍👩‍👧‍👦</div>
          <div className="text-sm">Family w/ Kids</div>
        </Button>
      </div>
    </div>
  );
};