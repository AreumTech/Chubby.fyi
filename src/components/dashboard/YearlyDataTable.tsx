import React from 'react';
import { useDataService } from '@/hooks/useDataService';
import { formatCurrencyShort } from '@/utils/formatting';
import { H4, BodyBase, Caption, MonoSmall } from '@/components/ui/Typography';

interface YearlyDataTableProps {
  onYearSelect?: (year: number) => void;
  maxYears?: number;
}

export const YearlyDataTable: React.FC<YearlyDataTableProps> = ({ 
  onYearSelect, 
  maxYears = 20 
}) => {
  const { hasData, getAvailableYears, getBasicYearData } = useDataService();

  if (!hasData) {
    return (
      <div className="text-center py-8">
        <H4 color="tertiary">No data available</H4>
        <BodyBase color="tertiary" className="mt-2">Run a simulation to see yearly breakdown</BodyBase>
      </div>
    );
  }

  const availableYears = getAvailableYears()
    .filter(year => year >= new Date().getFullYear())
    .slice(0, maxYears);

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left">
              <Caption color="tertiary" weight="medium" className="uppercase tracking-wider">Year</Caption>
            </th>
            <th className="px-6 py-3 text-left">
              <Caption color="tertiary" weight="medium" className="uppercase tracking-wider">Net Worth</Caption>
            </th>
            <th className="px-6 py-3 text-left">
              <Caption color="tertiary" weight="medium" className="uppercase tracking-wider">Income</Caption>
            </th>
            <th className="px-6 py-3 text-left">
              <Caption color="tertiary" weight="medium" className="uppercase tracking-wider">Expenses</Caption>
            </th>
            <th className="px-6 py-3 text-left">
              <Caption color="tertiary" weight="medium" className="uppercase tracking-wider">Taxes</Caption>
            </th>
            <th className="px-6 py-3 text-left">
              <Caption color="tertiary" weight="medium" className="uppercase tracking-wider">💰 Divestment</Caption>
            </th>
            <th className="px-6 py-3 text-left">
              <Caption color="tertiary" weight="medium" className="uppercase tracking-wider">Cash Flow</Caption>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {availableYears.map((year) => {
            const yearData = getBasicYearData(year);
            const netWorth = yearData?.netWorth || 0;
            const income = yearData?.income || 0;
            const expenses = yearData?.expenses || 0;
            const taxes = yearData?.taxes || 0;
            const divestment = yearData?.divestment || 0;
            const cashFlow = yearData?.cashFlow || 0;

            return (
              <tr
                key={year}
                className={`hover:bg-gray-50 cursor-pointer ${divestment > 0 ? 'bg-yellow-25' : ''}`}
                onClick={() => onYearSelect?.(year)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <BodyBase weight="medium">{year}</BodyBase>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <MonoSmall>{formatCurrencyShort(netWorth)}</MonoSmall>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <MonoSmall className="text-green-600">{formatCurrencyShort(income)}</MonoSmall>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <MonoSmall className="text-red-600">{formatCurrencyShort(expenses)}</MonoSmall>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <MonoSmall className="text-orange-600">{formatCurrencyShort(taxes)}</MonoSmall>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <MonoSmall
                    weight={divestment > 0 ? 'bold' : 'normal'}
                    className={divestment > 0 ? 'text-yellow-700' : 'text-gray-400'}
                  >
                    {divestment > 0 ? formatCurrencyShort(divestment) : '—'}
                  </MonoSmall>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <MonoSmall
                    weight="bold"
                    className={cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}
                  >
                    {formatCurrencyShort(cashFlow)}
                  </MonoSmall>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Legend for divestment column */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <Caption color="tertiary">
          <span className="inline-block w-3 h-3 bg-yellow-200 rounded mr-2"></span>
          💰 Divestment = Proceeds from forced asset sales (converts investments to cash, not income)
        </Caption>
      </div>
    </div>
  );
};