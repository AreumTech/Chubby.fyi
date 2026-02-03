import React, { Suspense } from 'react';
import { EventType, AppConfig } from '../../../types';
import { EventMetadata } from '@/services/eventDiscoveryService';
import { EventFormData } from './eventValidationUtils';

// Form imports - keeping them here as they're specific to this renderer
const IncomeEventForm = React.lazy(() => import('@/features/event-timeline/components/forms/IncomeEventForm').then(m => ({ default: m.IncomeEventForm })));
const ExpenseEventForm = React.lazy(() => import('@/features/event-timeline/components/forms/ExpenseEventForm').then(m => ({ default: m.ExpenseEventForm })));
const SocialSecurityForm = React.lazy(() => import('@/features/event-timeline/components/forms/SocialSecurityForm').then(m => ({ default: m.SocialSecurityForm })));
const PensionForm = React.lazy(() => import('@/features/event-timeline/components/forms/PensionForm').then(m => ({ default: m.PensionForm })));
const ContributionForm = React.lazy(() => import('@/features/event-timeline/components/forms/ContributionForm').then(m => ({ default: m.ContributionForm })));
const HomeImprovementForm = React.lazy(() => import('@/features/event-timeline/components/forms/HomeImprovementForm').then(m => ({ default: m.HomeImprovementForm })));
const EducationExpenseForm = React.lazy(() => import('@/features/event-timeline/components/forms/EducationExpenseForm').then(m => ({ default: m.EducationExpenseForm })));
const FamilyEventForm = React.lazy(() => import('@/features/event-timeline/components/forms/FamilyEventForm').then(m => ({ default: m.FamilyEventForm })));
const RothConversionForm = React.lazy(() => import('@/features/event-timeline/components/forms/RothConversionForm').then(m => ({ default: m.RothConversionForm })));
const WithdrawalEventForm = React.lazy(() => import('@/features/event-timeline/components/forms/WithdrawalEventForm').then(m => ({ default: m.WithdrawalEventForm })));
const AccountTransferForm = React.lazy(() => import('@/features/event-timeline/components/forms/AccountTransferForm').then(m => ({ default: m.AccountTransferForm })));
const QcdForm = React.lazy(() => import('@/features/event-timeline/components/forms/QcdForm').then(m => ({ default: m.QcdForm })));
const RequiredMinimumDistributionForm = React.lazy(() => import('@/features/event-timeline/components/forms/RequiredMinimumDistributionForm').then(m => ({ default: m.RequiredMinimumDistributionForm })));
const CapitalGainsRealizationForm = React.lazy(() => import('@/features/event-timeline/components/forms/CapitalGainsRealizationForm').then(m => ({ default: m.CapitalGainsRealizationForm })));
const RelocationForm = React.lazy(() => import('@/features/event-timeline/components/forms/RelocationForm').then(m => ({ default: m.RelocationForm })));
const BusinessIncomeForm = React.lazy(() => import('@/features/event-timeline/components/forms/BusinessIncomeForm').then(m => ({ default: m.BusinessIncomeForm })));
const RentalIncomeForm = React.lazy(() => import('@/features/event-timeline/components/forms/RentalIncomeForm').then(m => ({ default: m.RentalIncomeForm })));
const DividendIncomeForm = React.lazy(() => import('@/features/event-timeline/components/forms/DividendIncomeForm').then(m => ({ default: m.DividendIncomeForm })));
const AnnuityForm = React.lazy(() => import('@/features/event-timeline/components/forms/AnnuityForm').then(m => ({ default: m.AnnuityForm })));
const AssetAllocationForm = React.lazy(() => import('@/features/event-timeline/components/forms/AssetAllocationForm').then(m => ({ default: m.AssetAllocationForm })));
const VehiclePurchaseForm = React.lazy(() => import('@/features/event-timeline/components/forms/VehiclePurchaseForm').then(m => ({ default: m.VehiclePurchaseForm })));
const RealEstatePurchaseForm = React.lazy(() => import('@/features/event-timeline/components/forms/RealEstatePurchaseForm').then(m => ({ default: m.RealEstatePurchaseForm })));
const AutomaticRebalancingForm = React.lazy(() => import('@/features/event-timeline/components/forms/dynamic/AutomaticRebalancingForm').then(m => ({ default: m.AutomaticRebalancingForm })));
const TaxLossHarvestingForm = React.lazy(() => import('@/features/event-timeline/components/forms/dynamic/TaxLossHarvestingForm').then(m => ({ default: m.TaxLossHarvestingForm })));
const RsuVestingForm = React.lazy(() => import('@/features/event-timeline/components/forms/RsuVestingForm').then(m => ({ default: m.RsuVestingForm })));
const RsuSaleForm = React.lazy(() => import('@/features/event-timeline/components/forms/RsuSaleForm').then(m => ({ default: m.RsuSaleForm })));
const StrategicTradeForm = React.lazy(() => import('@/features/event-timeline/components/forms/StrategicTradeForm').then(m => ({ default: m.StrategicTradeForm })));
const GoalDefineForm = React.lazy(() => import('@/features/event-timeline/components/forms/GoalDefineForm').then(m => ({ default: m.GoalDefineForm })));
const ConcentrationRiskAlertForm = React.lazy(() => import('@/features/event-timeline/components/forms/ConcentrationRiskAlertForm').then(m => ({ default: m.ConcentrationRiskAlertForm })));
const FinancialMilestoneForm = React.lazy(() => import('@/features/event-timeline/components/forms/FinancialMilestoneForm').then(m => ({ default: m.FinancialMilestoneForm })));
const CareerChangeForm = React.lazy(() => import('@/features/event-timeline/components/forms/CareerChangeForm').then(m => ({ default: m.CareerChangeForm })));
const StrategyPolicyForm = React.lazy(() => import('@/features/event-timeline/components/forms/StrategyPolicyForm').then(m => ({ default: m.StrategyPolicyForm })));

