import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Medal, Award } from "lucide-react";
import { UserProfitRanking, GlobalPeriodFilter, getGlobalPeriodLabel } from '../types';
import { formatCurrency } from '../utils';
import { RankingSkeleton } from '../skeletons/KPICardSkeleton';
import { cn } from '@/lib/utils';

interface UserRankingProps {
  ranking: UserProfitRanking[];
  isLoading: boolean;
  globalFilter: GlobalPeriodFilter;
}

const RankIcon = ({ position }: { position: number }) => {
  if (position === 1) return <Trophy className="h-4 w-4 text-amber-500" />;
  if (position === 2) return <Medal className="h-4 w-4 text-slate-400" />;
  if (position === 3) return <Award className="h-4 w-4 text-amber-700" />;
  return <span className="text-xs text-muted-foreground font-medium">{position}º</span>;
};

export const UserRanking = memo(({ ranking, isLoading, globalFilter }: UserRankingProps) => {
  const periodLabel = getGlobalPeriodLabel(globalFilter);

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 pb-2 sm:pb-3 px-3 sm:px-6">
        <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
          <div className="p-1 sm:p-1.5 rounded-lg bg-amber-500/10">
            <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
          </div>
          <span className="hidden sm:inline">Ranking de Lucro por Usuário</span>
          <span className="sm:hidden">Ranking Usuários</span>
          <span className="text-[10px] sm:text-xs font-normal text-muted-foreground ml-1">({periodLabel})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {isLoading ? (
          <RankingSkeleton />
        ) : ranking.length > 0 ? (
          <div className="rounded-lg border overflow-x-auto scrollbar-hide">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10 sm:w-12 text-center text-[10px] sm:text-sm">#</TableHead>
                  <TableHead className="min-w-[120px] text-[10px] sm:text-sm">Usuário</TableHead>
                  <TableHead className="text-right text-[10px] sm:text-sm whitespace-nowrap">Tx</TableHead>
                  <TableHead className="text-right text-[10px] sm:text-sm whitespace-nowrap hidden sm:table-cell">Médio</TableHead>
                  <TableHead className="text-right text-[10px] sm:text-sm whitespace-nowrap">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((user, index) => (
                  <TableRow 
                    key={user.email}
                    className={cn(
                      "transition-colors",
                      index < 3 && "bg-amber-500/5"
                    )}
                  >
                    <TableCell className="text-center p-2 sm:p-4">
                      <div className="flex items-center justify-center">
                        <RankIcon position={index + 1} />
                      </div>
                    </TableCell>
                    <TableCell className="p-2 sm:p-4">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-[10px] sm:text-xs font-semibold text-primary">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[10px] sm:text-sm font-medium truncate max-w-[80px] sm:max-w-[200px]">
                          {user.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right p-2 sm:p-4">
                      <span className="text-[10px] sm:text-sm text-muted-foreground">
                        {user.transaction_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-right p-2 sm:p-4 hidden sm:table-cell">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {formatCurrency(user.average_profit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right p-2 sm:p-4">
                      <span className={cn(
                        "text-[10px] sm:text-sm font-bold",
                        index < 3 ? "text-emerald-500" : "text-foreground"
                      )}>
                        {formatCurrency(user.total_profit)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <Trophy className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 sm:mb-3 opacity-50" />
            <p className="text-xs sm:text-sm">Nenhum dado de ranking disponível</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

UserRanking.displayName = 'UserRanking';
