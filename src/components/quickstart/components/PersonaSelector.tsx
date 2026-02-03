/**
 * PersonaSelector - Choose from pre-built financial profiles
 * 
 * Allows users to select from example scenarios that match their
 * situation, providing a quick way to populate the wizard with
 * realistic starting values.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { PersonaProfile, PERSONAS, getPersonaEventSummary } from '@/data/personas';
import { Button } from '@/components/ui';
import { H2, H3, H4, H5, BodyBase, Caption, Mono } from '@/components/ui/Typography';

interface PersonaSelectorProps {
  onSelectPersona: (persona: PersonaProfile) => void;
  onSkip: () => void;
}

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  onSelectPersona,
  onSkip
}) => {
  const [selectedPersona, setSelectedPersona] = useState<PersonaProfile | null>(PERSONAS[0]);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const personaRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const handlePersonaClick = (persona: PersonaProfile) => {
    setSelectedPersona(persona);
  };

  const updateScrollButtons = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth
    );
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollAmount = 300; // Adjust as needed
    
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollButtons);
      updateScrollButtons(); // Initial check
      
      return () => {
        container.removeEventListener('scroll', updateScrollButtons);
      };
    }
  }, [updateScrollButtons]);

  const handlePersonaKeyDown = useCallback((event: React.KeyboardEvent, persona: PersonaProfile, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlePersonaClick(persona);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      const nextIndex = (index + 1) % PERSONAS.length;
      setFocusedIndex(nextIndex);
      personaRefs.current[nextIndex]?.focus();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const prevIndex = (index - 1 + PERSONAS.length) % PERSONAS.length;
      setFocusedIndex(prevIndex);
      personaRefs.current[prevIndex]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      setFocusedIndex(0);
      personaRefs.current[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      const lastIndex = PERSONAS.length - 1;
      setFocusedIndex(lastIndex);
      personaRefs.current[lastIndex]?.focus();
    }
  }, []);

  const handleContinue = () => {
    if (selectedPersona) {
      onSelectPersona(selectedPersona);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Handle edge case of empty personas array
  if (!PERSONAS || PERSONAS.length === 0) {
    return (
      <div className="max-w-4xl mx-auto h-[95vh] flex flex-col justify-center">
        <div className="text-center mb-8">
          <H3 className="mb-3">
            Choose Your Starting Point
          </H3>
          <BodyBase color="danger" role="alert">
            No personas are currently available. Please try again later or start from scratch.
          </BodyBase>
        </div>
        <div className="flex justify-center">
          <Button
            variant="primary"
            onClick={onSkip}
            className="w-full sm:w-auto"
          >
            Start from Scratch
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto h-[95vh] flex flex-col">

      {/* Persona Carousel */}
      <section 
        role="group" 
        aria-labelledby="persona-selection-heading"
        className="mb-6"
      >
        <h3 id="persona-selection-heading" className="sr-only">
          Available financial profiles
        </h3>
        
        {/* Carousel Header */}
        <div className="mb-4 text-center">
          <H3 weight="bold" className="mb-2">Choose A Scenario</H3>
          <BodyBase color="secondary">Explore personas to see what's possible</BodyBase>
        </div>

        {/* Carousel Container */}
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto gap-6 pb-4 [&::-webkit-scrollbar]:hidden"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none'
          }}
        >
          {PERSONAS.map((persona, index) => (
            <div
              key={persona.id}
              className="relative group flex-shrink-0 w-80"
            >
              {/* Gradient border effect */}
              <div className={`
                absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-25
                group-hover:opacity-40 transition duration-300
                ${selectedPersona?.id === persona.id ? 'opacity-50' : ''}
              `}></div>

              {/* Card content */}
              <div
                ref={(el) => {
                  personaRefs.current[index] = el;
                }}
                role="button"
                tabIndex={0}
                aria-selected={selectedPersona?.id === persona.id}
                aria-label={`Select ${persona.title} profile: ${persona.description}`}
                aria-describedby={`persona-details-${persona.id}`}
                className={`
                  relative border rounded-lg p-4 cursor-pointer transition-all duration-200 h-full flex flex-col
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  ${selectedPersona?.id === persona.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                  }
                `}
                onClick={() => handlePersonaClick(persona)}
                onKeyDown={(e) => handlePersonaKeyDown(e, persona, index)}
              >
              {/* Header */}
              <header className="flex items-start space-x-3 mb-3">
                <div className="text-3xl" aria-hidden="true">{persona.emoji}</div>
                <div className="flex-1">
                  <H4>
                    {persona.title}
                  </H4>
                  <div className="flex items-center space-x-2 mt-1">
                    <Caption
                      weight="semibold"
                      className={`px-2 py-1 rounded ${
                        persona.complexity === 'beginner' ? 'bg-green-50 text-green-600' :
                        persona.complexity === 'intermediate' ? 'bg-yellow-50 text-yellow-600' :
                        'bg-red-50 text-red-600'
                      }`}
                    >
                      {persona.complexity}
                    </Caption>
                  </div>
                </div>
              </header>

              {/* Description */}
              <div id={`persona-details-${persona.id}`}>
                <BodyBase color="secondary" className="mb-3">
                  {persona.description}
                </BodyBase>

                {/* Key Numbers */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3" role="table" aria-label="Financial details">
                  <div className="grid grid-cols-2 gap-2" role="row">
                    <div role="cell">
                      <Caption color="tertiary" as="span">Age:</Caption>
                      <Mono weight="medium" className="ml-1">
                        {persona.demographics.age}
                      </Mono>
                    </div>
                    <div role="cell">
                      <Caption color="tertiary" as="span">Income:</Caption>
                      <Mono weight="medium" className="ml-1">
                        {formatCurrency(persona.demographics.income)}
                      </Mono>
                    </div>
                    <div role="cell">
                      <Caption color="tertiary" as="span">Expenses:</Caption>
                      <Mono weight="medium" className="ml-1">
                        {formatCurrency(persona.demographics.expenses)}
                      </Mono>
                    </div>
                    <div role="cell">
                      <Caption color="tertiary" as="span">FIRE Age:</Caption>
                      <Mono weight="medium" className="ml-1">
                        {persona.demographics.retirementAge}
                      </Mono>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2" role="list" aria-label="Profile tags">
                  {persona.tags.slice(0, 3).map((tag) => (
                    <Caption
                      key={tag}
                      role="listitem"
                      weight="medium"
                      className="px-2 py-1 bg-blue-50 text-blue-600 rounded"
                      as="span"
                    >
                      {tag}
                    </Caption>
                  ))}
                </div>
              </div>

              {/* Selection Indicator */}
              {selectedPersona?.id === persona.id && (
                <div className="mt-4 flex items-center justify-center" aria-live="polite">
                  <div className="flex items-center space-x-2 text-blue-600">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <BodyBase weight="medium" as="span">Selected</BodyBase>
                  </div>
                </div>
              )}
              </div>
            </div>
          ))}
        </div>

        {/* Carousel Navigation - Bottom */}
        <div className="flex justify-center space-x-2 mt-0.5">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`
              p-2 rounded-full transition-all duration-200
              ${canScrollLeft 
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }
            `}
            aria-label="Scroll left"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`
              p-2 rounded-full transition-all duration-200
              ${canScrollRight 
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }
            `}
            aria-label="Scroll right"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-gray-200 my-6"></div>

      {/* Selected Persona Details */}
      {selectedPersona && (
        <section
          className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-5 mb-6 flex-grow"
          aria-labelledby="selected-persona-title"
          role="region"
        >
          <div>
            <H4 id="selected-persona-title" align="center" className="mb-4">
              Exploring: {selectedPersona.title}
            </H4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Key Features Card */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <H5 className="mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Key Features
                </H5>
                <ul className="space-y-1" role="list">
                  {selectedPersona.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-400 mr-2">•</span>
                      <BodyBase color="secondary">{highlight}</BodyBase>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Financial Details Card */}
              {(() => {
                const eventSummary = getPersonaEventSummary(selectedPersona);
                const goals = selectedPersona.eventManifest.goals || [];
                return (
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <H5 className="mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      Financial Events
                    </H5>
                    <ul className="space-y-1 mb-4">
                      {eventSummary.map((event, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-400 mr-2">•</span>
                          <BodyBase color="secondary">{event}</BodyBase>
                        </li>
                      ))}
                    </ul>

                    {/* Goals */}
                    <Caption weight="medium" as="h5" className="mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                      </svg>
                      Goals
                    </Caption>
                    <ul className="space-y-1 mb-4">
                      {goals.map((goal, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-400 mr-2">•</span>
                          <BodyBase color="secondary">{goal.name}</BodyBase>
                        </li>
                      ))}
                    </ul>

                    {/* Account Types */}
                    <Caption weight="medium" as="h5" className="mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                      </svg>
                      Account Types
                    </Caption>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const accountTypes = selectedPersona.eventManifest.initialStates?.map(state => state.accountType) || [];
                        const uniqueAccountTypes = [...new Set(accountTypes)];
                        return uniqueAccountTypes.map((accountType, index) => (
                          <Caption
                            key={index}
                            className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full"
                            as="span"
                          >
                            {accountType}
                          </Caption>
                        ));
                      })()}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </section>
      )}

      {/* Action Buttons */}
      <nav className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4 pt-4 border-t border-gray-200">
        <Button
          variant="secondary"
          onClick={onSkip}
          className="w-full sm:w-auto"
          aria-describedby="skip-description"
        >
          Start from Scratch
        </Button>
        <div id="skip-description" className="sr-only">
          Skip persona selection and create a custom financial profile from scratch
        </div>
        
        <Button
          variant="primary"
          onClick={handleContinue}
          disabled={!selectedPersona}
          className="w-full sm:w-auto min-w-[200px]"
          aria-describedby={selectedPersona ? "continue-description" : "select-description"}
        >
          {selectedPersona 
            ? `Continue as ${selectedPersona.title}` 
            : 'Select a Profile to Continue'
          }
        </Button>
        <div id="continue-description" className="sr-only">
          {selectedPersona && `Continue with the ${selectedPersona.title} profile and customize it in the next steps`}
        </div>
        <div id="select-description" className="sr-only">
          Please select a persona profile above to continue
        </div>
      </nav>
    </div>
  );
};