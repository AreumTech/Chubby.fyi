
export const getCalendarYearAndMonthFromMonthOffset = (
    baseStartYear: number, 
    baseStartMonth: number, // 1-indexed
    monthOffset: number,
    currentAgeAtBaseStart: number // Age at baseStartYear/baseStartMonth
): { year: number, monthInYear: number, ageYears: number } => {
    
    const totalMonthsFromSimStartEpoch = (baseStartMonth - 1) + monthOffset; // 0-indexed months from sim start
    
    const calendarYear = baseStartYear + Math.floor(totalMonthsFromSimStartEpoch / 12);
    const monthInYear = (totalMonthsFromSimStartEpoch % 12) + 1; // Convert back to 1-indexed for display

    const ageAtSimStartInMonths = currentAgeAtBaseStart * 12; 
    const currentAgeInMonthsTotal = ageAtSimStartInMonths + monthOffset; // This is age in months from actual birth
    const ageYears = Math.floor(currentAgeInMonthsTotal / 12);

    return { year: calendarYear, monthInYear, ageYears };
};


export const getMonthOffsetFromCalendarYear = (
    targetCalendarYear: number, 
    targetMonthInYear: number, // 1-indexed
    baseStartYear: number, 
    baseStartMonth: number // 1-indexed
): number => {
    const simStartTotalMonthsEpoch = (baseStartYear * 12) + (baseStartMonth - 1); // 0-indexed
    const targetTotalMonthsEpoch = (targetCalendarYear * 12) + (targetMonthInYear - 1); // 0-indexed
    return targetTotalMonthsEpoch - simStartTotalMonthsEpoch;
};
