import React, { useState, useEffect, Suspense, useMemo } from "react";
import { Modal } from "@/components/ui";
import { Button } from "@/components/ui";
import { useCommandBus } from "@/hooks/useCommandBus";
import { createCommand } from "@/commands/types";
import { FinancialEvent, EventType, AppConfig } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { handleError, showSuccess, showWarning } from "@/utils/notifications";
import { logger } from '@/utils/logger';
import { useStartDate } from "@/hooks/useDateSettings";
import { EVENT_REGISTRY, EventMetadata } from "@/services/eventDiscoveryService";
import { EventFormRenderer } from "@/components/modals/smart-event-creation/EventFormRenderer";

// Lazy load only the EventPreview (forms are handled by EventFormRenderer)
const EventPreview = React.lazy(() => import("./previews/EventPreview").then(m => ({ default: m.EventPreview })));

interface ModernEditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit: FinancialEvent | null;
  appConfig: AppConfig;
  // Commands handle state
  getMonthOffsetFromCalendarYear: (
    year: number,
    month: number,
    baseYear: number,
    baseMonth: number
  ) => number;
}

interface EventFormData {
  [key: string]: any;
}

// Categorization
import { getCategoryDisplayInfo, getEventTypeDisplayName, getEventTypeDescription } from "@/services/eventCategorization";

const getEventCategory = (eventType: EventType) => {
  return getCategoryDisplayInfo(eventType);
};

/**
 * Look up EventMetadata from the registry for a given event type.
 * This enables the edit modal to use the same EventFormRenderer as the creation modal.
 */
const getEventMetadata = (eventType: EventType): EventMetadata | null => {
  return EVENT_REGISTRY.find(e => e.type === eventType) || null;
};

