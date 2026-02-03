/**
 * StateSelector - Typeable State Selection Component
 * 
 * Provides a searchable/typeable dropdown for US states in alphabetical order
 * with California as the default selection.
 */

import React, { useState, useRef, useEffect } from 'react';
// import { Input } from '@/components/ui';
import { contentService } from '@/services/contentService';
import { BodyBase, Caption } from '@/components/ui/Typography';

interface StateSelectorProps {
  value?: string;
  onChange: (stateCode: string) => void;
  className?: string;
  placeholder?: string;
}

interface State {
  code: string;
  name: string;
}

// Get states from centralized contentService
const US_STATES: State[] = contentService.getUSStates();

// Add no-tax option at the top
const ALL_OPTIONS: State[] = [
  { code: '', name: 'No State Tax' },
  ...US_STATES
];

export const StateSelector: React.FC<StateSelectorProps> = ({
  value = 'CA', // Default to California
  onChange,
  className = '',
  placeholder = 'Type to search states...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get the display value for the current selection
  const selectedState = ALL_OPTIONS.find(state => state.code === value);
  const displayValue = selectedState ? selectedState.name : '';

  // Filter states based on search query
  const filteredStates = ALL_OPTIONS.filter(state =>
    state.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    state.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle input click to open dropdown
  const handleInputClick = () => {
    setIsOpen(true);
    setSearchQuery('');
    setSelectedIndex(-1);
  };

  // Handle input change for searching
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  // Handle state selection
  const handleStateSelect = (stateCode: string) => {
    onChange(stateCode);
    setIsOpen(false);
    setSearchQuery('');
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true);
        setSearchQuery('');
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredStates.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredStates.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredStates.length) {
          handleStateSelect(filteredStates[selectedIndex].code);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        inputRef.current?.blur();
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : displayValue}
          onChange={handleInputChange}
          onClick={handleInputClick}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8 cursor-pointer"
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredStates.length === 0 ? (
            <div className="px-3 py-2">
              <BodyBase color="tertiary">No states found</BodyBase>
            </div>
          ) : (
            filteredStates.map((state, index) => (
              <div
                key={state.code}
                onClick={() => handleStateSelect(state.code)}
                className={`px-3 py-2 cursor-pointer ${
                  index === selectedIndex
                    ? 'bg-blue-500 text-white'
                    : state.code === value
                    ? 'bg-blue-50 text-blue-900'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <BodyBase
                    as="span"
                    color={index === selectedIndex ? 'inverse' : state.code === value ? 'info' : 'primary'}
                  >
                    {state.name}
                  </BodyBase>
                  {state.code && (
                    <Caption as="span" className="opacity-75" color={index === selectedIndex ? 'inverse' : state.code === value ? 'info' : 'primary'}>
                      {state.code}
                    </Caption>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};