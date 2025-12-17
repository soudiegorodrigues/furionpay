import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Loader2, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface RankingUser {
  user_id: string;
  user_email: string;
  total_generated: number;
  total_paid: number;
  total_amount_generated: number;
  total_amount_paid: number;
  conversion_rate: number;
}

type DateFilter = 'all' | 'today' | '7days' | 'month' | 'year';

const RANKING_PER_PAGE = 5;

export const RankingSection = () => {
  const [rankingUsers, setRankingUsers] = useState<RankingUser[]>([]);
  const [rankingPage, setRankingPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [rankingDateFilter, setRankingDateFilter] = useState<DateFilter>('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRanking();
  }, []);

  const loadRanking = async () => {
    setIsLoading(true);
    try {
      // Use optimized V2 RPC that queries daily_user_stats instead of full table scan
      const { data: rankingData } = await supabase.rpc('get_users_revenue_ranking_v2', {
        p_limit: RANKING_PER_PAGE,
        p_offset: (rankingPage - 1) * RANKING_PER_PAGE,
        p_date_filter: rankingDateFilter
      });
      if (rankingData) {
        setRankingUsers(rankingData as unknown as RankingUser[]);
        // Estimate total from returned data (if less than limit, we have all)
        setTotalUsers(rankingData.length < RANKING_PER_PAGE ? rankingData.length : rankingData.length + RANKING_PER_PAGE);
      }
    } catch (error) {
      console.error('Error loading ranking:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar ranking',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = async (value: DateFilter) => {
    setRankingDateFilter(value);
    setRankingPage(1);
    setIsLoading(true);
    try {
      const { data } = await supabase.rpc('get_users_revenue_ranking_v2', {
        p_limit: RANKING_PER_PAGE,
        p_offset: 0,
        p_date_filter: value
      });
      if (data) {
        setRankingUsers(data as unknown as RankingUser[]);
        setTotalUsers(data.length < RANKING_PER_PAGE ? data.length : data.length + RANKING_PER_PAGE);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = async (newPage: number) => {
    setRankingPage(newPage);
    setIsLoading(true);
    try {
      const { data } = await supabase.rpc('get_users_revenue_ranking_v2', {
        p_limit: RANKING_PER_PAGE,
        p_offset: (newPage - 1) * RANKING_PER_PAGE,
        p_date_filter: rankingDateFilter
      });
      if (data) {
        setRankingUsers(data as unknown as RankingUser[]);
        // Update total based on whether we got full page
        if (data.length < RANKING_PER_PAGE) {
          setTotalUsers((newPage - 1) * RANKING_PER_PAGE + data.length);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const totalPages = Math.ceil(totalUsers / RANKING_PER_PAGE);

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
          Ranking de Faturamentos
        </CardTitle>
        <Select value={rankingDateFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-[100px] h-7 text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7days">7 dias</SelectItem>
            <SelectItem value="month">Mês</SelectItem>
            <SelectItem value="year">Ano</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : rankingUsers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum usuário encontrado
          </p>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-sm font-semibold">#</TableHead>
                    <TableHead className="text-sm font-semibold">Usuário</TableHead>
                    <TableHead className="text-center text-sm font-semibold hidden sm:table-cell">Gerados</TableHead>
                    <TableHead className="text-center text-sm font-semibold">Pagos</TableHead>
                    <TableHead className="text-center text-sm font-semibold hidden sm:table-cell">Conv.</TableHead>
                    <TableHead className="text-right text-sm font-semibold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankingUsers.map((rankUser, index) => (
                    <TableRow key={rankUser.user_id || index}>
                      <TableCell className="font-bold text-sm">
                        {(rankingPage - 1) * RANKING_PER_PAGE + index + 1}º
                      </TableCell>
                      <TableCell className="truncate max-w-[120px] sm:max-w-[200px] text-sm">
                        {rankUser.user_email}
                      </TableCell>
                      <TableCell className="text-center text-blue-400 text-sm hidden sm:table-cell">
                        {rankUser.total_generated}
                      </TableCell>
                      <TableCell className="text-center text-green-400 text-sm">
                        {rankUser.total_paid}
                      </TableCell>
                      <TableCell className="text-center text-yellow-400 text-sm hidden sm:table-cell">
                        {rankUser.conversion_rate}%
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary text-sm whitespace-nowrap">
                        {formatCurrency(rankUser.total_amount_paid)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {rankingPage}/{totalPages}
                </span>
                <div className="flex gap-1 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handlePageChange(rankingPage - 1)}
                    disabled={rankingPage === 1 || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handlePageChange(rankingPage + 1)}
                    disabled={rankingPage >= totalPages || isLoading}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
