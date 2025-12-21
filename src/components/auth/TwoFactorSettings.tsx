import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, ShieldCheck, ShieldOff, Loader2, Key, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TwoFactorSetup } from './TwoFactorSetup';
import { BackupCodesDisplay } from './BackupCodesDisplay';

export const TwoFactorSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [has2FA, setHas2FA] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [backupCodesCount, setBackupCodesCount] = useState(0);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);
  const [disabling, setDisabling] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    check2FAStatus();
  }, []);

  const check2FAStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) throw error;

      const totpFactor = data?.totp?.[0];
      setHas2FA(!!totpFactor);
      setFactorId(totpFactor?.id || null);

      // Get backup codes count
      const { data: count } = await supabase.rpc('count_backup_codes');
      setBackupCodesCount(count || 0);
    } catch (error: any) {
      console.error('Error checking 2FA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!password.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Digite sua senha para confirmar'
      });
      return;
    }

    setDisabling(true);
    try {
      // Verify password
      const user = (await supabase.auth.getUser()).data.user;
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password
      });

      if (authError) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Senha incorreta'
        });
        return;
      }

      if (!factorId) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Fator 2FA não encontrado'
        });
        return;
      }

      // Unenroll the factor
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      
      if (error) throw error;

      // Delete backup codes
      await supabase.from('mfa_backup_codes').delete().eq('user_id', user?.id);

      // Log the event
      await supabase.from('mfa_audit_logs').insert({
        user_id: user?.id,
        event_type: 'unenrolled'
      });

      toast({
        title: 'Sucesso',
        description: '2FA desativado com sucesso'
      });

      setShowDisableDialog(false);
      setPassword('');
      setHas2FA(false);
      setFactorId(null);
      setBackupCodesCount(0);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao desativar 2FA'
      });
    } finally {
      setDisabling(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    try {
      const { data: codes, error } = await supabase.rpc('generate_backup_codes', { p_count: 8 });
      
      if (error) throw error;

      setNewBackupCodes(codes || []);
      setBackupCodesCount(8);
      setShowRegenerateDialog(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao regenerar códigos'
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (showSetup) {
    return (
      <Card>
        <CardContent className="pt-6">
          <TwoFactorSetup
            onComplete={() => {
              setShowSetup(false);
              check2FAStatus();
            }}
            onCancel={() => setShowSetup(false)}
          />
        </CardContent>
      </Card>
    );
  }

  if (newBackupCodes.length > 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <BackupCodesDisplay
            codes={newBackupCodes}
            onComplete={() => setNewBackupCodes([])}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Autenticação em Duas Etapas (2FA)
          </CardTitle>
          <CardDescription>
            Adicione uma camada extra de segurança à sua conta usando um app autenticador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              {has2FA ? (
                <ShieldCheck className="h-6 w-6 text-green-500" />
              ) : (
                <ShieldOff className="h-6 w-6 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Status do 2FA</p>
                <p className="text-sm text-muted-foreground">
                  {has2FA 
                    ? 'Sua conta está protegida com autenticação em duas etapas'
                    : 'Recomendamos ativar o 2FA para maior segurança'
                  }
                </p>
              </div>
            </div>
            <Badge variant={has2FA ? 'default' : 'secondary'} className={has2FA ? 'bg-green-500' : ''}>
              {has2FA ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>

          {has2FA && (
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Códigos de Backup</p>
                  <p className="text-sm text-muted-foreground">
                    {backupCodesCount} códigos restantes
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRegenerateDialog(true)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerar
              </Button>
            </div>
          )}

          {/* Action Button */}
          {has2FA ? (
            <Button
              variant="destructive"
              onClick={() => setShowDisableDialog(true)}
              className="w-full sm:w-auto"
            >
              <ShieldOff className="h-4 w-4 mr-2" />
              Desativar 2FA
            </Button>
          ) : (
            <Button
              onClick={() => setShowSetup(true)}
              className="w-full sm:w-auto"
            >
              <Shield className="h-4 w-4 mr-2" />
              Ativar 2FA
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Disable Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar Autenticação em Duas Etapas</DialogTitle>
            <DialogDescription>
              Isso tornará sua conta menos segura. Digite sua senha para confirmar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="disable-password">Senha</Label>
              <Input
                id="disable-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDisableDialog(false); setPassword(''); }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDisable2FA} disabled={disabling}>
              {disabling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Desativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerar Códigos de Backup</DialogTitle>
            <DialogDescription>
              Isso invalidará todos os códigos anteriores. Certifique-se de salvar os novos códigos em um local seguro.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegenerateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegenerateBackupCodes}>
              Regenerar Códigos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
