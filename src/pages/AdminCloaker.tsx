import { useState, useEffect } from "react";
import { AdminHeader } from "@/components/AdminSidebar";
import { EyeOff, Plus, Trash2, Copy, ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { supabase } from "@/integrations/supabase/client";

interface Cloaker {
  id: string;
  name: string;
  safeUrl: string;
  offerUrl: string;
  blockBots: boolean;
  blockVpn: boolean;
  verifyDevice: boolean;
  country: string;
  domain: string;
  createdAt: Date;
  isActive: boolean;
}

interface AvailableDomain {
  id: string;
  domain: string;
  name: string | null;
}

export default function AdminCloaker() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [cloakers, setCloakers] = useState<Cloaker[]>([]);
  const [availableDomains, setAvailableDomains] = useState<AvailableDomain[]>([]);
  
  // Form state
  const [name, setName] = useState("");
  const [safeUrl, setSafeUrl] = useState("");
  const [offerUrl, setOfferUrl] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [blockBots, setBlockBots] = useState(true);
  const [blockVpn, setBlockVpn] = useState(true);
  const [verifyDevice, setVerifyDevice] = useState(false);
  const [country, setCountry] = useState("br");

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    const { data } = await supabase
      .from('available_domains')
      .select('id, domain, name')
      .eq('is_active', true)
      .order('domain');
    setAvailableDomains(data || []);
  };

  const resetForm = () => {
    setName("");
    setSafeUrl("");
    setOfferUrl("");
    setSelectedDomain("");
    setBlockBots(true);
    setBlockVpn(true);
    setVerifyDevice(false);
    setCountry("br");
  };

  const handleCreateCloaker = () => {
    if (!name || !safeUrl || !offerUrl || !selectedDomain) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para criar o cloaker.",
        variant: "destructive",
      });
      return;
    }

    const newCloaker: Cloaker = {
      id: crypto.randomUUID(),
      name,
      safeUrl,
      offerUrl,
      blockBots,
      blockVpn,
      verifyDevice,
      country,
      domain: selectedDomain,
      createdAt: new Date(),
      isActive: true,
    };

    setCloakers([...cloakers, newCloaker]);
    resetForm();
    setIsDialogOpen(false);
    
    toast({
      title: "Cloaker criado!",
      description: "Seu cloaker foi configurado com sucesso.",
    });
  };

  const handleDeleteCloaker = (id: string) => {
    setCloakers(cloakers.filter(c => c.id !== id));
    toast({
      title: "Cloaker excluído",
      description: "O cloaker foi removido com sucesso.",
    });
  };

  const handleToggleActive = (id: string) => {
    setCloakers(cloakers.map(c => 
      c.id === id ? { ...c, isActive: !c.isActive } : c
    ));
  };

  const handleCopyLink = (cloaker: Cloaker) => {
    const link = `https://${cloaker.domain}/c/${cloaker.id}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "O link foi copiado para a área de transferência.",
    });
  };

  const getCountryLabel = (code: string) => {
    const countries: Record<string, string> = {
      br: "Brasil",
      all: "Todos os países",
      latam: "América Latina",
    };
    return countries[code] || code;
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
              Copie seu link de checkout e camufle aqui para proteger contra bots e moderadores
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
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
                  <Input 
                    id="name" 
                    placeholder="Ex: Campanha Facebook" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="safe-url">URL Segura (Página Safe)</Label>
                  <Input 
                    id="safe-url" 
                    placeholder="https://exemplo.com/pagina-segura"
                    value={safeUrl}
                    onChange={(e) => setSafeUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Página exibida para bots, moderadores e tráfego suspeito
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="offer-url">Link de Checkout (URL da Oferta)</Label>
                  <Input 
                    id="offer-url" 
                    placeholder="Cole aqui seu link de checkout"
                    value={offerUrl}
                    onChange={(e) => setOfferUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Cole o link que você copiou na página de Checkout
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Domínio do Cloaker</Label>
                  <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o domínio" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDomains.map((domain) => (
                        <SelectItem key={domain.id} value={domain.domain}>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            {domain.domain}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    O link do cloaker será gerado com este domínio
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
                      <Switch checked={blockBots} onCheckedChange={setBlockBots} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Bloquear VPNs</p>
                        <p className="text-xs text-muted-foreground">Conexões via VPN/Proxy</p>
                      </div>
                      <Switch checked={blockVpn} onCheckedChange={setBlockVpn} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Verificar Dispositivo</p>
                        <p className="text-xs text-muted-foreground">Bloquear emuladores</p>
                      </div>
                      <Switch checked={verifyDevice} onCheckedChange={setVerifyDevice} />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>País Permitido</Label>
                  <Select value={country} onValueChange={setCountry}>
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
                <Button onClick={handleCreateCloaker}>
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
                <h3 className="font-semibold">Como funciona?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>1.</strong> Vá até a página <strong>Checkout</strong> e copie seu link de checkout<br/>
                  <strong>2.</strong> Volte aqui e crie um novo cloaker, colando o link como "URL da Oferta"<br/>
                  <strong>3.</strong> Defina uma página segura (safe) para bots e moderadores verem<br/>
                  <strong>4.</strong> Copie o link do cloaker e use nas suas campanhas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cloakers List or Empty State */}
        {cloakers.length === 0 ? (
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
        ) : (
          <div className="space-y-4">
            {cloakers.map((cloaker) => (
              <Card key={cloaker.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{cloaker.name}</h3>
                        <Badge variant={cloaker.isActive ? "default" : "secondary"}>
                          {cloaker.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="truncate">
                          <span className="font-medium">Safe:</span> {cloaker.safeUrl}
                        </p>
                        <p className="truncate">
                          <span className="font-medium">Oferta:</span> {cloaker.offerUrl}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {cloaker.blockBots && (
                          <Badge variant="outline" className="text-xs">Anti-Bot</Badge>
                        )}
                        {cloaker.blockVpn && (
                          <Badge variant="outline" className="text-xs">Anti-VPN</Badge>
                        )}
                        {cloaker.verifyDevice && (
                          <Badge variant="outline" className="text-xs">Verificação</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {getCountryLabel(cloaker.country)}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={cloaker.isActive} 
                        onCheckedChange={() => handleToggleActive(cloaker.id)}
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleCopyLink(cloaker)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => window.open(cloaker.offerUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="icon"
                        onClick={() => handleDeleteCloaker(cloaker.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

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
