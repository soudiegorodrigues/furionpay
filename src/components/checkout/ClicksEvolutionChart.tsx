import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { MousePointerClick } from 'lucide-react';

interface ChartData {
  date: string;
  clicks: number;
}

interface Props {
  userId: string;
}

export function ClicksEvolutionChart({ userId }: Props) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: chartData } = await supabase.rpc('get_offer_clicks_chart', {
        p_user_id: userId,
        p_days: period
      });
      
      if (chartData) {
        setData(chartData.map((d: { date: string; clicks: number }) => ({
          date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          clicks: Number(d.clicks)
        })));
      }
      setLoading(false);
    }
    fetchData();
  }, [userId, period]);

  const totalClicks = data.reduce((sum, d) => sum + d.clicks, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MousePointerClick className="w-5 h-5 text-purple-500" />
            <CardTitle className="text-base">Evolução de Cliques</CardTitle>
          </div>
          <div className="flex gap-1">
            {([7, 30, 90] as const).map(p => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? 'default' : 'ghost'}
                onClick={() => setPeriod(p)}
                className="text-xs h-7 px-2"
              >
                {p}d
              </Button>
            ))}
          </div>
        </div>
        <p className="text-2xl font-bold text-purple-600">{totalClicks.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">cliques nos últimos {period} dias</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            Nenhum clique registrado no período
          </div>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`${value} cliques`, 'Cliques']}
                />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fill="url(#clicksGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
