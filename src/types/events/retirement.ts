/**
 * Retirement Events - Withdrawals and Account Transfers
 * 
 * This module defines event types related to retirement and account management,
 * including withdrawals from investment accounts and transfers between accounts.
 */

import { BaseEvent, EventType, EventPriority } from './base';
import { AccountType } from '../common';

// =============================================================================
// WITHDRAWAL EVENT - For retirement and account withdrawals
// =============================================================================

/**
 * WithdrawalEvent: Represents withdrawals from investment accounts
 * 
 * Supports various withdrawal strategies for retirement planning:
 * - Fixed dollar amounts
 * - Percentage-based withdrawals
 * - Required minimum distributions
 * - Emergency withdrawals
 * 
 * Includes proper tax implications and penalty calculations.
 */
export interface WithdrawalEvent extends BaseEvent {
  type: EventType.WITHDRAWAL;

  /** Amount to withdraw - can be fixed amount or calculated based on strategy */
  amount: number;

  /** Source account for withdrawal */
  sourceAccountType: AccountType;

  /** Withdrawal strategy type */
  withdrawalStrategy?: 'fixed_amount' | 'percentage' | 'inflation_adjusted' | 'safe_withdrawal_rate';

  /** For percentage-based withdrawals, the percentage of account balance */
  withdrawalPercentage?: number;

  /** Annual growth rate for inflation-adjusted withdrawals */
  annualGrowthRate?: number;

  /** Whether this is for emergency purposes (affects penalty calculations) */
  isEmergencyWithdrawal?: boolean;

  /** Whether withdrawal should be net of taxes */
  isNetOfTaxes?: boolean;

  /** Specific tax withholding percentage (if different from standard) */
  taxWithholdingPercentage?: number;

  /** Tax withholding rate (alias for taxWithholdingPercentage) */
  taxWithholdingRate?: number;

  /** End date for recurring withdrawals */
  endDateOffset?: number;

  /** Frequency for recurring withdrawals */
  frequency?: 'monthly' | 'quarterly' | 'annually' | 'one_time';

  /** Purpose of withdrawal for tracking and reporting */
  purpose?: string;

  /** Purpose of withdrawal (alias for purpose) */
  withdrawalPurpose?: string;

  /** Whether to avoid penalties by using available contribution basis first */
  useContributionBasisFirst?: boolean;
}

/**
 * Type guard for WithdrawalEvent
 */
export function isWithdrawalEvent(event: any): event is WithdrawalEvent {
  return event?.type === EventType.WITHDRAWAL;
}

// =============================================================================
// ACCOUNT TRANSFER EVENT - For moving money between accounts
// =============================================================================

/**
 * AccountTransferEvent: Represents transfers between investment accounts
 * 
 * Supports various transfer scenarios:
 * - Rollover from 401(k) to IRA
 * - Transfer between brokerages
 * - Rebalancing between account types
 * - Asset location optimization
 * 
 * Handles tax implications and transfer restrictions properly.
 */
export interface AccountTransferEvent extends BaseEvent {
  type: EventType.ACCOUNT_TRANSFER;
  
  /** Amount to transfer */
  amount: number;
  
  /** Source account type */
  sourceAccountType: AccountType;
  
  /** Target account type */
  targetAccountType: AccountType;
  
  /** Transfer type affects tax treatment */
  transferType: 'direct_rollover' | 'indirect_rollover' | 'trustee_to_trustee' | 'in_kind_transfer' | 'cash_transfer';
  
  /** Whether this is a taxable event */
  isTaxableEvent?: boolean;
  
  /** Transfer fees or penalties */
  transferFees?: number;
  
  /** Whether to liquidate investments before transfer */
  liquidateBeforeTransfer?: boolean;
  
  /** For partial transfers, the percentage of account to transfer */
  transferPercentage?: number;
  
  /** Whether transfer is due to job change */
  isDueToJobChange?: boolean;
  
  /** Waiting period before funds are available (in days) */
  waitingPeriodDays?: number;
  
  /** Purpose of transfer for tracking */
  transferPurpose?: 'rollover' | 'optimization' | 'consolidation' | 'rebalancing' | 'other';
  
  /** Notes about transfer restrictions or special considerations */
  transferNotes?: string;
}

/**
 * Type guard for AccountTransferEvent
 */
export function isAccountTransferEvent(event: any): event is AccountTransferEvent {
  return event?.type === EventType.ACCOUNT_TRANSFER;
}

// =============================================================================
// SHARED UTILITIES
// =============================================================================

/**
 * Check if an event involves retirement account access
 */
export function isRetirementAccountEvent(event: WithdrawalEvent | AccountTransferEvent): boolean {
  const retirementAccountTypes: AccountType[] = ['tax_deferred', 'roth'];
  
  if ('sourceAccountType' in event) {
    return retirementAccountTypes.includes(event.sourceAccountType);
  }
  
  return false;
}

/**
 * Check if withdrawal may incur early withdrawal penalties
 */
export function mayIncurEarlyWithdrawalPenalty(event: WithdrawalEvent, currentAge: number): boolean {
  const retirementAccountTypes: AccountType[] = ['tax_deferred', 'roth'];
  
  return (
    retirementAccountTypes.includes(event.sourceAccountType) &&
    currentAge < 59.5 &&
    !event.isEmergencyWithdrawal &&
    !event.useContributionBasisFirst
  );
}