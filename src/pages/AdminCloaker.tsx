import { useState } from "react";
import { AdminHeader } from "@/components/AdminSidebar";
import { EyeOff, Plus, Settings, Trash2, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

export default function AdminCloaker() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "O link foi copiado para a área de transferência.",
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader title="Cloaker" icon={EyeOff} />
      
      <main className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Cloaker</h1>
            <p className="text-muted-foreground">
              Proteja seus links e redirecione tráfego indesejado
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Cloaker
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Criar Novo Cloaker</DialogTitle>
                <DialogDescription>
                  Configure as regras de redirecionamento para seu link
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Cloaker</Label>
                  <Input id="name" placeholder="Ex: Campanha Facebook" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="safe-url">URL Segura (Página Safe)</Label>
                  <Input id="safe-url" placeholder="https://exemplo.com/pagina-segura" />
                  <p className="text-xs text-muted-foreground">
                    Página exibida para bots, moderadores e tráfego suspeito
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="offer-url">URL da Oferta</Label>
                  <Input id="offer-url" placeholder="https://exemplo.com/oferta" />
                  <p className="text-xs text-muted-foreground">
                    Página exibida para tráfego real qualificado
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Filtros de Proteção</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Bloquear Bots</p>
                        <p className="text-xs text-muted-foreground">Google, Facebook, etc.</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Bloquear VPNs</p>
                        <p className="text-xs text-muted-foreground">Conexões via VPN/Proxy</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Verificar Dispositivo</p>
                        <p className="text-xs text-muted-foreground">Bloquear emuladores</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>País Permitido</Label>
                  <Select defaultValue="br">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o país" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="br">Brasil</SelectItem>
                      <SelectItem value="all">Todos os países</SelectItem>
                      <SelectItem value="latam">América Latina</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => {
                  toast({
                    title: "Cloaker criado!",
                    description: "Seu cloaker foi configurado com sucesso.",
                  });
                  setIsDialogOpen(false);
                }}>
                  Criar Cloaker
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <EyeOff className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">O que é Cloaker?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  O Cloaker é uma tecnologia de proteção que analisa o tráfego e redireciona 
                  visitantes indesejados (bots, moderadores, VPNs) para uma página segura, 
                  enquanto direciona o tráfego real para sua oferta.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <EyeOff className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum cloaker configurado</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Crie seu primeiro cloaker para proteger seus links e melhorar a qualidade do seu tráfego.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeiro Cloaker
            </Button>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Proteção Anti-Bot</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Detecta e bloqueia crawlers do Google, Facebook, e outras plataformas automaticamente.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Filtro Geográfico</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Permita apenas visitantes de países específicos acessarem sua oferta.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bloqueio de VPN</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Identifica conexões via VPN, proxy e data centers suspeitos.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
