import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  DollarSign,
  ArrowRightLeft
} from "lucide-react";
import { useCurrencyQuote } from "@/hooks/useCurrencyQuote";
import { Skeleton } from "@/components/ui/skeleton";

export const CurrencyQuoteCard = () => {
  const { quote, isLoading, error, lastUpdate, refresh } = useCurrencyQuote();

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(value);
  };

  if (isLoading && !quote) {
    return (
      <Card className="border border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !quote) {
    return (
      <Card className="border border-destructive/50 bg-destructive/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-destructive/10">
                <DollarSign className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium text-destructive">Erro na cotação</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPositive = quote && quote.pctChange >= 0;

  return (
    <Card className="border border-border/50 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">USD/BRL</p>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${isPositive ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600'}`}
                >
                  {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {isPositive ? '+' : ''}{quote?.pctChange.toFixed(2)}%
                </Badge>
              </div>
              <p className="text-xl font-bold text-foreground">
                {quote ? formatCurrency(quote.bid) : '--'}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Máx: {quote ? formatCurrency(quote.high) : '--'}</span>
                <span>•</span>
                <span>Mín: {quote ? formatCurrency(quote.low) : '--'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={refresh}
              className="h-8 w-8"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <span className="text-xs text-muted-foreground">
              {formatTime(lastUpdate)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
