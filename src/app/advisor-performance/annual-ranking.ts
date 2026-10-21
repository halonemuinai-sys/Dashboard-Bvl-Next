export interface AnnualAdvisor {
  name: string;
  location: string;
  netSales: number;
  target: number;
  achievement: number;
  contribution: number;
  productiveMonths: number;
  transCount: number;
}

export type AnnualMetric = 'value' | 'percent';
export type AnnualDirection = 'desc' | 'asc';

export function rankAnnualAdvisors(
  advisors: AnnualAdvisor[],
  { metric, direction, search, location }: {
    metric: AnnualMetric; direction: AnnualDirection; search: string; location: string;
  },
) {
  const query = search.trim().toLocaleLowerCase();
  const rows = advisors.filter(advisor =>
    (!location || advisor.location === location) &&
    (!query || `${advisor.name} ${advisor.location}`.toLocaleLowerCase().includes(query)),
  ).sort((a, b) => {
    // Undefined achievement belongs at the end in either direction, never at 0%.
    if (metric === 'percent' && (a.target > 0) !== (b.target > 0)) return a.target > 0 ? -1 : 1;
    const aValue = metric === 'value' ? a.netSales : a.target > 0 ? a.achievement : 0;
    const bValue = metric === 'value' ? b.netSales : b.target > 0 ? b.achievement : 0;
    return (direction === 'desc' ? bValue - aValue : aValue - bValue)
      || a.name.localeCompare(b.name, 'en') || a.location.localeCompare(b.location, 'en');
  });
  return {
    rows,
    totalSales: rows.reduce((sum, row) => sum + row.netSales, 0),
    totalTarget: rows.reduce((sum, row) => sum + row.target, 0),
    achieved: rows.filter(row => row.target > 0 && row.achievement >= 100).length,
  };
}
