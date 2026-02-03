/**
 * OnboardingChoice - Multiple Paths for Getting Started
 *
 * Gives users choice between guided quickstart, diving straight into the full interface,
 * or exploring with pre-built persona examples.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { Modal } from '@/components/ui';
import { PersonaSelector } from '@/components/quickstart/components/PersonaSelector';
import { PersonaProfile } from '@/data/personas';
import { H2, H3, Body, BodyBase, Label, Caption } from '@/components/ui/Typography';

interface OnboardingChoiceProps {
  isOpen: boolean;
  onClose: () => void;
  onChooseGuided: () => void;
  onChooseAdvanced: () => void;
  onChooseExample: (persona?: PersonaProfile) => void;
}

export const OnboardingChoice: React.FC<OnboardingChoiceProps> = ({
  isOpen,
  onClose,
  onChooseGuided,
  onChooseAdvanced,
  onChooseExample
}) => {
  const [showPersonas, setShowPersonas] = useState(false);

  const handlePersonaSelected = (persona: PersonaProfile) => {
    onChooseExample(persona);
  };

  const handleBackToChoice = () => {
    setShowPersonas(false);
  };

  if (showPersonas) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="xlarge"
        hideCloseButton={false}
        className="onboarding-choice-modal"
        customClassName="onboarding-choice-backdrop"
      >
        <PersonaSelector
          onSelectPersona={handlePersonaSelected}
          onSkip={handleBackToChoice}
        />
      </Modal>
    );
  }
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Welcome to AreumFire 🚀"
      subtitle="Choose how you'd like to get started"
      size="xlarge"
      hideCloseButton={false}
      className="onboarding-choice-modal !max-w-[95vw] xl:!max-w-[1600px]"
      customClassName="onboarding-choice-backdrop"
    >
      <div className="w-full p-10 flex flex-col">
        {/* Hero Section */}
        <div className="text-center mb-8 px-4">
          <div className="text-5xl mb-4">🎯</div>
          <H2 className="mb-3">
            Your Path to Financial Independence Starts Here
          </H2>
          <Body color="secondary" className="max-w-3xl mx-auto">
            AreumFire is a powerful Monte Carlo simulation tool for planning your financial future.
            Choose how you&apos;d like to begin your journey.
          </Body>
        </div>

        {/* Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 mb-8">
          {/* Guided Path */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
            <div className="relative bg-white border border-gray-200 rounded-lg p-7 h-full flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div className="text-4xl">🎓</div>
                <Label weight="semibold" color="info" className="bg-blue-50 px-3 py-1.5 rounded">
                  RECOMMENDED
                </Label>
              </div>

              <H3 className="mb-3">
                Guided Setup
              </H3>

              <Body color="secondary" className="mb-5 flex-grow">
                Perfect for first-time users. A 5-minute wizard helps you build your FIRE plan with smart defaults and age-based recommendations.
              </Body>

              <div className="space-y-2.5 mb-5">
                <div className="flex items-center">
                  <span className="text-green-500 mr-2.5 text-base">✓</span>
                  <BodyBase color="secondary">Click-based presets</BodyBase>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2.5 text-base">✓</span>
                  <BodyBase color="secondary">Smart expense modeling</BodyBase>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2.5 text-base">✓</span>
                  <BodyBase color="secondary">Instant FIRE calculation</BodyBase>
                </div>
              </div>
              
              <Button
                variant="primary"
                onClick={onChooseGuided}
                className="w-full"
              >
                Start Guided Setup
              </Button>
            </div>
          </div>

          {/* Advanced Path */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
            <div className="relative bg-white border border-gray-200 rounded-lg p-7 h-full flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div className="text-4xl">⚡</div>
                <Label weight="semibold" color="success" className="bg-green-50 px-3 py-1.5 rounded">
                  POWER USER
                </Label>
              </div>

              <H3 className="mb-3">
                Advanced Mode
              </H3>

              <Body color="secondary" className="mb-5 flex-grow">
                For experienced users who know what they want. Jump straight into the full interface with all features unlocked.
              </Body>

              <div className="space-y-2.5 mb-5">
                <div className="flex items-center">
                  <span className="text-green-500 mr-2.5 text-base">✓</span>
                  <BodyBase color="secondary">Full event system</BodyBase>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2.5 text-base">✓</span>
                  <BodyBase color="secondary">Complex strategies</BodyBase>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2.5 text-base">✓</span>
                  <BodyBase color="secondary">Custom scenarios</BodyBase>
                </div>
              </div>
              
              <Button
                variant="secondary"
                onClick={onChooseAdvanced}
                className="w-full"
              >
                Go to Full Interface
              </Button>
            </div>
          </div>

          {/* Example Path */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
            <div className="relative bg-white border border-gray-200 rounded-lg p-7 h-full flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div className="text-4xl">📊</div>
                <Label weight="semibold" color="warning" className="bg-amber-50 px-3 py-1.5 rounded">
                  EXPLORE
                </Label>
              </div>

              <H3 className="mb-3">
                Example Scenarios
              </H3>

              <Body color="secondary" className="mb-5 flex-grow">
                Choose from 6 pre-built personas with realistic financial situations to explore the interface and get inspired.
              </Body>

              <div className="space-y-2.5 mb-5">
                <div className="flex items-center">
                  <span className="text-green-500 mr-2.5 text-base">✓</span>
                  <BodyBase color="secondary">The Accelerator, Navigator & more</BodyBase>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2.5 text-base">✓</span>
                  <BodyBase color="secondary">Realistic financial profiles</BodyBase>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2.5 text-base">✓</span>
                  <BodyBase color="secondary">Fully customizable after loading</BodyBase>
                </div>
              </div>
              
              <Button
                variant="secondary"
                onClick={() => setShowPersonas(true)}
                className="w-full"
              >
                Browse Examples
              </Button>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mx-4 mb-4">
          <Label weight="semibold" align="center" className="mb-3 block">
            Why AreumFire?
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-xl mb-1">🎲</div>
              <Caption weight="medium" className="block">Monte Carlo</Caption>
              <Caption color="secondary">10,000 simulations</Caption>
            </div>
            <div>
              <div className="text-xl mb-1">🏦</div>
              <Caption weight="medium" className="block">Tax-Aware</Caption>
              <Caption color="secondary">Account optimization</Caption>
            </div>
            <div>
              <div className="text-xl mb-1">📈</div>
              <Caption weight="medium" className="block">Real Returns</Caption>
              <Caption color="secondary">Historical data</Caption>
            </div>
            <div>
              <div className="text-xl mb-1">🔒</div>
              <Caption weight="medium" className="block">Private</Caption>
              <Caption color="secondary">100% client-side</Caption>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mb-4 px-4">
          <Caption color="tertiary">
            You can always access these options later from the menu.
            Your data is saved locally and never leaves your device.
          </Caption>
        </div>

        {/* Bottom Spacer */}
        <div className="flex-grow"></div>
      </div>
    </Modal>
  );
};