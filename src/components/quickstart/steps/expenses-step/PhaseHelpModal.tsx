/**
 * PhaseHelpModal - Educational modal explaining expense phases
 *
 * Provides detailed explanations for why expenses change across
 * different life phases (early career, mid career, pre-retirement, retirement).
 */

import React from 'react';
import { Button } from '@/components/ui';

interface PhaseHelpTooltipProps {
  phase: 'earlyCareer' | 'midCareer' | 'preRetirement' | 'retirement';
  isVisible: boolean;
  onClose: () => void;
}

interface PhaseInfo {
  title: string;
  icon: string;
  reasons: string[];
  spending: string;
  color: string;
}

const PHASE_INFO: Record<string, PhaseInfo> = {
  earlyCareer: {
    title: "Early Career (Age < 40)",
    icon: "🌱",
    reasons: [
      "Building lifestyle and establishing career",
      "Often renting, smaller living spaces",
      "Less discretionary spending on luxury items",
      "Building emergency fund and starting investments",
      "Lower healthcare costs due to younger age"
    ],
    spending: "Baseline spending level - 100% of current expenses",
    color: "blue"
  },
  midCareer: {
    title: "Mid Career (Age 40-50)",
    icon: "📈",
    reasons: [
      "Peak earning years with lifestyle inflation",
      "Larger homes, family activities, travel",
      "Kids in expensive activities, potentially college prep",
      "Higher discretionary spending on experiences",
      "May support aging parents financially"
    ],
    spending: "Slightly elevated - 110% of baseline (+10%)",
    color: "green"
  },
  preRetirement: {
    title: "Pre-Retirement (Age 50-65)",
    icon: "🎯",
    reasons: [
      "Peak healthcare costs before Medicare kicks in",
      "Catch-up retirement contributions (higher 401k/IRA limits)",
      "Home improvements and major purchases before retirement",
      "Travel and experiences while still healthy and working",
      "Potential long-term care insurance premiums",
      "Adult children may need financial support (wedding, home buying)"
    ],
    spending: "Elevated - 110% of baseline (+10%)",
    color: "amber"
  },
  retirement: {
    title: "Retirement (Age 65+)",
    icon: "🏖️",
    reasons: [
      "Mortgage typically paid off (no housing payment)",
      "No more commuting, work clothes, or career expenses",
      "Medicare reduces healthcare costs vs. private insurance",
      "Less eating out, more home cooking",
      "Reduced travel and activity as mobility decreases",
      "No longer saving for retirement (living off savings)"
    ],
    spending: "Reduced - 75% of baseline (-25%)",
    color: "purple"
  }
};

const getColorClasses = (color: string) => {
  const colors = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', accent: 'text-blue-600' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', accent: 'text-green-600' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', accent: 'text-amber-600' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', accent: 'text-purple-600' }
  };
  return colors[color as keyof typeof colors] || colors.blue;
};

export const PhaseHelpModal: React.FC<PhaseHelpTooltipProps> = ({ phase, isVisible, onClose }) => {
  if (!isVisible) return null;

  const info = PHASE_INFO[phase];
  const colorClasses = getColorClasses(info.color);

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`phase-help-modal fixed bottom-0 left-0 right-0 bg-white w-full rounded-t-2xl shadow-2xl transform transition-all duration-300 overflow-hidden ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '85vh' }}
      >
        {/* Close Button - Top Right with minimal padding */}
        <div className="absolute top-3 right-4 z-10">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-600 hover:text-gray-800"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Header - Full width with better spacing */}
        <div className={`${colorClasses.bg} ${colorClasses.border} border-b px-4 sm:px-6 pt-4 pb-6 rounded-t-2xl`}>
          <div className="flex items-start space-x-4">
            <span className="text-2xl sm:text-3xl">{info.icon}</span>
            <div className="flex-1">
              <h3 className={`text-lg font-semibold ${colorClasses.text} mb-3`}>
                {info.title}
              </h3>
              <div className={`inline-block px-3 py-2 ${colorClasses.bg} border ${colorClasses.border} rounded-lg`}>
                <p className={`text-xs sm:text-sm font-semibold ${colorClasses.accent}`}>
                  {info.spending}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content - Better layout with improved spacing */}
        <div className="px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <h4 className="text-sm font-semibold text-gray-900 mb-4 sm:mb-6">
            Why this spending level?
          </h4>

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            {info.reasons.map((reason, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className={`w-3 h-3 rounded-full ${colorClasses.accent.replace('text-', 'bg-')} flex-shrink-0 mt-1`} />
                <p className="text-sm text-gray-700 leading-relaxed">
                  {reason}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Important Note
                </p>
                <p className="text-sm text-gray-600">
                  These are general assumptions based on typical spending patterns.
                  Your actual expenses may vary based on your specific situation and lifestyle choices.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Optional close button */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <Button
            variant="primary"
            onClick={onClose}
            className="px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base"
          >
            Got it, thanks!
          </Button>
        </div>
      </div>
    </div>
  );
};