import { EventType } from '../../../types';
import { EventMetadata } from '@/services/eventDiscoveryService';

export interface EventFormData {
    [key: string]: any;
}

/**
 * Validates form data for event creation
 * Returns array of error messages, empty array if valid
 *
 * PFOS-E principle: blocked outputs over incorrect outputs.
 * Missing required fields should fail validation, not silently default.
 */
export const validateEventForm = (
    formData: EventFormData,
    selectedEvent: EventMetadata | null
): string[] => {
    const errors: string[] = [];

    if (!selectedEvent) {
        return errors;
    }

    // Event-specific validation
    switch (selectedEvent.type) {
        // ========== INCOME EVENTS ==========
        case EventType.INCOME:
        case EventType.SOCIAL_SECURITY_INCOME:
        case EventType.PENSION_INCOME:
        case EventType.RENTAL_INCOME:
        case EventType.BUSINESS_INCOME:
        case EventType.DIVIDEND_INCOME:
        case EventType.ANNUITY_PAYMENT:
            if (!formData.amount || formData.amount <= 0) {
                errors.push('Income amount must be greater than 0');
            }
            break;

        // ========== EXPENSE EVENTS ==========
        case EventType.RECURRING_EXPENSE:
        case EventType.ONE_TIME_EVENT:
        case EventType.HEALTHCARE_COST:
        case EventType.TUITION_PAYMENT:
        case EventType.PROPERTY_MAINTENANCE:
        case EventType.HEALTHCARE_TRANSITION:
            if (!formData.amount || formData.amount <= 0) {
                errors.push('Expense amount must be greater than 0');
            }
            break;

        // ========== CONTRIBUTION EVENTS ==========
        case EventType.SCHEDULED_CONTRIBUTION:
        case EventType.ROTH_CONVERSION:
        case EventType.MEGA_BACKDOOR_ROTH:
            if (!formData.amount || formData.amount <= 0) {
                errors.push('Contribution amount must be greater than 0');
            }
            if (!formData.targetAccountType && !formData.accountType) {
                errors.push('Target account type is required');
            }
            break;

        // ========== WITHDRAWAL EVENTS ==========
        case EventType.WITHDRAWAL:
        case EventType.REQUIRED_MINIMUM_DISTRIBUTION:
        case EventType.QUALIFIED_CHARITABLE_DISTRIBUTION:
            if (!formData.amount || formData.amount <= 0) {
                errors.push('Withdrawal amount must be greater than 0');
            }
            if (!formData.sourceAccountType && !formData.accountType) {
                errors.push('Source account type is required');
            }
            break;

        // ========== TRANSFER EVENTS ==========
        case EventType.ACCOUNT_TRANSFER:
            if (!formData.amount || formData.amount <= 0) {
                errors.push('Transfer amount must be greater than 0');
            }
            if (!formData.sourceAccountType) {
                errors.push('Source account type is required');
            }
            if (!formData.targetAccountType) {
                errors.push('Target account type is required');
            }
            break;

        // ========== LIABILITY EVENTS ==========
        case EventType.LIABILITY_ADD:
            if (!formData.originalPrincipalAmount || formData.originalPrincipalAmount <= 0) {
                errors.push('Principal amount must be greater than 0');
            }
            if (formData.annualInterestRate === undefined || formData.annualInterestRate < 0) {
                errors.push('Interest rate must be non-negative');
            }
            if (!formData.loanTermMonths || formData.loanTermMonths <= 0) {
                errors.push('Loan term must be greater than 0');
            }
            break;

        case EventType.LIABILITY_PAYMENT:
        case EventType.DEBT_PAYMENT:
            if (!formData.amount || formData.amount <= 0) {
                errors.push('Payment amount must be greater than 0');
            }
            break;

        case EventType.HOME_EQUITY_LOAN:
            if (!formData.creditLimit || formData.creditLimit <= 0) {
                errors.push('Credit limit must be greater than 0');
            }
            if (formData.annualInterestRate === undefined || formData.annualInterestRate < 0) {
                errors.push('Interest rate must be non-negative');
            }
            break;

        // ========== REAL ESTATE EVENTS ==========
        case EventType.REAL_ESTATE_PURCHASE:
            if (!formData.homeValue || formData.homeValue <= 0) {
                errors.push('Home value must be greater than 0');
            }
            if (formData.downPayment === undefined || formData.downPayment < 0) {
                errors.push('Down payment must be non-negative');
            }
            break;

        case EventType.REAL_ESTATE_SALE:
            if (!formData.salePrice || formData.salePrice <= 0) {
                errors.push('Sale price must be greater than 0');
            }
            break;

        case EventType.REAL_ESTATE_APPRECIATION:
            if (formData.appreciationRate === undefined) {
                errors.push('Appreciation rate is required');
            }
            break;

        // ========== VEHICLE PURCHASE ==========
        case EventType.VEHICLE_PURCHASE:
            if (!formData.purchasePrice || formData.purchasePrice <= 0) {
                errors.push('Purchase price must be greater than 0');
            }
            break;

        // ========== HOME IMPROVEMENT ==========
        case EventType.HOME_IMPROVEMENT:
            if (!formData.amount || formData.amount <= 0) {
                errors.push('Improvement cost must be greater than 0');
            }
            break;

        // ========== EDUCATION ==========
        case EventType.FIVE_TWO_NINE_CONTRIBUTION:
            if (!formData.amount || formData.amount <= 0) {
                errors.push('Contribution amount must be greater than 0');
            }
            break;

        case EventType.FIVE_TWO_NINE_WITHDRAWAL:
            if (!formData.amount || formData.amount <= 0) {
                errors.push('Withdrawal amount must be greater than 0');
            }
            break;

        case EventType.EDUCATION_EXPENSE:
            if (!formData.amount || formData.amount <= 0) {
                errors.push('Education expense must be greater than 0');
            }
            break;

        // ========== INSURANCE EVENTS ==========
        case EventType.LIFE_INSURANCE_PREMIUM:
        case EventType.DISABILITY_INSURANCE_PREMIUM:
        case EventType.LONG_TERM_CARE_INSURANCE_PREMIUM:
            if (!formData.amount || formData.amount <= 0) {
                errors.push('Premium amount must be greater than 0');
            }
            break;

        case EventType.LIFE_INSURANCE_PAYOUT:
        case EventType.DISABILITY_INSURANCE_PAYOUT:
        case EventType.LONG_TERM_CARE_PAYOUT:
            if (!formData.amount || formData.amount <= 0) {
                errors.push('Payout amount must be greater than 0');
            }
            break;

        // ========== ESTATE EVENTS ==========
        case EventType.ANNUAL_GIFT:
        case EventType.LARGE_GIFT:
            if (!formData.amount || formData.amount <= 0) {
                errors.push('Gift amount must be greater than 0');
            }
            break;

        case EventType.INHERITANCE:
            if (!formData.amount || formData.amount <= 0) {
                errors.push('Inheritance amount must be greater than 0');
            }
            break;

        // ========== INVESTMENT STRATEGY EVENTS ==========
        case EventType.STRATEGY_ASSET_ALLOCATION_SET:
            // Allocation percentages should sum to 100, but form handles this
            break;

        case EventType.STRATEGIC_CAPITAL_GAINS_REALIZATION:
        case EventType.TAX_LOSS_HARVESTING_SALE:
            if (!formData.amount || formData.amount <= 0) {
                errors.push('Amount must be greater than 0');
            }
            break;

        // ========== RSU/EQUITY EVENTS ==========
        case EventType.RSU_VESTING:
            if (!formData.sharesVesting || formData.sharesVesting <= 0) {
                errors.push('Number of shares must be greater than 0');
            }
            break;

        case EventType.RSU_SALE:
            if (!formData.sharesToSell || formData.sharesToSell <= 0) {
                errors.push('Number of shares to sell must be greater than 0');
            }
            break;

        // ========== LIFECYCLE EVENTS ==========
        case EventType.RELOCATION:
            if (!formData.newState) {
                errors.push('New state is required');
            }
            break;

        case EventType.CAREER_CHANGE:
            // Career change may have optional salary change
            if (formData.newSalary !== undefined && formData.newSalary < 0) {
                errors.push('New salary cannot be negative');
            }
            break;

        case EventType.FAMILY_EVENT:
            // Family events are metadata-driven, minimal validation
            break;

        // ========== INITIAL STATE ==========
        case EventType.INITIAL_STATE:
            // Initial state has complex nested structure, validated elsewhere
            break;

        // ========== STRATEGY POLICY ==========
        case EventType.STRATEGY_POLICY:
            if (!formData.strategyType) {
                errors.push('Strategy type is required');
            }
            break;

        // ========== DEFAULT ==========
        default:
            // Generic amount validation for any event with an amount field
            if (formData.amount !== undefined && formData.amount <= 0) {
                errors.push('Amount must be greater than 0');
            }
    }

    // Universal date validation
    if (formData.monthOffset !== undefined && formData.monthOffset < 0) {
        errors.push('Event date cannot be in the past');
    }

    // Name validation (optional but recommended)
    if (formData.name !== undefined && typeof formData.name === 'string' && formData.name.trim() === '') {
        errors.push('Event name cannot be empty');
    }

    return errors;
};