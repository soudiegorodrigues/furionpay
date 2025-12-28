// Revenue Dashboard Utility Functions

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function formatCompact(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}K`;
  }
  return formatCurrency(value);
}

export function formatPercent(value: number, showSign = true): string {
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function getMarginPercentage(profit: number, gross: number): number {
  return gross > 0 ? (profit / gross) * 100 : 0;
}

export function getAcquirerPeriodKey(filter: 'today' | '7days' | 'thisMonth'): 'today' | 'sevenDays' | 'thisMonth' {
  if (filter === '7days') return 'sevenDays';
  return filter;
}

export function getAcquirerPeriodLabel(filter: 'today' | '7days' | 'thisMonth'): string {
  switch (filter) {
    case 'today': return 'Hoje';
    case '7days': return '7 dias';
    case 'thisMonth': return 'Este mês';
  }
}
