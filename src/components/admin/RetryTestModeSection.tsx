import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FlaskConical, AlertTriangle, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ACQUIRER_OPTIONS = [
  { value: 'none', label: 'Nenhum (desativado)' },
  { value: 'ativus', label: 'Ativus Hub' },
  { value: 'spedpay', label: 'SpedPay' },
  { value: 'inter', label: 'Banco Inter' },
];

export function RetryTestModeSection() {
  const [testFailAcquirer, setTestFailAcquirer] = useState<string>('none');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTestMode();
  }, []);

  const loadTestMode = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .is('user_id', null)
        .eq('key', 'retry_test_fail_acquirer')
        .maybeSingle();
      
      if (!error && data?.value) {
        setTestFailAcquirer(data.value);
      }
    } catch (err) {
      console.error('Error loading test mode:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTestMode = async () => {
    setSaving(true);
    try {
      const valueToSave = testFailAcquirer === 'none' ? null : testFailAcquirer;
      
      // Delete existing setting first
      await supabase
        .from('admin_settings')
        .delete()
        .is('user_id', null)
        .eq('key', 'retry_test_fail_acquirer');
      
      // Insert new setting if not 'none'
      if (valueToSave) {
        const { error } = await supabase
          .from('admin_settings')
          .insert({
            key: 'retry_test_fail_acquirer',
            value: valueToSave,
            user_id: null
          });
        
        if (error) throw error;
      }
      
      toast.success(
        testFailAcquirer === 'none' 
          ? 'Modo de teste desativado' 
          : `Modo de teste ativado - ${ACQUIRER_OPTIONS.find(o => o.value === testFailAcquirer)?.label} irá falhar`
      );
    } catch (err) {
      console.error('Error saving test mode:', err);
      toast.error('Erro ao salvar configuração de teste');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse border-orange-500/30">
        <CardHeader>
          <div className="h-5 bg-muted rounded w-48" />
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const isTestModeActive = testFailAcquirer !== 'none';

  return (
    <Card className={`border-orange-500/30 ${isTestModeActive ? 'bg-orange-500/5' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-orange-500" />
          Modo de Teste de Retry
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Simule falha em um adquirente para testar se o sistema de retry está funcionando corretamente.
        </p>
        
        <div className="flex items-center gap-3">
          <Select value={testFailAcquirer} onValueChange={setTestFailAcquirer}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione adquirente" />
            </SelectTrigger>
            <SelectContent>
              {ACQUIRER_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={handleSaveTestMode} 
            disabled={saving}
            variant={isTestModeActive ? "destructive" : "default"}
            size="sm"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {testFailAcquirer === 'none' ? 'Desativar' : 'Ativar Modo Teste'}
          </Button>
        </div>
        
        {isTestModeActive && (
          <Alert className="bg-orange-500/10 border-orange-500/50">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <AlertDescription className="text-orange-700 dark:text-orange-400">
              <strong>Modo de teste ativo!</strong> O adquirente{' '}
              <strong>{ACQUIRER_OPTIONS.find(o => o.value === testFailAcquirer)?.label}</strong>{' '}
              irá falhar propositalmente. O sistema tentará automaticamente os próximos 
              adquirentes configurados no fluxo de retry.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
