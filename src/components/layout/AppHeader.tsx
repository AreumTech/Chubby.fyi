/**
 * AppHeader - Unified header for both Landing Page and Dashboard
 *
 * Ensures consistent branding, spacing, and functionality across all pages
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { HelpModal } from '@/components/modals/HelpModal';
import { ScenarioManagementPanel } from '@/components/dashboard/ScenarioManagementPanel';
import { HamburgerButton } from '@/components/ui/HamburgerButton';

interface AppHeaderProps {
  /**
   * Type of page this header appears on
   * - 'landing': Shows "Try Free" button, sticky positioning
   * - 'app': Shows scenario management, fixed positioning
   */
  variant: 'landing' | 'app';

  /** Dashboard-specific props */
  onMobileSidebarToggle?: () => void;
  isMobileSidebarOpen?: boolean;
  onRunSimulation?: () => void;
  isSimulating?: boolean;
  animatedEmoji?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  variant,
  onMobileSidebarToggle,
  isMobileSidebarOpen = false,
  onRunSimulation,
  isSimulating = false,
  animatedEmoji = '🔮'
}) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const navigate = useNavigate();

  const isLanding = variant === 'landing';

  return (
    <>
      <header
        className={`
          flex justify-between items-center px-4 py-2.5
          border-b border-areum-border bg-areum-surface
          ${isLanding ? 'sticky top-0 z-50 bg-areum-surface/80 backdrop-blur' : ''}
        `}
      >
        {/* Left side - Logo with optional hamburger for mobile dashboard */}
        <div className="flex items-center gap-2">
          {/* Hamburger button - only for dashboard on mobile */}
          {!isLanding && onMobileSidebarToggle && (
            <div className="md:hidden">
              <HamburgerButton
                isOpen={isMobileSidebarOpen}
                onClick={onMobileSidebarToggle}
                className="text-areum-text-secondary hover:text-areum-text-primary"
              />
            </div>
          )}

          {/* Logo - Consistent across all pages */}
          <span className="text-md-areum font-semibold text-areum-text-primary tracking-tight">
            Areum<span className="text-areum-accent">Fire</span>
          </span>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Help button - Always present */}
          <button
            onClick={() => setIsHelpOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 text-sm-areum text-areum-text-secondary hover:text-areum-accent hover:bg-areum-accent/10 rounded-md-areum transition-colors"
            title="Help & Documentation"
          >
            <span>How it works?</span>
          </button>

          {/* Conditional actions based on page type */}
          {isLanding ? (
            <button
              onClick={() => navigate('/app')}
              className="flex items-center gap-1.5 border border-areum-accent rounded-md-areum px-2 py-1 bg-areum-accent hover:bg-areum-accent/90 text-white transition-colors"
            >
              <span className="text-sm-areum font-medium">Try Free →</span>
            </button>
          ) : (
            <>
              <ScenarioManagementPanel />

              {/* Run Simulation Button - Dashboard only */}
              {onRunSimulation && (
                <button
                  onClick={onRunSimulation}
                  disabled={isSimulating}
                  className={`flex items-center gap-1.5 border rounded-md-areum px-2 py-1 transition-colors ${
                    isSimulating
                      ? 'border-areum-border bg-areum-border text-areum-text-tertiary cursor-not-allowed'
                      : 'border-areum-accent bg-areum-accent hover:bg-areum-accent/90 text-white'
                  }`}
                >
                  <span className="text-sm">{animatedEmoji}</span>
                  <span className="text-sm-areum font-medium">Run</span>
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {/* Help Modal - Shared */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
};