// Disconnected forms
const HealthcareForm = React.lazy(() => import('@/features/event-timeline/components/forms/HealthcareForm').then(m => ({ default: m.HealthcareForm })));
const LiabilityForm = React.lazy(() => import('@/features/event-timeline/components/forms/LiabilityForm').then(m => ({ default: m.LiabilityForm })));
const LiabilityPaymentForm = React.lazy(() => import('@/features/event-timeline/components/forms/LiabilityPaymentForm').then(m => ({ default: m.LiabilityPaymentForm })));
const DebtPaymentForm = React.lazy(() => import('@/features/event-timeline/components/forms/DebtPaymentForm').then(m => ({ default: m.DebtPaymentForm })));
const MegaBackdoorRothForm = React.lazy(() => import('@/features/event-timeline/components/forms/MegaBackdoorRothForm').then(m => ({ default: m.MegaBackdoorRothForm })));
const HomeEquityLoanForm = React.lazy(() => import('@/features/event-timeline/components/forms/HomeEquityLoanForm').then(m => ({ default: m.HomeEquityLoanForm })));
const InitialStateForm = React.lazy(() => import('@/features/event-timeline/components/forms/InitialStateForm').then(m => ({ default: m.InitialStateForm })));
const LeveragedInvestmentForm = React.lazy(() => import('@/features/event-timeline/components/forms/LeveragedInvestmentForm').then(m => ({ default: m.LeveragedInvestmentForm })));
const BridgeStrategyForm = React.lazy(() => import('@/features/event-timeline/components/forms/BridgeStrategyForm').then(m => ({ default: m.BridgeStrategyForm })));
const MortgagePayoffForm = React.lazy(() => import('@/features/event-timeline/components/forms/MortgagePayoffForm').then(m => ({ default: m.MortgagePayoffForm })));
const RealEstateAppreciationForm = React.lazy(() => import('@/features/event-timeline/components/forms/RealEstateAppreciationForm').then(m => ({ default: m.RealEstateAppreciationForm })));
const PropertyMaintenanceForm = React.lazy(() => import('@/features/event-timeline/components/forms/PropertyMaintenanceForm').then(m => ({ default: m.PropertyMaintenanceForm })));
const HealthcareTransitionForm = React.lazy(() => import('@/features/event-timeline/components/forms/HealthcareTransitionForm').then(m => ({ default: m.HealthcareTransitionForm })));

