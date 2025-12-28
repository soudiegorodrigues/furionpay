import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Receipt, Wallet, TrendingUp } from "lucide-react";
import { ProfitStats } from '../types';
import { formatCurrency } from '../utils';

interface GeneralStatsProps {
  stats: ProfitStats;
}

export const GeneralStats = memo(({ stats }: GeneralStatsProps) => {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <div className="p-1 sm:p-1.5 rounded-lg bg-blue-500/10">
            <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
          </div>
          Estatísticas Gerais
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="text-center p-2.5 sm:p-4 bg-muted/30 rounded-xl">
            <div className="flex items-center justify-center mb-1.5 sm:mb-2">
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
            </div>
            <div className="text-base sm:text-xl font-bold text-foreground">
              {stats.transactionCount.toLocaleString('pt-BR')}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
              Total Transações
            </p>
          </div>
          
          <div className="text-center p-2.5 sm:p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <div className="flex items-center justify-center mb-1.5 sm:mb-2">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
            </div>
            <div className="text-base sm:text-xl font-bold text-emerald-500">
              {formatCurrency(stats.total)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
              Lucro Total
            </p>
          </div>
          
          <div className="text-center p-2.5 sm:p-4 bg-muted/30 rounded-xl">
            <div className="flex items-center justify-center mb-1.5 sm:mb-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
            </div>
            <div className="text-base sm:text-xl font-bold text-foreground">
              {formatCurrency(stats.averageProfit)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
              Ticket Médio
            </p>
          </div>
          
          <div className="text-center p-2.5 sm:p-4 bg-muted/30 rounded-xl">
            <div className="flex items-center justify-center mb-1.5 sm:mb-2">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
            </div>
            <div className="text-base sm:text-xl font-bold text-foreground">
              {formatCurrency(stats.gross.total)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
              Receita Bruta
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

GeneralStats.displayName = 'GeneralStats';
