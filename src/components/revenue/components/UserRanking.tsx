import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Medal, Award } from "lucide-react";
import { UserProfitRanking, RankingFilter, RANKING_FILTER_OPTIONS } from '../types';
import { formatCurrency } from '../utils';
import { RankingSkeleton } from '../skeletons/KPICardSkeleton';
import { cn } from '@/lib/utils';

interface UserRankingProps {
  ranking: UserProfitRanking[];
  filter: RankingFilter;
  onFilterChange: (filter: RankingFilter) => void;
  isLoading: boolean;
}

const RankIcon = ({ position }: { position: number }) => {
  if (position === 1) return <Trophy className="h-4 w-4 text-amber-500" />;
  if (position === 2) return <Medal className="h-4 w-4 text-slate-400" />;
  if (position === 3) return <Award className="h-4 w-4 text-amber-700" />;
  return <span className="text-xs text-muted-foreground font-medium">{position}º</span>;
};

export const UserRanking = memo(({ ranking, filter, onFilterChange, isLoading }: UserRankingProps) => {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-amber-500/10">
            <Trophy className="h-4 w-4 text-amber-500" />
          </div>
          Ranking de Lucro por Usuário
        </CardTitle>
        <div className="flex items-center bg-muted rounded-full p-1">
          {RANKING_FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onFilterChange(option.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200",
                filter === option.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <RankingSkeleton />
        ) : ranking.length > 0 ? (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="text-right">Transações</TableHead>
                  <TableHead className="text-right">Lucro Médio</TableHead>
                  <TableHead className="text-right">Lucro Total</TableHead>
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
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <RankIcon position={index + 1} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {user.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm text-muted-foreground">
                        {user.transaction_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(user.average_profit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "text-sm font-bold",
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
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhum dado de ranking disponível</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

UserRanking.displayName = 'UserRanking';
