/**
 * Estate & Gifting Events
 * 
 * This module contains events related to estate planning, gifting strategies,
 * and inheritance scenarios.
 */

import { BaseEvent, EventType } from './base';
import { AccountType } from '../common';

// =============================================================================
// ANNUAL GIFT EVENTS
// =============================================================================

export const ANNUAL_GIFT_EVENT_TYPE = EventType.ANNUAL_GIFT;

/**
 * Annual gift event for systematic gifting within annual exclusion limits
 */
export interface AnnualGiftEvent extends BaseEvent {
  type: typeof ANNUAL_GIFT_EVENT_TYPE;
  recipientName: string; // Name of gift recipient
  giftAmount: number; // Annual gift amount
  frequency?: 'monthly' | 'quarterly' | 'annually'; // Legacy property for backwards compatibility
  startDateOffset: number; // When gifting starts
  endDateOffset?: number; // When gifting ends (optional)
  annualGrowthRate?: number; // How much gift amounts increase annually
  
  // Gift details
  giftType: 'cash' | 'securities' | 'real_estate' | 'other';
  giftPurpose?: string; // Purpose of the gift
  
  // Tax considerations
  useAnnualExclusion?: boolean; // Whether to use annual exclusion (default: true)
  annualExclusionAmount?: number; // Annual exclusion amount for tax year
  
  // Relationship
  recipientRelationship: 'spouse' | 'child' | 'grandchild' | 'family' | 'friend' | 'charity' | 'other';
  
  // Asset transfer
  sourceAccountType?: AccountType; // Account to transfer from
  sourceAssetType?: string; // Specific asset being gifted
  
  // Estate planning
  reducesTaxableEstate?: boolean; // Whether gift reduces taxable estate
  qualifiesForGstExemption?: boolean; // Whether qualifies for GST exemption
}

export function isAnnualGiftEvent(event: { type: EventType }): event is AnnualGiftEvent {
  return event.type === ANNUAL_GIFT_EVENT_TYPE;
}

// =============================================================================
// LARGE GIFT EVENTS
// =============================================================================

export const LARGE_GIFT_EVENT_TYPE = EventType.LARGE_GIFT;

/**
 * Large gift event that consumes lifetime gift/estate tax exemption
 */
export interface LargeGiftEvent extends BaseEvent {
  type: typeof LARGE_GIFT_EVENT_TYPE;
  recipientName: string; // Name of gift recipient

  // Amount aliases for form compatibility
  giftAmount?: number; // Gift amount (legacy)

  // Gift details
  giftType?: 'cash' | 'securities' | 'real_estate' | 'business_interest' | 'private_equity' | 'collectibles' | 'life_insurance' | 'trust_assets' | 'family_limited_partnership' | 'other';
  giftPurpose?: string; // Purpose of the gift
  giftStrategy?: 'outright' | 'installment_sale' | 'grat' | 'clat' | 'crut' | 'crat' | 'qualified_personal_residence' | 'intentionally_defective_trust' | 'family_limited_partnership'; // Gifting strategy
  assetDescription?: string; // Detailed description of gifted asset

  // Tax implications
  taxable?: boolean; // Whether gift is taxable to recipient (typically false)
  exemptionAmountUsed?: number; // Amount of lifetime exemption consumed (legacy)
  lifetimeExemptionUsed?: number; // Amount of lifetime exemption used (preferred)
  giftTaxDue?: number; // Gift tax due on the transfer
  remainingExemption?: number; // Remaining federal lifetime gift/estate exemption
  gstTaxDue?: number; // Generation-skipping transfer tax
  splitGift?: boolean; // Split gift with spouse
  fileGiftTaxReturn?: boolean; // File Form 709

  // Relationship
  recipientRelationship?: 'spouse' | 'child' | 'grandchild' | 'family_member' | 'friend' | 'charity' | 'dynasty_trust' | 'charitable_trust' | 'other';

  // Asset transfer
  sourceAccountType?: AccountType; // Account to transfer from
  sourceAssetType?: string; // Specific asset being gifted
  costBasis?: number; // Your original cost in the asset

  // Valuation
  valuationMethod?: 'fair_market_value' | 'appraisal' | 'discount_valuation' | 'other';
  valuationDate?: string; // Date of valuation (legacy)
  appraisalDate?: string; // Date of professional appraisal (preferred)
  discountPercentage?: number; // Discount applied to valuation (legacy)
  valuationDiscount?: number; // Valuation discount percentage (preferred)
  appraiserName?: string; // Professional appraiser for non-cash assets
  appraisedValue?: number; // Professional appraised fair market value

  // Estate planning strategies
  qualifiesForGstExemption?: boolean; // Whether qualifies for GST exemption
  gstExemptionUsed?: number; // Amount of GST exemption consumed

  // Trust involvement
  transferredToTrust?: boolean; // Whether gift is to a trust
  trustName?: string; // Name of trust if applicable
  trustType?: 'revocable' | 'irrevocable' | 'charitable' | 'other';

  // Professional advisors
  advisors?: string; // Key professionals involved in gift planning
}