// Dynamic forms
const ConditionalContributionForm = React.lazy(() => import('@/features/event-timeline/components/forms/dynamic/ConditionalContributionForm').then(m => ({ default: m.ConditionalContributionForm })));
const WaterfallAllocationForm = React.lazy(() => import('@/features/event-timeline/components/forms/dynamic/WaterfallAllocationForm').then(m => ({ default: m.WaterfallAllocationForm })));
const PercentageContributionForm = React.lazy(() => import('@/features/event-timeline/components/forms/dynamic/PercentageContributionForm').then(m => ({ default: m.PercentageContributionForm })));
const SmartDebtPaymentForm = React.lazy(() => import('@/features/event-timeline/components/forms/dynamic/SmartDebtPaymentForm').then(m => ({ default: m.SmartDebtPaymentForm })));
const GoalDrivenContributionForm = React.lazy(() => import('@/features/event-timeline/components/forms/dynamic/GoalDrivenContributionForm').then(m => ({ default: m.GoalDrivenContributionForm })));
const EmergencyFundMaintenanceForm = React.lazy(() => import('@/features/event-timeline/components/forms/dynamic/EmergencyFundMaintenanceForm').then(m => ({ default: m.EmergencyFundMaintenanceForm })));
const IncomeResponsiveSavingsForm = React.lazy(() => import('@/features/event-timeline/components/forms/dynamic/IncomeResponsiveSavingsForm').then(m => ({ default: m.IncomeResponsiveSavingsForm })));
const LifecycleAdjustmentForm = React.lazy(() => import('@/features/event-timeline/components/forms/dynamic/LifecycleAdjustmentForm').then(m => ({ default: m.LifecycleAdjustmentForm })));

// Insurance
const LifeInsurancePremiumForm = React.lazy(() => import('@/features/event-timeline/components/forms/LifeInsurancePremiumForm').then(m => ({ default: m.LifeInsurancePremiumForm })));
const LifeInsurancePayoutForm = React.lazy(() => import('@/features/event-timeline/components/forms/LifeInsurancePayoutForm').then(m => ({ default: m.LifeInsurancePayoutForm })));
const DisabilityInsurancePremiumForm = React.lazy(() => import('@/features/event-timeline/components/forms/DisabilityInsurancePremiumForm').then(m => ({ default: m.DisabilityInsurancePremiumForm })));
const DisabilityInsurancePayoutForm = React.lazy(() => import('@/features/event-timeline/components/forms/DisabilityInsurancePayoutForm').then(m => ({ default: m.DisabilityInsurancePayoutForm })));
const LongTermCareInsurancePremiumForm = React.lazy(() => import('@/features/event-timeline/components/forms/LongTermCareInsurancePremiumForm').then(m => ({ default: m.LongTermCareInsurancePremiumForm })));
const LongTermCarePayoutForm = React.lazy(() => import('@/features/event-timeline/components/forms/LongTermCarePayoutForm').then(m => ({ default: m.LongTermCarePayoutForm })));

// Education
const FiveTwoNineContributionForm = React.lazy(() => import('@/features/event-timeline/components/forms/FiveTwoNineContributionForm').then(m => ({ default: m.FiveTwoNineContributionForm })));
const FiveTwoNineWithdrawalForm = React.lazy(() => import('@/features/event-timeline/components/forms/FiveTwoNineWithdrawalForm').then(m => ({ default: m.FiveTwoNineWithdrawalForm })));
const TuitionPaymentForm = React.lazy(() => import('@/features/event-timeline/components/forms/TuitionPaymentForm').then(m => ({ default: m.TuitionPaymentForm })));

// Estate
const AnnualGiftForm = React.lazy(() => import('@/features/event-timeline/components/forms/AnnualGiftForm').then(m => ({ default: m.AnnualGiftForm })));
const LargeGiftForm = React.lazy(() => import('@/features/event-timeline/components/forms/LargeGiftForm').then(m => ({ default: m.LargeGiftForm })));
const InheritanceForm = React.lazy(() => import('@/features/event-timeline/components/forms/InheritanceForm').then(m => ({ default: m.InheritanceForm })));

// Real Estate
const RealEstateSaleForm = React.lazy(() => import('@/features/event-timeline/components/forms/RealEstateSaleForm').then(m => ({ default: m.RealEstateSaleForm })));

export interface EventFormRendererProps {
    selectedEvent: EventMetadata | null;
    formData: EventFormData;
    appConfig: AppConfig;
    onFormChange: (field: string, value: any) => void;
    onDateChange: (field: string, year: string, month: string) => void;
}

/**
 * Renders the appropriate form component based on the selected event type
 * Handles the massive switch statement for all supported event forms
 */
