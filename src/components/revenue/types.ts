// Revenue Dashboard Types

export interface ChartData {
  date: string;
  lucro: number;
}

export interface UserProfitRanking {
  email: string;
  total_profit: number;
  transaction_count: number;
  average_profit: number;
}

export interface PeriodData {
  count: number;
  cost: number;
  volume: number;
}

export interface AcquirerPeriodData {
  today: PeriodData;
  sevenDays: PeriodData;
  thisMonth: PeriodData;
  total: PeriodData;
}

export interface PeriodBreakdown {
  today: number;
  sevenDays: number;
  fifteenDays: number;
  thirtyDays: number;
  thisMonth: number;
  lastMonth: number;
  thisYear: number;
  total: number;
}

export interface ProfitStats {
  today: number;
  sevenDays: number;
  fifteenDays: number;
  thirtyDays: number;
  thisMonth: number;
  lastMonth: number;
  thisYear: number;
  total: number;
  gross: PeriodBreakdown;
  percentageRevenue: PeriodBreakdown;
  fixedRevenue: PeriodBreakdown;
  acquirerCosts: PeriodBreakdown;
  pixCosts: PeriodBreakdown;
  withdrawalFees: PeriodBreakdown;
  acquirerBreakdown: {
    [key: string]: AcquirerPeriodData;
  } | null;
  transactionCount: number;
  averageProfit: number;
  averageDailyProfit: number;
  monthlyProjection: number;
  daysWithData: number;
  monthOverMonthChange: number;
}

export type ChartFilter = 'today' | '7days' | '14days' | '30days';
export type ChartUserFilter = 'all' | string;
export type RankingFilter = 'all' | 'today' | '7days' | '30days' | 'thisMonth';
export type AcquirerCostFilter = 'today' | '7days' | 'thisMonth';

export const ACQUIRER_COST_FILTER_OPTIONS: { value: AcquirerCostFilter; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7days', label: '7 dias' },
  { value: 'thisMonth', label: 'Este mês' },
];

export const CHART_FILTER_OPTIONS: { value: ChartFilter; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7days', label: '7 dias' },
  { value: '14days', label: '14 dias' },
  { value: '30days', label: '30 dias' },
];

export const RANKING_FILTER_OPTIONS: { value: RankingFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'today', label: 'Hoje' },
  { value: '7days', label: '7 dias' },
  { value: '30days', label: '30 dias' },
  { value: 'thisMonth', label: 'Este mês' },
];

const DEFAULT_PERIOD_BREAKDOWN: PeriodBreakdown = { 
  today: 0, sevenDays: 0, fifteenDays: 0, thirtyDays: 0, 
  thisMonth: 0, lastMonth: 0, thisYear: 0, total: 0 
};

export const DEFAULT_PROFIT_STATS: ProfitStats = {
  today: 0,
  sevenDays: 0,
  fifteenDays: 0,
  thirtyDays: 0,
  thisMonth: 0,
  lastMonth: 0,
  thisYear: 0,
  total: 0,
  gross: { ...DEFAULT_PERIOD_BREAKDOWN },
  percentageRevenue: { ...DEFAULT_PERIOD_BREAKDOWN },
  fixedRevenue: { ...DEFAULT_PERIOD_BREAKDOWN },
  acquirerCosts: { ...DEFAULT_PERIOD_BREAKDOWN },
  pixCosts: { ...DEFAULT_PERIOD_BREAKDOWN },
  withdrawalFees: { ...DEFAULT_PERIOD_BREAKDOWN },
  acquirerBreakdown: null,
  transactionCount: 0,
  averageProfit: 0,
  averageDailyProfit: 0,
  monthlyProjection: 0,
  daysWithData: 0,
  monthOverMonthChange: 0
};

export const ACQUIRER_COLORS = {
  inter: { color: '#F97316', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  ativus: { color: '#10B981', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
  valorion: { color: '#3B82F6', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
} as const;

export const ACQUIRER_COSTS_PER_TX = {
  inter: 0.00,
  ativus: 0.05,
  valorion: 0.29,
} as const;
