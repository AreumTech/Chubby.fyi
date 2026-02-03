/**
 * HelpTooltip Component
 * 
 * Specialized tooltip component for providing contextual help with FIRE concepts
 * and financial terminology. Includes predefined content for common concepts.
 */

import React from 'react';
import { Tooltip } from './Tooltip';
import { contentService } from '@/services/contentService';

// Help content is now managed by the centralized contentService

interface HelpTooltipProps {
  concept: string;
  children: React.ReactNode;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  concept,
  children,
  className = '',
  position = 'top',
  maxWidth = 'md',
  showIcon = true
}) => {
  // Use centralized contentService instead of hardcoded content
  const helpContent = contentService.getHelpContent(concept);

  if (!helpContent) {
    // Content not found
    return <>{children}</>;
  }

  const tooltipText = `${helpContent.title}

${helpContent.content}`;

  return (
    <Tooltip
      text={tooltipText}
      type="help"
      position={position}
      maxWidth={maxWidth}
      showIcon={showIcon}
      className={className}
      delay={200}
    >
      {children}
    </Tooltip>
  );
};

/**
 * Helper component for adding help icons next to labels
 */
interface HelpIconProps {
  concept: string;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const HelpIcon: React.FC<HelpIconProps> = ({ 
  concept, 
  className = '',
  position = 'top'
}) => {
  return (
    <HelpTooltip 
      concept={concept} 
      position={position}
      className={`inline-flex ${className}`}
    >
      <button
        type="button"
        className="ml-1 text-gray-400 hover:text-blue-500 focus:text-blue-500 transition-colors duration-200"
        aria-label="More information"
        tabIndex={0}
      >
        <svg 
          className="w-4 h-4" 
          fill="currentColor" 
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path 
            fillRule="evenodd" 
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" 
            clipRule="evenodd" 
          />
        </svg>
      </button>
    </HelpTooltip>
  );
};

/**
 * Enhanced label component with optional help tooltip
 */
interface LabelWithHelpProps {
  children: React.ReactNode;
  helpConcept?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
}

export const LabelWithHelp: React.FC<LabelWithHelpProps> = ({
  children,
  helpConcept,
  required = false,
  htmlFor,
  className = ''
}) => {
  return (
    <label 
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-700 mb-2 ${className}`}
    >
      <span className="flex items-center">
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
        {helpConcept && <HelpIcon concept={helpConcept} />}
      </span>
    </label>
  );
};