export function isLargeGiftEvent(event: { type: EventType }): event is LargeGiftEvent {
  return event.type === LARGE_GIFT_EVENT_TYPE;
}

// =============================================================================
// INHERITANCE EVENTS
// =============================================================================

export const INHERITANCE_EVENT_TYPE = EventType.INHERITANCE;

/**
 * Inheritance event for receiving assets from an estate
 */
export interface InheritanceEvent extends BaseEvent {
  type: typeof INHERITANCE_EVENT_TYPE;

  // Aliases for form compatibility
  decedentName?: string; // Name of deceased person (legacy)
  deceasedName?: string; // Name of deceased person (preferred)
  inheritanceAmount?: number; // Value of inheritance (legacy)
  relationshipToDecedent?: 'spouse' | 'child' | 'grandchild' | 'parent' | 'sibling' | 'other'; // Legacy
  deceasedRelationship?: 'spouse' | 'parent' | 'grandparent' | 'child' | 'sibling' | 'family_member' | 'friend' | 'trust' | 'charitable'; // Preferred

  // Asset type and details
  assetType?: 'cash' | 'securities' | 'retirement_accounts' | 'real_estate' | 'business_interest' | 'personal_property' | 'life_insurance' | 'trust_distribution' | 'collectibles' | 'other';
  assetDescription?: string; // Detailed description of inherited asset

  // Estate information
  totalEstateSize?: number; // Total size of deceased's estate
  inheritancePercentage?: number; // Your percentage of the total estate

  // Distribution details
  distributionType?: 'outright' | 'installments' | 'trust_income' | 'trust_principal' | 'life_estate' | 'remainder';
  sourceOfInheritance?: 'will' | 'trust' | 'beneficiary_designation' | 'joint_ownership' | 'other';

  // Tax implications
  taxable?: boolean; // Whether inheritance is taxable income
  receiveSteppedUpBasis?: boolean; // Whether assets receive stepped-up basis
  steppedUpBasis?: boolean | number; // Stepped-up basis at death (boolean or amount)
  originalBasis?: number; // Original basis of inherited assets
  subjectToEstateTax?: boolean; // Estate large enough for federal estate tax
  estateTaxPaid?: number; // Federal estate tax paid by estate
  estateTaxesPaid?: number; // Federal estate tax paid by estate (legacy alias)
  stateDeathTax?: number; // State inheritance or estate tax paid

  // Inherited retirement account specifics
  inheritedRetirementAccount?: boolean; // Whether inheriting retirement account
  deceasedAge?: number; // Age of deceased at death (affects RMD rules)
  spouseBeneficiary?: boolean; // Spouse beneficiary (rollover available)
  tenYearRule?: boolean; // 10-year distribution rule applies
  requiredDistribution?: number; // Required minimum distribution amount
  requiredMinimumDistributions?: boolean; // Whether subject to RMDs (legacy)
  stretchProvisions?: boolean; // Whether stretch provisions apply

  // Real estate specific
  propertyAddress?: string; // Address of inherited property
  deathDateValue?: number; // Property value at date of death
  planningSale?: boolean; // Planning to sell the property
  keepAsRental?: boolean; // Keep as rental property

  // Installment payments
  paymentFrequency?: string; // Frequency of installment payments
  numberOfPayments?: number; // Total number of installment payments
  paymentAmount?: number; // Amount of each installment payment

  // Estate administration
  dateOfDeath?: string; // Date of deceased's death
  executor?: string; // Person/entity administering the estate
  estateAttorney?: string; // Legal counsel handling estate
  administrationCosts?: number; // Estate administration costs
  specialInstructions?: string; // Special conditions or notes
  probateRequired?: boolean; // Whether probate is required

  // Asset destination
  targetAccountType?: AccountType; // Account to receive inheritance
  createNewAccount?: boolean; // Whether to create new account
}

export function isInheritanceEvent(event: { type: EventType }): event is InheritanceEvent {
  return event.type === INHERITANCE_EVENT_TYPE;
}

// =============================================================================
// COMPOSITE TYPE GUARDS
// =============================================================================

/**
 * Union type for all estate events
 */
export type EstateEvents = 
  | AnnualGiftEvent
  | LargeGiftEvent
  | InheritanceEvent;

/**
 * Type guard for any estate event
 */
export function isEstateEventType(event: { type: EventType }): event is EstateEvents {
  return isAnnualGiftEvent(event) || 
         isLargeGiftEvent(event) ||
         isInheritanceEvent(event);
}

/**
 * Type guard for gifting events
 */
export function isGiftingEvent(event: { type: EventType }): event is AnnualGiftEvent | LargeGiftEvent {
  return isAnnualGiftEvent(event) ||
         isLargeGiftEvent(event);
}

/**
 * Type guard for events that reduce net worth
 */
export function reducesNetWorth(event: { type: EventType }): event is AnnualGiftEvent | LargeGiftEvent {
  return isAnnualGiftEvent(event) ||
         isLargeGiftEvent(event);
}

/**
 * Type guard for events that increase net worth
 */
export function increasesNetWorth(event: { type: EventType }): event is InheritanceEvent {
  return isInheritanceEvent(event);
}