export const ModernEditEventModal: React.FC<ModernEditEventModalProps> = ({
  isOpen,
  onClose,
  eventToEdit,
  appConfig,
  getMonthOffsetFromCalendarYear,
}) => {
  const [formData, setFormData] = useState<EventFormData>({});
  const [errors, setErrors] = useState<string[]>([]);
  const { dispatch } = useCommandBus();

  // Date settings
  const { startYear, startMonth } = useStartDate();

  useEffect(() => {
    if (isOpen && eventToEdit) {
      setFormData({ ...eventToEdit });
      setErrors([]);
    }
  }, [isOpen, eventToEdit && JSON.stringify(eventToEdit)]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Ctrl+Enter or Cmd+Enter to save
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, formData]);

  const category = eventToEdit ? getEventCategory(eventToEdit.type) : null;

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleDateChange = (field: string, year: string, month: string) => {
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (!isNaN(yearNum) && !isNaN(monthNum)) {
      const offset = getMonthOffsetFromCalendarYear(
        yearNum,
        monthNum,
        startYear,
        startMonth
      );
      handleFormChange(field, offset);
    }
  };

  const getFieldError = (fieldName: string): string | null => {
    // Field error lookup
    const fieldError = errors.find(error => 
      error.toLowerCase().includes(fieldName.toLowerCase())
    );
    return fieldError || null;
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    // Type validation
    if (eventToEdit) {
      switch (eventToEdit.type) {
        case EventType.INCOME:
        case EventType.SOCIAL_SECURITY_INCOME:
        case EventType.PENSION_INCOME:
        case EventType.RENTAL_INCOME:
        case EventType.BUSINESS_INCOME:
          if (!formData.amount || formData.amount <= 0) {
            newErrors.push("Income amount must be greater than 0");
          }
          break;
          
        case EventType.RECURRING_EXPENSE:
        case EventType.ONE_TIME_EVENT:
        case EventType.HEALTHCARE_COST:
          if (!formData.amount || formData.amount <= 0) {
            newErrors.push("Expense amount must be greater than 0");
          }
          break;
          
        case EventType.SCHEDULED_CONTRIBUTION:
        case EventType.ROTH_CONVERSION:
          if (!formData.amount || formData.amount <= 0) {
            newErrors.push("Contribution amount must be greater than 0");
          }
          if (!formData.targetAccountType && !formData.accountType) {
            newErrors.push("Target account type is required");
          }
          break;
          
        case EventType.WITHDRAWAL:
          if (!formData.amount || formData.amount <= 0) {
            newErrors.push("Withdrawal amount must be greater than 0");
          }
          if (!formData.sourceAccountType) {
            newErrors.push("Source account type is required");
          }
          break;
          
        case EventType.ACCOUNT_TRANSFER:
          if (!formData.amount || formData.amount <= 0) {
            newErrors.push("Transfer amount must be greater than 0");
          }
          if (!formData.sourceAccountType) {
            newErrors.push("Source account type is required");
          }
          if (!formData.targetAccountType) {
            newErrors.push("Target account type is required");
          }
          break;
          
        case EventType.LIABILITY_ADD:
        case EventType.LIABILITY_PAYMENT:
          if (!formData.originalPrincipalAmount || formData.originalPrincipalAmount <= 0) {
            newErrors.push("Principal amount must be greater than 0");
          }
          if (!formData.annualInterestRate || formData.annualInterestRate < 0) {
            newErrors.push("Interest rate must be non-negative");
          }
          break;
          
        case EventType.REAL_ESTATE_PURCHASE:
          if (!formData.homeValue || formData.homeValue <= 0) {
            newErrors.push("Home value must be greater than 0");
          }
          if (!formData.downPayment || formData.downPayment < 0) {
            newErrors.push("Down payment must be non-negative");
          }
          break;
          
        default:
          // Generic amounts
          if (formData.amount !== undefined && formData.amount <= 0) {
            newErrors.push("Amount must be greater than 0");
          }
      }
      
      // Date check
      if (formData.monthOffset !== undefined && formData.monthOffset < 0) {
        newErrors.push("Event date cannot be in the past");
      }
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showWarning(
        'Validation Error', 
        'Please fix the highlighted fields before saving.'
      );
      return;
    }
    
    try {
      await dispatch(
        createCommand.updateEvent(formData as FinancialEvent, true)
      );
      
      showSuccess(
        'Event Saved',
        `Successfully updated "${formData.name}".`
      );
      
      onClose();
    } catch (error) {
      logger.error("Failed to save event via command bus:", error);
      handleError(
        error,
        'Event Save',
        'Failed to save event. Please check your data and try again.'
      );
    }
  };

  const handleDelete = async () => {
    if (eventToEdit) {
      try {
        await dispatch(createCommand.deleteEvent(eventToEdit.id, true));
        
        showSuccess(
          'Event Deleted',
          `Successfully deleted "${eventToEdit.name}".`
        );
        
        onClose();
      } catch (error) {
        logger.error("Failed to delete event via command bus:", error);
        handleError(
          error,
          'Event Delete',
          'Failed to delete event. Please try again.'
        );
      }
    }
  };

  // Look up the EventMetadata for this event type to use with EventFormRenderer
  const eventMetadata = useMemo(() => {
    if (!eventToEdit) return null;
    return getEventMetadata(eventToEdit.type);
  }, [eventToEdit?.type]);

  const renderEventForm = () => {
    if (!eventToEdit) return null;

    // Use the shared EventFormRenderer for consistent form coverage
    // between create and edit modals
    return (
      <EventFormRenderer
        selectedEvent={eventMetadata}
        formData={formData}
        appConfig={appConfig}
        onFormChange={handleFormChange}
        onDateChange={handleDateChange}
      />
    );
  };

  const formatDateFromOffset = (offset?: number): string => {
    if (offset === undefined) return "";
    
    // Get date
    const result = getCalendarYearAndMonthFromMonthOffset(
      startYear,
      startMonth,
      offset,
      appConfig.currentAge
    );
    
    // JS Date format
    const date = new Date(result.year, result.monthInYear - 1);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  };

  if (!eventToEdit || !category) return null;

  const headerBgClass =
    {
      info: "bg-info",
      warning: "bg-warning",
      success: "bg-success",
      purple: "bg-purple-600",
      orange: "bg-orange-600",
      blue: "bg-blue-600",
      gray: "bg-areum-text-secondary",
    }[category.color] || "bg-areum-text-secondary";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      hideCloseButton={true}
      bodyClassName="!p-0"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {eventToEdit.type !== EventType.INITIAL_STATE ? (
              <Button variant="danger" onClick={handleDelete}>
                Delete Event
              </Button>
            ) : (
              <div className="text-sm-areum text-areum-text-tertiary italic">
                Initial state cannot be deleted
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel <span className="ml-1 text-xs-areum text-areum-text-tertiary">(Esc)</span>
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save Changes <span className="ml-1 text-xs-areum text-white">⌘↵</span>
            </Button>
          </div>
        </div>
      }
    >
      <div>
        <div className={`${headerBgClass} text-white px-4 py-3`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <h2 className="text-base font-bold">
                  {category.emoji} {getEventTypeDisplayName(eventToEdit.type)}
                </h2>
                {eventToEdit.type === EventType.INITIAL_STATE && formData.initialCash !== undefined && (
                  <span className="text-white/80 text-sm font-mono">
                    {(() => {
                      const accounts = (formData as any).initialAccounts || {};
                      const cash = (formData as any).initialCash || 0;

                      const getTotalValue = (account: any): number => {
                        if (typeof account === 'number') return account;
                        if (account?.totalValue) return account.totalValue;
                        return 0;
                      };

                      const taxable = getTotalValue(accounts.taxable);
                      const taxDeferred = getTotalValue(accounts.tax_deferred);
                      const roth = getTotalValue(accounts.roth);
                      const totalNetWorth = cash + taxable + taxDeferred + roth;

                      return `$${totalNetWorth.toLocaleString()}`;
                    })()}
                  </span>
                )}
              </div>
              <p className="text-white/80 text-xs mt-0.5">
                {getEventTypeDescription(eventToEdit.type)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white text-xl flex-shrink-0 ml-3"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
        </div>
        <div className="px-4 pb-3 pt-2">
          {errors.length > 0 && (
            <div className="bg-danger-light border border-danger rounded-lg p-2 mb-3">
              <ul className="text-danger text-xs list-disc list-inside space-y-0.5">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">{renderEventForm()}</div>
            <div className="space-y-3">
              <Suspense fallback={<div className="flex items-center justify-center p-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-xs">Loading...</span>
              </div>}>
                <EventPreview
                  eventType={eventToEdit.type}
                  formData={formData}
                  categoryEmoji={category.emoji}
                  categoryColor={category.color}
                  formatDateFromOffset={formatDateFromOffset}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
