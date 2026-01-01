import { useState, useEffect, useCallback, useRef } from 'react';

interface CurrencyQuote {
  code: string;
  codein: string;
  name: string;
  high: number;
  low: number;
  bid: number;
  ask: number;
  varBid: number;
  pctChange: number;
  timestamp: number;
}

interface UseCurrencyQuoteReturn {
  quote: CurrencyQuote | null;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refresh: () => Promise<void>;
}

const CACHE_KEY = 'currency_quote_usd_brl';
const CACHE_DURATION = 60 * 1000; // 60 seconds

export const useCurrencyQuote = (autoRefreshInterval = 60000): UseCurrencyQuoteReturn => {
  const [quote, setQuote] = useState<CurrencyQuote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchQuote = useCallback(async () => {
    try {
      // Check cache first
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setQuote(data);
          setLastUpdate(new Date(timestamp));
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);
      setError(null);

      const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
      
      if (!response.ok) {
        throw new Error('Falha ao buscar cotação');
      }

      const data = await response.json();
      const usdBrl = data.USDBRL;

      const formattedQuote: CurrencyQuote = {
        code: usdBrl.code,
        codein: usdBrl.codein,
        name: usdBrl.name,
        high: parseFloat(usdBrl.high),
        low: parseFloat(usdBrl.low),
        bid: parseFloat(usdBrl.bid),
        ask: parseFloat(usdBrl.ask),
        varBid: parseFloat(usdBrl.varBid),
        pctChange: parseFloat(usdBrl.pctChange),
        timestamp: parseInt(usdBrl.timestamp) * 1000
      };

      // Cache the result
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: formattedQuote,
        timestamp: Date.now()
      }));

      setQuote(formattedQuote);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching currency quote:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar cotação');
      
      // Try to use cached data even if expired
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        setQuote(data);
        setLastUpdate(new Date(timestamp));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuote();

    // Set up auto-refresh
    if (autoRefreshInterval > 0) {
      intervalRef.current = setInterval(fetchQuote, autoRefreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchQuote, autoRefreshInterval]);

  return {
    quote,
    isLoading,
    error,
    lastUpdate,
    refresh: fetchQuote
  };
};

// Helper function to convert USD to BRL
export const convertUsdToBrl = (usdAmount: number, quote: CurrencyQuote | null): number => {
  if (!quote) return 0;
  return usdAmount * quote.bid;
};

// Helper function to convert BRL to USD
export const convertBrlToUsd = (brlAmount: number, quote: CurrencyQuote | null): number => {
  if (!quote || quote.ask === 0) return 0;
  return brlAmount / quote.ask;
};

// Format currency based on currency code
export const formatCurrencyByCode = (value: number, currency: string = 'BRL'): string => {
  const locale = currency === 'USD' ? 'en-US' : 'pt-BR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(value);
};

// Get currency symbol
export const getCurrencySymbol = (currency: string = 'BRL'): string => {
  return currency === 'USD' ? '$' : 'R$';
};
