import React from 'react';
import { EventType } from '@/types';

interface EventPreviewProps {
    eventType: EventType;
    formData: any;
    categoryEmoji: string;
    categoryColor: string;
    formatDateFromOffset: (offset?: number) => string;
}

export const EventPreview: React.FC<EventPreviewProps> = ({
    eventType,
    formData,
    categoryEmoji,
    categoryColor,
    formatDateFromOffset
}) => {
    const getPreviewTitle = () => {
        switch (eventType) {
            case EventType.INITIAL_STATE:
                return 'Starting Position';
            case EventType.INCOME:
                return formData.name && formData.company
                    ? `${formData.name} at ${formData.company}`
                    : formData.name || formData.company || 'New Job';
            case EventType.RECURRING_EXPENSE:
            case EventType.ONE_TIME_EVENT:
                return formData.name || 'New Expense';
            default:
                return 'New Event';
        }
    };

    const getPreviewSubtext = () => {
        switch (eventType) {
            case EventType.INITIAL_STATE:
                const getTotalValue = (account: any): number => {
                    if (typeof account === 'number') return account;
                    if (account?.totalValue) return account.totalValue;
                    return 0;
                };
                const accounts = formData.initialAccounts || {};
                const cash = formData.initialCash || 0;
                const total = cash + getTotalValue(accounts.taxable) + getTotalValue(accounts.tax_deferred) + getTotalValue(accounts.roth);
                return `Net Worth: $${total.toLocaleString()}`;
            case EventType.INCOME:
                const totalComp = (formData.amount || 0) + (formData.bonus || 0) + (formData.rsuValue || 0);
                // Income is always annual
                return `Total Comp: $${totalComp.toLocaleString()}/year`;
            case EventType.RECURRING_EXPENSE:
                return `$${(formData.amount || 0).toLocaleString()}/${formData.frequency || 'month'}`;
            case EventType.ONE_TIME_EVENT:
                return `$${(formData.amount || 0).toLocaleString()} one-time`;
            default:
                return '';
        }
    };

    const getPreviewDateRange = () => {
        if (eventType === EventType.INITIAL_STATE) {
            return `Age ${formData.currentAge || 30} • Today`;
        }

        if (eventType === EventType.ONE_TIME_EVENT) {
            return formatDateFromOffset(formData.monthOffset);
        }

        const start = formatDateFromOffset(formData.startDateOffset);
        const end = formData.endDateOffset ? formatDateFromOffset(formData.endDateOffset) : 'Ongoing';
        return `${start} - ${end}`;
    };

    const renderFinancialImpact = () => {
        switch (eventType) {
            case EventType.INITIAL_STATE:
                const getTotalValue = (account: any): number => {
                    if (typeof account === 'number') return account;
                    if (account?.totalValue) return account.totalValue;
                    return 0;
                };
                const accounts = formData.initialAccounts || {};
                const cash = formData.initialCash || 0;
                const taxable = getTotalValue(accounts.taxable);
                const taxDeferred = getTotalValue(accounts.tax_deferred);
                const roth = getTotalValue(accounts.roth);
                const total = cash + taxable + taxDeferred + roth;

                return (
                    <>
                        <div className="space-y-1.5">
                            {cash > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-areum-text-secondary text-sm-areum">💵 Cash</span>
                                    <span className="font-medium">${cash.toLocaleString()}</span>
                                </div>
                            )}
                            {taxable > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-areum-text-secondary text-sm-areum">📈 Taxable</span>
                                    <span className="font-medium">${taxable.toLocaleString()}</span>
                                </div>
                            )}
                            {taxDeferred > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-areum-text-secondary text-sm-areum">🏦 Tax-Deferred</span>
                                    <span className="font-medium">${taxDeferred.toLocaleString()}</span>
                                </div>
                            )}
                            {roth > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-areum-text-secondary text-sm-areum">🎯 Roth</span>
                                    <span className="font-medium">${roth.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                        {total > 0 && (
                            <div className="flex justify-between border-t border-areum-border pt-2 mt-2">
                                <span className="font-semibold text-areum-text-primary">Total</span>
                                <span className="font-bold text-lg">${total.toLocaleString()}</span>
                            </div>
                        )}
                        {total === 0 && (
                            <div className="text-center text-areum-text-tertiary text-sm-areum py-4">
                                Starting from $0
                            </div>
                        )}
                    </>
                );
            case EventType.INCOME:
                // Income is always shown as annual
                return (
                    <>
                        <div className="flex justify-between">
                            <span className="text-areum-text-secondary">Base Salary (Annual):</span>
                            <span className="font-medium">${(formData.amount || 0).toLocaleString()}</span>
                        </div>
                        {formData.bonus > 0 && (
                            <div className="flex justify-between">
                                <span className="text-areum-text-secondary">Bonus (Annual):</span>
                                <span className="font-medium">${formData.bonus.toLocaleString()}</span>
                            </div>
                        )}
                        {formData.rsuValue > 0 && (
                            <div className="flex justify-between">
                                <span className="text-areum-text-secondary">RSU Value (Annual):</span>
                                <span className="font-medium">${formData.rsuValue.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-areum-border pt-2 font-semibold">
                            <span className="text-areum-text-primary">Total Annual:</span>
                            <span className={`text-${categoryColor}-600`}>
                                ${((formData.amount || 0) + (formData.bonus || 0) + (formData.rsuValue || 0)).toLocaleString()}
                            </span>
                        </div>
                        {formData.enableYearlyRaises !== false && (
                            <div className="text-sm-areum text-areum-text-secondary mt-2">
                                ✓ Yearly raises enabled (grows with inflation)
                            </div>
                        )}
                        <div className="text-xs-areum text-areum-text-tertiary mt-2">
                            Monthly for simulation: ${Math.round((formData.amount || 0) / 12).toLocaleString()}
                        </div>
                    </>
                );
            case EventType.RECURRING_EXPENSE:
                const monthlyAmount = getMonthlyAmount(formData.amount || 0, formData.frequency || 'monthly');
                const annualAmount = monthlyAmount * 12;
                const totalCost = calculateTotalCost();
                
                return (
                    <>
                        <div className="flex justify-between">
                            <span className="text-areum-text-secondary">Monthly Cost:</span>
                            <span className={`font-medium text-${categoryColor}-600`}>
                                ${monthlyAmount.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-areum-text-secondary">Annual Cost:</span>
                            <span className={`font-medium text-${categoryColor}-600`}>
                                ${annualAmount.toLocaleString()}
                            </span>
                        </div>
                        {totalCost > 0 && formData.startDateOffset && formData.endDateOffset && (
                            <>
                                <div className="flex justify-between border-t border-areum-border pt-2">
                                    <span className="text-areum-text-secondary">Total Cost:</span>
                                    <span className={`font-semibold text-${categoryColor}-600`}>
                                        ${totalCost.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs-areum text-areum-text-secondary">
                                    <span>With 3% inflation:</span>
                                    <span>~${Math.round(totalCost * 1.25).toLocaleString()}</span>
                                </div>
                            </>
                        )}
                    </>
                );
            case EventType.ONE_TIME_EVENT:
                return (
                    <div className="flex justify-between">
                        <span className="text-areum-text-secondary">Total Cost:</span>
                        <span className={`font-medium text-${categoryColor}-600`}>
                            ${(formData.amount || 0).toLocaleString()}
                        </span>
                    </div>
                );
            default:
                return null;
        }
    };

    const calculateTotalCost = () => {
        if (!formData.amount || !formData.startDateOffset || !formData.endDateOffset) {
            return 0;
        }

        const durationMonths = formData.endDateOffset - formData.startDateOffset;
        const frequency = formData.frequency || 'monthly';
        
        let paymentsPerMonth = 1;
        switch (frequency) {
            case 'quarterly':
                paymentsPerMonth = 1 / 3;
                break;
            case 'annually':
                paymentsPerMonth = 1 / 12;
                break;
        }
        
        return formData.amount * paymentsPerMonth * durationMonths;
    };

    const getMonthlyAmount = (amount: number, frequency: string): number => {
        switch (frequency) {
            case 'monthly': return amount;
            case 'quarterly': return amount / 3;
            case 'annually': return amount / 12;
            default: return amount;
        }
    };

    const getEventIcon = () => {
        switch (eventType) {
            case EventType.INCOME:
                return '💼';
            case EventType.RECURRING_EXPENSE:
                return getExpenseIcon(formData.category);
            case EventType.ONE_TIME_EVENT:
                return '💳';
            default:
                return categoryEmoji;
        }
    };

    const getExpenseIcon = (category?: string) => {
        switch (category) {
            case 'housing': return '🏠';
            case 'childcare': return '🎓';
            case 'healthcare': return '🏥';
            case 'transportation': return '🚗';
            case 'travel': return '✈️';
            case 'food': return '🍽️';
            case 'utilities': return '⚡';
            case 'insurance': return '🛡️';
            case 'entertainment': return '🎬';
            default: return '💸';
        }
    };

    return (
        <div className={`bg-gradient-to-br from-${categoryColor}-50 to-${categoryColor}-100 border border-${categoryColor}-200 rounded-xl p-6`}>
            <h3 className={`font-semibold text-${categoryColor}-900 mb-4 flex items-center`}>
                <div className={`w-2 h-2 bg-${categoryColor}-500 rounded-full mr-3`}></div>
                Event Preview
            </h3>

            <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-white rounded-lg">
                    <span className="text-2xl">{getEventIcon()}</span>
                    <div className="flex-1">
                        <div className="font-semibold text-areum-text-primary">
                            {getPreviewTitle()}
                        </div>
                        <div className="text-sm-areum text-areum-text-secondary">
                            {getPreviewSubtext()}
                        </div>
                        <div className={`text-xs-areum text-${categoryColor}-600 mt-1`}>
                            {getPreviewDateRange()}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg p-4">
                    <div className="text-sm-areum font-medium text-areum-text-primary mb-2">Financial Impact</div>
                    <div className="space-y-2 text-sm-areum">
                        {renderFinancialImpact()}
                    </div>
                </div>

                {eventType === EventType.RECURRING_EXPENSE && renderImpactAnalysis()}
            </div>
        </div>
    );

    function renderImpactAnalysis() {
        if (!formData.amount || formData.amount <= 0) return null;

        const monthlyAmount = getMonthlyAmount(formData.amount, formData.frequency || 'monthly');
        const annualAmount = monthlyAmount * 12;

        // Simple impact analysis based on expense size
        const isLargeExpense = annualAmount > 50000;
        const isMediumExpense = annualAmount > 20000;

        return (
            <div className="space-y-3 mt-4">
                <h4 className="font-medium text-areum-text-primary text-sm-areum">Impact Analysis</h4>
                
                {isLargeExpense && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                            <div className="text-red-500">⚠️</div>
                            <div>
                                <div className="font-medium text-red-900 text-sm-areum">High Impact Expense</div>
                                <div className="text-sm-areum text-red-700">May significantly delay financial goals</div>
                            </div>
                        </div>
                    </div>
                )}

                {isMediumExpense && !isLargeExpense && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                            <div className="text-yellow-500">💡</div>
                            <div>
                                <div className="font-medium text-yellow-900 text-sm-areum">Moderate Impact</div>
                                <div className="text-sm-areum text-yellow-700">Consider optimization opportunities</div>
                            </div>
                        </div>
                    </div>
                )}

                {formData.category === 'childcare' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <h4 className="font-medium text-green-900 text-sm-areum mb-2">💡 Optimization Ideas</h4>
                        <div className="text-sm-areum text-green-800 space-y-1">
                            <div>• Consider 529 plan for tax benefits</div>
                            <div>• Look into school choice tax credits</div>
                            <div>• Evaluate public vs. private options</div>
                        </div>
                    </div>
                )}

                {formData.category === 'housing' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h4 className="font-medium text-blue-900 text-sm-areum mb-2">💡 Optimization Ideas</h4>
                        <div className="text-sm-areum text-blue-800 space-y-1">
                            <div>• Consider mortgage vs. rent analysis</div>
                            <div>• Evaluate house hacking opportunities</div>
                            <div>• Look into refinancing options</div>
                        </div>
                    </div>
                )}
            </div>
        );
    }
};