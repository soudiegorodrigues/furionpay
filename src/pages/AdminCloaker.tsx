import { useState, useEffect } from "react";
import { AdminHeader } from "@/components/AdminSidebar";
import { EyeOff, Trash2, Copy, ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  safe_url: string;
  offer_url: string;
  block_bots: boolean;
  block_vpn: boolean;
  verify_device: boolean;
  country: string;
  domain: string;
  blocked_devices: string[];
  created_at: string;
  is_active: boolean;
}

interface AvailableDomain {
  id: string;
  domain: string;
  name: string | null;
}

export default function AdminCloaker() {
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
  const [blockedDevices, setBlockedDevices] = useState<string[]>([]);

  const deviceOptions = [
    { id: "mobile", label: "Mobile (Android)" },
    { id: "iphone", label: "iPhone/iOS" },
    { id: "desktop", label: "Computadores" },
    { id: "tablet", label: "Tablets" },
  ];

  useEffect(() => {
    loadDomains();
    loadCloakers();
  }, []);

  const loadDomains = async () => {
    const { data } = await supabase
      .from('available_domains')
      .select('id, domain, name')
      .eq('is_active', true)
      .order('domain');
    setAvailableDomains(data || []);
  };

  const loadCloakers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('cloakers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCloakers(data as unknown as Cloaker[]);
    }
  };

  const toggleDevice = (deviceId: string) => {
    setBlockedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(d => d !== deviceId)
        : [...prev, deviceId]
    );
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
    setBlockedDevices([]);
  };

  const handleCreateCloaker = async () => {
    if (!name || !safeUrl || !offerUrl || !selectedDomain) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para criar o cloaker.",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para criar um cloaker.",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from('cloakers')
      .insert({
        user_id: user.id,
        name,
        safe_url: safeUrl,
        offer_url: offerUrl,
        block_bots: blockBots,
        block_vpn: blockVpn,
        verify_device: verifyDevice,
        country,
        domain: selectedDomain,
        blocked_devices: blockedDevices,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Erro ao criar cloaker",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setCloakers([data as unknown as Cloaker, ...cloakers]);
    resetForm();
    
    toast({
      title: "Cloaker criado!",
      description: "Seu cloaker foi configurado com sucesso.",
    });
  };

  const handleDeleteCloaker = async (id: string) => {
    const { error } = await supabase
      .from('cloakers')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setCloakers(cloakers.filter(c => c.id !== id));
    toast({
      title: "Cloaker excluído",
      description: "O cloaker foi removido com sucesso.",
    });
  };

  const handleToggleActive = async (id: string) => {
    const cloaker = cloakers.find(c => c.id === id);
    if (!cloaker) return;

    const { error } = await supabase
      .from('cloakers')
      .update({ is_active: !cloaker.is_active })
      .eq('id', id);

    if (error) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setCloakers(cloakers.map(c => 
      c.id === id ? { ...c, is_active: !c.is_active } : c
    ));
  };

  const handleCopyLink = (cloaker: Cloaker) => {
    const link = `https://${cloaker.domain}/c/${cloaker.id}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: link,
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
      
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <EyeOff className="h-5 w-5" />
                Criar Novo Cloaker
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Cloaker</Label>
                <Input 
                  id="name" 
                  placeholder="Ex: Campanha Facebook" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="safe-url">URL Segura (Safe)</Label>
                  <Input 
                    id="safe-url" 
                    placeholder="https://..."
                    value={safeUrl}
                    onChange={(e) => setSafeUrl(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="offer-url">Link de Checkout</Label>
                  <Input 
                    id="offer-url" 
                    placeholder="Cole seu link"
                    value={offerUrl}
                    onChange={(e) => setOfferUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Domínio</Label>
                  <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDomains.map((domain) => (
                        <SelectItem key={domain.id} value={domain.domain}>
                          {domain.domain}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>País</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="br">Brasil</SelectItem>
                      <SelectItem value="all">Todos os países</SelectItem>
                      <SelectItem value="latam">América Latina</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-3 pt-2">
                <Label>Filtros de Proteção</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">Bloquear Bots</span>
                    <Switch checked={blockBots} onCheckedChange={setBlockBots} />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">Bloquear VPNs</span>
                    <Switch checked={blockVpn} onCheckedChange={setBlockVpn} />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">Verificar Device</span>
                    <Switch checked={verifyDevice} onCheckedChange={setVerifyDevice} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Bloquear Dispositivos</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {deviceOptions.map((device) => (
                    <div 
                      key={device.id}
                      onClick={() => toggleDevice(device.id)}
                      className={`p-2 rounded-lg border cursor-pointer transition-colors text-center ${
                        blockedDevices.includes(device.id) 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <span className="text-xs font-medium">{device.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleCreateCloaker} className="w-full">
                Criar Cloaker
              </Button>
            </CardContent>
          </Card>

          {/* Cloakers List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Seus Cloakers ({cloakers.length})</h2>
            
            {cloakers.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <EyeOff className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    Nenhum cloaker configurado ainda.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {cloakers.map((cloaker) => (
                  <Card key={cloaker.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">{cloaker.name}</h3>
                            <Badge variant={cloaker.is_active ? "default" : "secondary"} className="text-xs">
                              {cloaker.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-2">
                            {cloaker.domain}/c/{cloaker.id.slice(0, 8)}...
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {cloaker.block_bots && (
                              <Badge variant="outline" className="text-xs">Anti-Bot</Badge>
                            )}
                            {cloaker.block_vpn && (
                              <Badge variant="outline" className="text-xs">Anti-VPN</Badge>
                            )}
                            {cloaker.blocked_devices && cloaker.blocked_devices.length > 0 && (
                              <Badge variant="outline" className="text-xs text-destructive border-destructive">
                                {cloaker.blocked_devices.length} bloqueados
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Switch 
                            checked={cloaker.is_active} 
                            onCheckedChange={() => handleToggleActive(cloaker.id)}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleCopyLink(cloaker)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteCloaker(cloaker.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