export const EventFormRenderer: React.FC<EventFormRendererProps> = ({
    selectedEvent,
    formData,
    appConfig,
    onFormChange,
    onDateChange
}) => {
    if (!selectedEvent) return null;

    const LoadingSpinner = () => (
        <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
    );

    // Common props for all forms
    const commonProps = {
        formData,
        onChange: onFormChange,
        onDateChange,
        baseYear: appConfig.simulationStartYear,
        baseMonth: appConfig.currentMonth,
        currentAge: appConfig.currentAge,
    };

    return (
        <Suspense fallback={<LoadingSpinner />}>
            {(() => {
                switch (selectedEvent.type) {
                    case EventType.INCOME:
                        return <IncomeEventForm {...commonProps} />;

                    case EventType.RECURRING_EXPENSE:
                        return (
                            <ExpenseEventForm
                                {...commonProps}
                                isRecurring={true}
                            />
                        );

                    case EventType.SCHEDULED_CONTRIBUTION:
                        return <ContributionForm {...commonProps} />;

                    case EventType.HOME_IMPROVEMENT:
                        return (
                            <HomeImprovementForm
                                initialData={formData}
                                onSave={(data: any) => {
                                    Object.keys(data).forEach(key => {
                                        onFormChange(key, (data as any)[key]);
                                    });
                                }}
                                onCancel={() => {}}
                                monthOffsetCalculator={onDateChange}
                            />
                        );

                    case EventType.EDUCATION_EXPENSE:
                        return (
                            <EducationExpenseForm
                                initialData={formData}
                                onSave={(data: any) => {
                                    Object.keys(data).forEach(key => {
                                        onFormChange(key, (data as any)[key]);
                                    });
                                }}
                                onCancel={() => {}}
                                monthOffsetCalculator={onDateChange}
                            />
                        );

                    case EventType.SOCIAL_SECURITY_INCOME:
                        return <SocialSecurityForm {...commonProps} />;

                    case EventType.PENSION_INCOME:
                        return <PensionForm {...commonProps} />;

                    case EventType.ROTH_CONVERSION:
                        return <RothConversionForm {...commonProps} />;

                    case EventType.WITHDRAWAL:
                        return <WithdrawalEventForm {...commonProps} />;

                    case EventType.ACCOUNT_TRANSFER:
                        return <AccountTransferForm {...commonProps} />;

                    case EventType.QUALIFIED_CHARITABLE_DISTRIBUTION:
                        return <QcdForm {...commonProps} />;

                    case EventType.REQUIRED_MINIMUM_DISTRIBUTION:
                        return <RequiredMinimumDistributionForm {...commonProps} />;

                    case EventType.STRATEGIC_CAPITAL_GAINS_REALIZATION:
                        return <CapitalGainsRealizationForm {...commonProps} />;

                    case EventType.RELOCATION:
                        return <RelocationForm {...commonProps} />;

                    case EventType.BUSINESS_INCOME:
                        return <BusinessIncomeForm {...commonProps} />;

                    case EventType.RENTAL_INCOME:
                        return <RentalIncomeForm {...commonProps} />;

                    case EventType.DIVIDEND_INCOME:
                        return <DividendIncomeForm {...commonProps} />;

                    case EventType.ANNUITY_PAYMENT:
                        return <AnnuityForm {...commonProps} />;

                    case EventType.STRATEGY_ASSET_ALLOCATION_SET:
                        return <AssetAllocationForm {...commonProps} />;

                    case EventType.REBALANCE_PORTFOLIO:
                        return <AutomaticRebalancingForm {...commonProps} />;

                    case EventType.TAX_LOSS_HARVESTING_SALE:
                        return <TaxLossHarvestingForm {...commonProps} />;

                    case EventType.VEHICLE_PURCHASE:
                        return <VehiclePurchaseForm {...commonProps} />;

                    case EventType.REAL_ESTATE_PURCHASE:
                        return <RealEstatePurchaseForm {...commonProps} />;

                    case EventType.RSU_VESTING:
                        return <RsuVestingForm {...commonProps} />;

                    case EventType.RSU_SALE:
                        return <RsuSaleForm {...commonProps} />;

                    case EventType.STRATEGIC_TRADE:
                        return <StrategicTradeForm {...commonProps} />;

                    case EventType.GOAL_DEFINE:
                        return <GoalDefineForm {...commonProps} />;

                    case EventType.CONCENTRATION_RISK_ALERT:
                        return <ConcentrationRiskAlertForm {...commonProps} />;

                    case EventType.FINANCIAL_MILESTONE:
                        return <FinancialMilestoneForm {...commonProps} />;

                    case EventType.CAREER_CHANGE:
                        return <CareerChangeForm {...commonProps} />;

                    case EventType.FAMILY_EVENT:
                        return <FamilyEventForm {...commonProps} />;

                    // Basic events
                    case EventType.HEALTHCARE_COST:
                        return <HealthcareForm {...commonProps} />;

                    case EventType.LIABILITY_ADD:
                        return <LiabilityForm {...commonProps} />;

                    case EventType.LIABILITY_PAYMENT:
                        return <LiabilityPaymentForm {...commonProps} />;

                    case EventType.DEBT_PAYMENT:
                        return <DebtPaymentForm {...commonProps} />;

                    case EventType.INITIAL_STATE:
                        return <InitialStateForm {...commonProps} />;

                    // Advanced
                    case EventType.MEGA_BACKDOOR_ROTH:
                        return <MegaBackdoorRothForm {...commonProps} />;

                    case EventType.HOME_EQUITY_LOAN:
                        return <HomeEquityLoanForm {...commonProps} />;

                    case EventType.LEVERAGED_INVESTMENT:
                        return <LeveragedInvestmentForm {...commonProps} />;

                    case EventType.BRIDGE_STRATEGY:
                        return <BridgeStrategyForm {...commonProps} />;

                    case EventType.MORTGAGE_PAYOFF:
                        return <MortgagePayoffForm {...commonProps} />;

                    case EventType.REAL_ESTATE_APPRECIATION:
                        return <RealEstateAppreciationForm {...commonProps} />;

                    case EventType.PROPERTY_MAINTENANCE:
                        return <PropertyMaintenanceForm {...commonProps} />;

                    case EventType.HEALTHCARE_TRANSITION:
                        return <HealthcareTransitionForm {...commonProps} />;

                    // Insurance
                    case EventType.LIFE_INSURANCE_PREMIUM:
                        return <LifeInsurancePremiumForm {...commonProps} />;

                    case EventType.LIFE_INSURANCE_PAYOUT:
                        return <LifeInsurancePayoutForm {...commonProps} />;

                    case EventType.DISABILITY_INSURANCE_PREMIUM:
                        return <DisabilityInsurancePremiumForm {...commonProps} />;

                    case EventType.DISABILITY_INSURANCE_PAYOUT:
                        return <DisabilityInsurancePayoutForm {...commonProps} />;

                    case EventType.LONG_TERM_CARE_INSURANCE_PREMIUM:
                        return <LongTermCareInsurancePremiumForm {...commonProps} />;

                    case EventType.LONG_TERM_CARE_PAYOUT:
                        return <LongTermCarePayoutForm {...commonProps} />;

                    // Education
                    case EventType.FIVE_TWO_NINE_CONTRIBUTION:
                        return <FiveTwoNineContributionForm {...commonProps} />;

                    case EventType.FIVE_TWO_NINE_WITHDRAWAL:
                        return <FiveTwoNineWithdrawalForm {...commonProps} />;

                    case EventType.TUITION_PAYMENT:
                        return <TuitionPaymentForm {...commonProps} />;

                    // Estate
                    case EventType.ANNUAL_GIFT:
                        return <AnnualGiftForm {...commonProps} />;

                    case EventType.LARGE_GIFT:
                        return <LargeGiftForm {...commonProps} />;

                    case EventType.INHERITANCE:
                        return <InheritanceForm {...commonProps} />;

                    // Real Estate
                    case EventType.REAL_ESTATE_SALE:
                        return <RealEstateSaleForm {...commonProps} />;

                    // Strategy Policy
                    case EventType.STRATEGY_POLICY:
                        return <StrategyPolicyForm {...commonProps} />;

                    default:
                        return (
                            <div className="p-6 bg-yellow-50 rounded-lg">
                                <h3 className="font-semibold text-yellow-900 mb-2">
                                    Form Coming Soon
                                </h3>
                                <p className="text-yellow-700 text-sm">
                                    The form for {selectedEvent.label} is under development.
                                </p>
                                {selectedEvent.examples && (
                                    <div className="mt-4">
                                        <p className="text-yellow-700 text-sm font-medium">Examples:</p>
                                        <ul className="mt-1 text-yellow-600 text-sm">
                                            {selectedEvent.examples.map((ex, idx) => (
                                                <li key={idx}>• {ex}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        );
                }
            })()}
        </Suspense>
    );
};