import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, RefreshCw, Eye, EyeOff, Building2, Key, Mail, Copy, Construction, Clock, History, Percent, ArrowRightLeft, AlertTriangle, Settings, CreditCard, Search, Check, ChevronsUpDown, X, CheckCircle, Lock, Loader2, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/AccessDenied";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface Transaction {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

interface BankAccountData {
  bank: string;
  pixKeyType: string;
  pixKey: string;
}

interface WithdrawalHistory {
  id: string;
  amount: number;
  status: string;
  bank_name: string;
  pix_key: string;
  created_at: string;
  processed_at: string | null;
  rejection_reason: string | null;
  user_email?: string;
}

interface FeeConfig {
  id: string;
  name: string;
  pix_percentage: number;
  pix_fixed: number;
  saque_percentage: number;
  saque_fixed: number;
}

// Lightweight skeleton for instant feedback
const QuickSkeleton = memo(() => (
  <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-10 rounded-full" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
      <Card><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
    </div>
    <Skeleton className="h-12 w-full" />
    <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
  </div>
));

QuickSkeleton.displayName = 'QuickSkeleton';

const AdminFinanceiro = () => {
  const { user, isAdmin } = useAdminAuth();
  const { isOwner, hasPermission, loading: permissionsLoading } = usePermissions();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalHistory[]>([]);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hideValues, setHideValues] = useState(false);
  const [hasBankAccount, setHasBankAccount] = useState(false);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPixKey, setWithdrawPixKey] = useState("");
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [userFeeConfig, setUserFeeConfig] = useState<FeeConfig | null>(null);
  const [bankData, setBankData] = useState<BankAccountData>({
    bank: '',
    pixKeyType: '',
    pixKey: ''
  });
  const [savedBankData, setSavedBankData] = useState<BankAccountData | null>(null);
  const [bankSearch, setBankSearch] = useState('');
  const [bankPopoverOpen, setBankPopoverOpen] = useState(false);
  const [showPasswordConfirmDialog, setShowPasswordConfirmDialog] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const WITHDRAWALS_PER_PAGE = 10;
  const { toast } = useToast();

  const banks = [
    { code: '001', name: 'Banco do Brasil S.A.' },
    { code: '003', name: 'Banco da Amazônia S.A.' },
    { code: '004', name: 'Banco do Nordeste do Brasil S.A.' },
    { code: '007', name: 'BNDES' },
    { code: '010', name: 'Credicoamo' },
    { code: '011', name: 'Credit Suisse Hedging-Griffo' },
    { code: '012', name: 'Banco Inbursa S.A.' },
    { code: '014', name: 'Natixis Brasil S.A.' },
    { code: '015', name: 'UBS Brasil CCTVM S.A.' },
    { code: '016', name: 'Sicoob Creditran' },
    { code: '017', name: 'BNY Mellon Banco S.A.' },
    { code: '018', name: 'Banco Tricury S.A.' },
    { code: '021', name: 'Banestes S.A.' },
    { code: '024', name: 'Banco Bandepe S.A.' },
    { code: '025', name: 'Banco Alfa S.A.' },
    { code: '029', name: 'Banco Itaú Consignado S.A.' },
    { code: '033', name: 'Banco Santander Brasil S.A.' },
    { code: '036', name: 'Banco Bradesco BBI S.A.' },
    { code: '037', name: 'Banco do Estado do Pará S.A.' },
    { code: '040', name: 'Banco Cargill S.A.' },
    { code: '041', name: 'Banrisul S.A.' },
    { code: '047', name: 'Banco do Estado de Sergipe S.A.' },
    { code: '062', name: 'Hipercard' },
    { code: '063', name: 'Banco Bradescard S.A.' },
    { code: '065', name: 'Banco AndBank Brasil S.A.' },
    { code: '066', name: 'Banco Morgan Stanley S.A.' },
    { code: '069', name: 'Banco Crefisa S.A.' },
    { code: '070', name: 'BRB - Banco de Brasília S.A.' },
    { code: '074', name: 'Banco J. Safra S.A.' },
    { code: '075', name: 'BCo ABN Amro S.A.' },
    { code: '076', name: 'Banco KDB do Brasil S.A.' },
    { code: '077', name: 'Banco Inter S.A.' },
    { code: '078', name: 'Haitong BI do Brasil S.A.' },
    { code: '079', name: 'Banco Original do Agronegócio S.A.' },
    { code: '080', name: 'B&T CC Ltda.' },
    { code: '081', name: 'BBN Banco Brasileiro de Negócios S.A.' },
    { code: '082', name: 'Banco Topázio S.A.' },
    { code: '083', name: 'Banco da China Brasil S.A.' },
    { code: '084', name: 'Uniprime Norte do Paraná' },
    { code: '085', name: 'Cooperativa Central Ailos' },
    { code: '088', name: 'Randon S.A.' },
    { code: '089', name: 'Credisan CC' },
    { code: '091', name: 'Unicred Central RS' },
    { code: '092', name: 'BRK S.A. CFI' },
    { code: '093', name: 'Polocred SCMEPP Ltda.' },
    { code: '094', name: 'Banco Finaxis S.A.' },
    { code: '095', name: 'Banco Confidence' },
    { code: '096', name: 'Banco B3 S.A.' },
    { code: '097', name: 'Credisis Central de Cooperativas' },
    { code: '098', name: 'Credialiança CCR' },
    { code: '099', name: 'Uniprime Central' },
    { code: '100', name: 'Planner Corretora de Valores S.A.' },
    { code: '101', name: 'Renascença DTVM Ltda.' },
    { code: '102', name: 'XP Investimentos CCTVM S.A.' },
    { code: '104', name: 'Caixa Econômica Federal' },
    { code: '105', name: 'Lecca CFI S.A.' },
    { code: '107', name: 'Banco Bocom BBM S.A.' },
    { code: '108', name: 'PortoCred S.A.' },
    { code: '111', name: 'Oliveira Trust DTVM S.A.' },
    { code: '113', name: 'Magliano S.A. CCVM' },
    { code: '114', name: 'Central Cooperativa de Crédito no Estado do Espírito Santo' },
    { code: '117', name: 'Advanced CC Ltda.' },
    { code: '119', name: 'Banco Western Union do Brasil S.A.' },
    { code: '120', name: 'Banco Rodobens S.A.' },
    { code: '121', name: 'Banco Agibank S.A.' },
    { code: '122', name: 'Banco Bradesco BERJ S.A.' },
    { code: '124', name: 'Banco Woori Bank do Brasil S.A.' },
    { code: '125', name: 'Banco Genial S.A.' },
    { code: '126', name: 'BR Partners BI S.A.' },
    { code: '127', name: 'Codepe CVC S.A.' },
    { code: '128', name: 'MS Bank S.A. Banco de Câmbio' },
    { code: '129', name: 'UBS Brasil BI S.A.' },
    { code: '130', name: 'Caruana SCFI' },
    { code: '131', name: 'Tullett Prebon Brasil CVC Ltda.' },
    { code: '132', name: 'ICBC do Brasil BM S.A.' },
    { code: '133', name: 'Cresol Confederação' },
    { code: '134', name: 'BGC Liquidez DTVM Ltda.' },
    { code: '136', name: 'Unicred Cooperativa' },
    { code: '137', name: 'Multimoney CC Ltda.' },
    { code: '138', name: 'Get Money CC Ltda.' },
    { code: '139', name: 'Intesa Sanpaolo Brasil S.A.' },
    { code: '140', name: 'Easynvest Título CV S.A.' },
    { code: '142', name: 'Broker Brasil CC Ltda.' },
    { code: '143', name: 'Treviso CC S.A.' },
    { code: '144', name: 'Bexs Banco de Câmbio S.A.' },
    { code: '145', name: 'Levycam CCV Ltda.' },
    { code: '146', name: 'Guitta CC Ltda.' },
    { code: '149', name: 'Facta S.A. CFI' },
    { code: '157', name: 'ICAP do Brasil CTVM Ltda.' },
    { code: '159', name: 'Casa do Crédito S.A.' },
    { code: '163', name: 'Commerzbank Brasil S.A.' },
    { code: '169', name: 'Banco Olé Consignado S.A.' },
    { code: '173', name: 'BRL Trust DTVM S.A.' },
    { code: '174', name: 'Pefisa S.A. CFI' },
    { code: '177', name: 'Guide Investimentos S.A.' },
    { code: '180', name: 'CM Capital Markets CCTVM Ltda.' },
    { code: '183', name: 'Socred S.A.' },
    { code: '184', name: 'Banco Itaú BBA S.A.' },
    { code: '188', name: 'Ativa Investimentos S.A.' },
    { code: '189', name: 'HS Financeira S.A.' },
    { code: '190', name: 'Servicoop' },
    { code: '191', name: 'Nova Futura CTVM Ltda.' },
    { code: '194', name: 'Parmetal DTVM Ltda.' },
    { code: '196', name: 'Fair CC S.A.' },
    { code: '197', name: 'Stone Pagamentos S.A.' },
    { code: '208', name: 'Banco BTG Pactual S.A.' },
    { code: '212', name: 'Banco Original S.A.' },
    { code: '213', name: 'Banco Arbi S.A.' },
    { code: '217', name: 'Banco John Deere S.A.' },
    { code: '218', name: 'Banco BS2 S.A.' },
    { code: '222', name: 'Banco Credit Agricole Brasil S.A.' },
    { code: '224', name: 'Banco Fibra S.A.' },
    { code: '233', name: 'Banco Cifra S.A.' },
    { code: '237', name: 'Bradesco S.A.' },
    { code: '241', name: 'Banco Clássico S.A.' },
    { code: '243', name: 'Banco Máxima S.A.' },
    { code: '246', name: 'Banco ABC Brasil S.A.' },
    { code: '249', name: 'Banco Investcred Unibanco S.A.' },
    { code: '250', name: 'BCV - Banco de Crédito e Varejo S.A.' },
    { code: '253', name: 'Bexs CC S.A.' },
    { code: '254', name: 'Paraná Banco S.A.' },
    { code: '260', name: 'Nubank' },
    { code: '265', name: 'Banco Fator S.A.' },
    { code: '266', name: 'Banco Cédula S.A.' },
    { code: '268', name: 'Barigui CH' },
    { code: '269', name: 'HSBC Brasil S.A.' },
    { code: '270', name: 'Sagitur CC Ltda.' },
    { code: '271', name: 'IB CCTVM S.A.' },
    { code: '272', name: 'AGK CC S.A.' },
    { code: '273', name: 'CCR de São Miguel do Oeste' },
    { code: '274', name: 'Money Plus SCMEPP Ltda.' },
    { code: '276', name: 'Banco Senff S.A.' },
    { code: '278', name: 'Genial Investimentos CVM S.A.' },
    { code: '279', name: 'CCR de Primavera do Leste' },
    { code: '280', name: 'Avista S.A. CFI' },
    { code: '281', name: 'CCR Coopavel' },
    { code: '283', name: 'RB Capital Investimentos DTVM Ltda.' },
    { code: '285', name: 'Frente CC Ltda.' },
    { code: '286', name: 'CCR de Ouro' },
    { code: '288', name: 'Carol DTVM Ltda.' },
    { code: '289', name: 'Decyseo CC Ltda.' },
    { code: '290', name: 'PagSeguro Internet S.A.' },
    { code: '292', name: 'BS2 DTVM S.A.' },
    { code: '293', name: 'Lastro RDV DTVM Ltda.' },
    { code: '298', name: 'Vip\'s CC Ltda.' },
    { code: '299', name: 'Sorocred CFI S.A.' },
    { code: '300', name: 'Banco de la Nación Argentina' },
    { code: '301', name: 'Conta Simples / Dock / BPP IP S.A.' },
    { code: '306', name: 'Portopar DTVM Ltda.' },
    { code: '307', name: 'Terra Investimentos DTVM Ltda.' },
    { code: '309', name: 'Cambionet CC Ltda.' },
    { code: '310', name: 'VORTX DTVM Ltda.' },
    { code: '311', name: 'Dourada Corretora' },
    { code: '312', name: 'Hscm SCMEPP Ltda.' },
    { code: '313', name: 'Amazônia CC Ltda.' },
    { code: '315', name: 'PI DTVM S.A.' },
    { code: '318', name: 'Banco BMG S.A.' },
    { code: '319', name: 'OM DTVM Ltda.' },
    { code: '320', name: 'China Construction Bank Brasil' },
    { code: '321', name: 'Crefaz SCMEPP Ltda.' },
    { code: '322', name: 'CCR de Abelardo Luz' },
    { code: '323', name: 'Mercado Pago' },
    { code: '324', name: 'Cartos SCD S.A.' },
    { code: '325', name: 'Órama DTVM S.A.' },
    { code: '326', name: 'Parati CFI S.A.' },
    { code: '329', name: 'QI SCD S.A.' },
    { code: '330', name: 'Banco Bari S.A.' },
    { code: '331', name: 'Fram Capital DTVM S.A.' },
    { code: '332', name: 'Acesso Soluções de Pagamento S.A.' },
    { code: '335', name: 'Banco Digio S.A.' },
    { code: '336', name: 'Banco C6 S.A.' },
    { code: '340', name: 'Super Pagamentos S.A.' },
    { code: '341', name: 'Itaú Unibanco S.A.' },
    { code: '342', name: 'Creditas SCD S.A.' },
    { code: '343', name: 'FFA SCMEPP Ltda.' },
    { code: '348', name: 'Banco XP S.A.' },
    { code: '349', name: 'AL5 S.A. CFI' },
    { code: '350', name: 'Crehnor Laranjeiras' },
    { code: '352', name: 'Toro CTVM Ltda.' },
    { code: '354', name: 'Necton Investimentos S.A.' },
    { code: '355', name: 'Ótimo SCD S.A.' },
    { code: '358', name: 'Midway S.A. CFI' },
    { code: '359', name: 'Zema CFI S.A.' },
    { code: '360', name: 'Trinus Capital DTVM S.A.' },
    { code: '362', name: 'Cielo S.A.' },
    { code: '363', name: 'Socopa SC Paulista S.A.' },
    { code: '364', name: 'Gerencianet S.A.' },
    { code: '365', name: 'Solidus S.A. CCVM' },
    { code: '366', name: 'Banco Société Générale Brasil S.A.' },
    { code: '367', name: 'Vitreo DTVM S.A.' },
    { code: '368', name: 'Banco CSF S.A.' },
    { code: '370', name: 'Banco Mizuho do Brasil S.A.' },
    { code: '371', name: 'Warren CVMC Ltda.' },
    { code: '373', name: 'UP.P SEP S.A.' },
    { code: '374', name: 'Realize CFI S.A.' },
    { code: '376', name: 'Banco J.P. Morgan S.A.' },
    { code: '377', name: 'BMS SCD S.A.' },
    { code: '378', name: 'BBC Leasing S.A.' },
    { code: '379', name: 'Cecm Cooperforte' },
    { code: '380', name: 'PicPay Serviços S.A.' },
    { code: '381', name: 'Banco Mercedes-Benz do Brasil S.A.' },
    { code: '382', name: 'Fiducia SCMEPP Ltda.' },
    { code: '383', name: 'Juno' },
    { code: '384', name: 'Global SCM Ltda.' },
    { code: '385', name: 'Cecm dos Trab.Port. da G.Vit' },
    { code: '386', name: 'Nu Financeira S.A. CFI' },
    { code: '387', name: 'Banco Toyota do Brasil S.A.' },
    { code: '389', name: 'Banco Mercantil do Brasil S.A.' },
    { code: '390', name: 'Banco GM S.A.' },
    { code: '391', name: 'CCR de Ibiam' },
    { code: '393', name: 'Banco Volkswagen S.A.' },
    { code: '394', name: 'Banco Bradesco Financiamentos S.A.' },
    { code: '396', name: 'Hub Pagamentos S.A.' },
    { code: '399', name: 'Kirton Bank S.A.' },
    { code: '400', name: 'Coop. de Créd. Rural de Ouro Sulcredi/Ouro' },
    { code: '401', name: 'Iugu IP S.A.' },
    { code: '403', name: 'Cora SCD S.A.' },
    { code: '404', name: 'Sumup SCD S.A.' },
    { code: '406', name: 'Accredito SCD S.A.' },
    { code: '407', name: 'Índigo Investimentos DTVM Ltda.' },
    { code: '408', name: 'Bônuscred SCD S.A.' },
    { code: '410', name: 'Planner Sociedade de Crédito Direto' },
    { code: '411', name: 'Via Certa Financiadora S.A.' },
    { code: '412', name: 'Banco Capital S.A.' },
    { code: '413', name: 'Banco BV S.A.' },
    { code: '414', name: 'Lend SCD S.A.' },
    { code: '416', name: 'Lamara SCD S.A.' },
    { code: '418', name: 'Zipdin SCD S.A.' },
    { code: '419', name: 'Numbrs SCD S.A.' },
    { code: '422', name: 'Banco Safra S.A.' },
    { code: '456', name: 'Banco MUFG Brasil S.A.' },
    { code: '473', name: 'Banco Caixa Geral Brasil S.A.' },
    { code: '477', name: 'Citibank N.A.' },
    { code: '479', name: 'Banco ItauBank S.A.' },
    { code: '487', name: 'Deutsche Bank S.A.' },
    { code: '492', name: 'ING Bank N.V.' },
    { code: '495', name: 'Banco de La Provincia de Buenos Aires' },
    { code: '505', name: 'Banco Credit Suisse Brasil S.A.' },
    { code: '545', name: 'Senso CCVM S.A.' },
    { code: '600', name: 'Banco Luso Brasileiro S.A.' },
    { code: '604', name: 'Banco Industrial do Brasil S.A.' },
    { code: '610', name: 'Banco VR S.A.' },
    { code: '611', name: 'Banco Paulista S.A.' },
    { code: '612', name: 'Banco Guanabara S.A.' },
    { code: '613', name: 'Omni Banco S.A.' },
    { code: '623', name: 'Banco Pan S.A.' },
    { code: '626', name: 'Banco C6 Consignado S.A.' },
    { code: '630', name: 'Banco Smartbank S.A.' },
    { code: '633', name: 'Banco Rendimento S.A.' },
    { code: '634', name: 'Banco Triângulo S.A.' },
    { code: '637', name: 'Banco Sofisa S.A.' },
    { code: '643', name: 'Banco Pine S.A.' },
    { code: '652', name: 'Itaú Unibanco Holding S.A.' },
    { code: '653', name: 'Banco Indusval S.A.' },
    { code: '654', name: 'Banco A.J.Renner S.A.' },
    { code: '655', name: 'Banco Votorantim S.A.' },
    { code: '707', name: 'Banco Daycoval S.A.' },
    { code: '712', name: 'Banco Ourinvest S.A.' },
    { code: '739', name: 'Banco Cetelem S.A.' },
    { code: '741', name: 'Banco Ribeirão Preto S.A.' },
    { code: '743', name: 'Banco Semear S.A.' },
    { code: '745', name: 'Banco Citibank S.A.' },
    { code: '746', name: 'Banco Modal S.A.' },
    { code: '747', name: 'Banco Rabobank International Brasil S.A.' },
    { code: '748', name: 'Sicredi S.A.' },
    { code: '751', name: 'Scotiabank Brasil S.A.' },
    { code: '752', name: 'Banco BNP Paribas Brasil S.A.' },
    { code: '753', name: 'Novo Banco Continental S.A.' },
    { code: '754', name: 'Banco Sistema S.A.' },
    { code: '755', name: 'Bank of America Merrill Lynch' },
    { code: '756', name: 'Sicoob' },
    { code: '757', name: 'Banco KEB Hana do Brasil S.A.' },
  ];

  const filteredBanks = useMemo(() => {
    if (!bankSearch.trim()) return banks;
    const search = bankSearch.toLowerCase();
    return banks.filter(bank => 
      bank.code.toLowerCase().includes(search) || 
      bank.name.toLowerCase().includes(search)
    );
  }, [bankSearch]);

  const pixKeyTypes = [
    { value: 'cpf', label: 'CPF' },
    { value: 'cnpj', label: 'CNPJ' },
    { value: 'email', label: 'E-mail' },
    { value: 'phone', label: 'Telefone' },
    { value: 'random', label: 'Chave Aleatória' },
  ];

  const getPixKeyPlaceholder = () => {
    switch (bankData.pixKeyType) {
      case 'cpf': return 'Digite seu CPF';
      case 'cnpj': return 'Digite seu CNPJ';
      case 'email': return 'Digite seu e-mail';
      case 'phone': return 'Digite seu telefone';
      case 'random': return 'Digite sua chave aleatória';
      default: return 'Digite sua chave PIX';
    }
  };

  const handleAddBankAccount = async () => {
    if (!bankData.bank || !bankData.pixKeyType || !bankData.pixKey.trim()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Save bank data to admin_settings
      const bankDataJson = JSON.stringify(bankData);
      const { error } = await supabase.rpc('update_user_setting', {
        setting_key: 'bank_account_data',
        setting_value: bankDataJson
      });

      if (error) throw error;

      setSavedBankData({ ...bankData });
      setHasBankAccount(true);
      setShowBankDialog(false);
      setBankData({ bank: '', pixKeyType: '', pixKey: '' });
      toast({
        title: "Conta adicionada!",
        description: "Sua conta bancária foi configurada com sucesso.",
      });
    } catch (error: any) {
      console.error('Error saving bank account:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar conta bancária.",
        variant: "destructive"
      });
    }
  };

  const loadBankAccountData = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_settings');
      if (error) throw error;
      
      const bankAccountSetting = data?.find((s: { key: string; value: string }) => s.key === 'bank_account_data');
      if (bankAccountSetting?.value) {
        const parsedData = JSON.parse(bankAccountSetting.value);
        setSavedBankData(parsedData);
        setHasBankAccount(true);
      }
    } catch (error) {
      console.error('Error loading bank account:', error);
    }
  };

  const handleRemoveBankAccount = async () => {
    try {
      // Remove from database
      const { error } = await supabase
        .from('admin_settings')
        .delete()
        .eq('key', 'bank_account_data')
        .eq('user_id', user?.id);

      if (error) throw error;

      setSavedBankData(null);
      setHasBankAccount(false);
      toast({
        title: "Conta removida",
        description: "Sua conta bancária foi removida.",
      });
    } catch (error) {
      console.error('Error removing bank account:', error);
    }
  };

  const getBankName = (code: string) => {
    const bank = banks.find(b => b.code === code);
    return bank ? `${bank.code} - ${bank.name}` : code;
  };

  const getPixTypeLabel = (type: string) => {
    const pixType = pixKeyTypes.find(t => t.value === type);
    return pixType ? pixType.label : type;
  };

  const handleCopyPixKey = () => {
    if (savedBankData?.pixKey) {
      navigator.clipboard.writeText(savedBankData.pixKey);
      toast({
        title: "Copiado!",
        description: "Chave PIX copiada para a área de transferência.",
      });
    }
  };

  const loadTransactions = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.rpc('get_user_transactions', {
        p_limit: 1000
      });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableBalance = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_available_balance');
      if (error) throw error;
      setAvailableBalance(data || 0);
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  };

  const loadWithdrawalHistory = async () => {
    try {
      // Always show only the logged-in user's own withdrawals
      // Admin global view is available in "Saque Global" section
      const { data, error } = await supabase.rpc('get_user_withdrawals', { p_limit: 50 });
      if (error) throw error;
      setWithdrawalHistory(data || []);
    } catch (error) {
      console.error('Error loading withdrawal history:', error);
    }
  };

  const loadUserFeeConfig = async () => {
    try {
      // Guard: Only query if user is authenticated
      if (!user?.id) {
        // Fallback to default fee config when no user
        const { data: defaultConfig } = await supabase
          .from('fee_configs')
          .select('id, name, pix_percentage, pix_fixed, saque_percentage, saque_fixed')
          .eq('is_default', true)
          .maybeSingle();
        if (defaultConfig) {
          setUserFeeConfig(defaultConfig);
        }
        return;
      }

      // First try to get user's specific fee config
      const { data: userSettings } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'user_fee_config')
        .eq('user_id', user.id)
        .maybeSingle();

      let feeConfigId = userSettings?.value;

      if (feeConfigId) {
        // Load specific fee config
        const { data: feeConfig } = await supabase
          .from('fee_configs')
          .select('id, name, pix_percentage, pix_fixed, saque_percentage, saque_fixed')
          .eq('id', feeConfigId)
          .maybeSingle();

        if (feeConfig) {
          setUserFeeConfig(feeConfig);
          return;
        }
      }

      // Fallback to default fee config
      const { data: defaultConfig } = await supabase
        .from('fee_configs')
        .select('id, name, pix_percentage, pix_fixed, saque_percentage, saque_fixed')
        .eq('is_default', true)
        .maybeSingle();

      if (defaultConfig) {
        setUserFeeConfig(defaultConfig);
      }
    } catch (error) {
      console.error('Error loading user fee config:', error);
    }
  };

  // Parallel data loading for maximum speed
  useEffect(() => {
    const loadAllData = async () => {
      if (!user?.id) return;
      
      // Load all data in parallel for faster initial render
      await Promise.all([
        loadTransactions(),
        loadAvailableBalance(),
        loadBankAccountData(),
        loadUserFeeConfig(),
        loadWithdrawalHistory()
      ]);
    };

    loadAllData();
    
    // Refresh interval for transactions and balance only
    const interval = setInterval(() => {
      Promise.all([loadTransactions(), loadAvailableBalance()]);
    }, 60000);
    
    return () => clearInterval(interval);
  }, [user?.id]);

  const stats = useMemo(() => {
    const paid = transactions.filter(tx => tx.status === 'paid');
    const pending = transactions.filter(tx => tx.status === 'generated');
    
    const totalReceived = paid.reduce((sum, tx) => sum + tx.amount, 0);
    const totalPending = pending.reduce((sum, tx) => sum + tx.amount, 0);
    const totalBalance = totalReceived + totalPending;

    return {
      totalBalance,
      totalReceived,
      totalPending,
    };
  }, [transactions]);

  // Calculate withdrawal fee based on user's fee config
  const calculateWithdrawalFee = (grossAmount: number) => {
    if (!userFeeConfig) return 0;
    const percentageFee = grossAmount * (userFeeConfig.saque_percentage / 100);
    const fixedFee = userFeeConfig.saque_fixed;
    return Math.round((percentageFee + fixedFee) * 100) / 100;
  };

  // Calculate net amount after fee deduction
  const calculateNetWithdrawal = (grossAmount: number) => {
    const fee = calculateWithdrawalFee(grossAmount);
    return Math.max(0, Math.round((grossAmount - fee) * 100) / 100);
  };

  const MINIMUM_WITHDRAWAL = 50;

  // Get current withdrawal preview values
  // User enters the gross amount (what's deducted from balance)
  // We calculate the net (what user receives after fees)
  const getWithdrawalPreview = () => {
    const grossAmount = parseFloat(withdrawAmount.replace(',', '.')) || 0;
    const fee = calculateWithdrawalFee(grossAmount);
    const netAmount = Math.max(0, Math.round((grossAmount - fee) * 100) / 100);
    return { grossAmount, fee, netAmount };
  };

  // Validate if withdrawal is valid (for button state)
  const isWithdrawalValid = useMemo(() => {
    const grossAmount = parseFloat(withdrawAmount.replace(',', '.')) || 0;
    if (isNaN(grossAmount) || grossAmount <= 0) return false;
    
    // Check if gross amount exceeds balance
    const roundedBalance = Math.round(availableBalance * 100) / 100;
    if (grossAmount > roundedBalance) return false;
    
    // Check minimum net amount after fees
    const fee = calculateWithdrawalFee(grossAmount);
    const netAmount = Math.max(0, grossAmount - fee);
    if (netAmount < MINIMUM_WITHDRAWAL) return false;
    
    return true;
  }, [withdrawAmount, availableBalance, userFeeConfig]);

  const handleRequestWithdrawal = () => {
    if (!savedBankData) {
      toast({
        title: "Conta não configurada",
        description: "Configure uma conta bancária antes de solicitar um saque.",
        variant: "destructive"
      });
      return;
    }

    const grossAmount = parseFloat(withdrawAmount.replace(',', '.'));
    const roundedBalance = Math.round(availableBalance * 100) / 100;
    
    if (isNaN(grossAmount) || grossAmount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor válido para o saque.",
        variant: "destructive"
      });
      return;
    }

    if (grossAmount > roundedBalance) {
      toast({
        title: "Saldo insuficiente",
        description: `O valor (${formatCurrency(grossAmount)}) excede o saldo disponível.`,
        variant: "destructive"
      });
      return;
    }

    // Check minimum net amount after fees
    const preview = getWithdrawalPreview();
    if (preview.netAmount < MINIMUM_WITHDRAWAL) {
      toast({
        title: "Valor mínimo não atingido",
        description: `O valor líquido após taxas deve ser no mínimo R$ 50,00. Você receberá: ${formatCurrency(preview.netAmount)}`,
        variant: "destructive"
      });
      return;
    }

    // Abre o diálogo de confirmação de senha
    setShowPasswordConfirmDialog(true);
  };

  const handleConfirmWithdrawal = async () => {
    if (!user?.email || !savedBankData) return;
    
    setIsVerifyingPassword(true);
    
    try {
      // Verificar senha re-autenticando o usuário
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: confirmPassword
      });
      
      if (authError) {
        toast({
          title: "Senha incorreta",
          description: "A senha informada está incorreta. Tente novamente.",
          variant: "destructive"
        });
        setConfirmPassword('');
        return;
      }
      
      // Senha correta - processar o saque
      await processWithdrawal();
      
    } catch (error: any) {
      toast({
        title: "Erro de verificação",
        description: error.message || "Erro ao verificar senha.",
        variant: "destructive"
      });
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const processWithdrawal = async () => {
    if (!savedBankData) return;
    
    setIsSubmittingWithdrawal(true);
    try {
      // The withdrawal amount stored is the NET amount (what user receives)
      const preview = getWithdrawalPreview();
      const netAmount = preview.netAmount;
      const bankName = banks.find(b => b.code === savedBankData.bank)?.name || savedBankData.bank;
      
      const { error } = await supabase.rpc('request_withdrawal', {
        p_amount: netAmount,
        p_bank_code: savedBankData.bank,
        p_bank_name: bankName,
        p_pix_key_type: savedBankData.pixKeyType,
        p_pix_key: withdrawPixKey || savedBankData.pixKey
      });

      if (error) throw error;

      toast({
        title: "Saque solicitado!",
        description: `Sua solicitação de ${formatCurrency(netAmount)} foi enviada para aprovação.`,
      });

      setShowPasswordConfirmDialog(false);
      setShowWithdrawDialog(false);
      setWithdrawAmount("");
      setWithdrawPixKey("");
      setConfirmPassword("");
      loadAvailableBalance();
      loadWithdrawalHistory();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao solicitar saque.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (hideValues) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleCopyPix = () => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      toast({
        title: "Copiado!",
        description: "Chave PIX copiada para a área de transferência.",
      });
    }
  };

  // Show instant skeleton during auth/permissions loading
  if (permissionsLoading) {
    return <QuickSkeleton />;
  }

  // Permission check - AFTER all hooks
  if (!isOwner && !hasPermission('can_view_financeiro')) {
    return <AccessDenied message="Você não tem permissão para acessar o Painel Financeiro." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Financeiro</h1>
      </div>

      <Tabs defaultValue="saldo" className="w-full">
        <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start h-auto p-0 gap-0">
          <TabsTrigger 
            value="saldo" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-4 py-3"
          >
            Saldo
          </TabsTrigger>
          <TabsTrigger 
            value="historico" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-4 py-3"
          >
            Histórico de saques
          </TabsTrigger>
          <TabsTrigger 
            value="taxas" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-4 py-3"
          >
            Taxas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saldo" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Saldo Disponível para Saque */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-primary font-medium">Saldo Disponível para Saque</span>
                </div>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-3">
                  {formatCurrency(availableBalance)}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Valor já descontando saques pendentes e aprovados
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setHideValues(!hideValues)}
                    className="gap-2"
                  >
                    {hideValues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    {hideValues ? 'Mostrar valores' : 'Esconder valores'}
                  </Button>
                  <Button 
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      if (!hasBankAccount || !savedBankData) {
                        toast({
                          title: "Conta não configurada",
                          description: "Configure uma conta bancária antes de solicitar um saque.",
                          variant: "destructive"
                        });
                        return;
                      }
                      if (availableBalance <= 0) {
                        toast({
                          title: "Saldo insuficiente",
                          description: "Você não possui saldo disponível para saque.",
                          variant: "destructive"
                        });
                        return;
                      }
                      setWithdrawPixKey(savedBankData.pixKey);
                      setShowWithdrawDialog(true);
                    }}
                  >
                    <Wallet className="h-4 w-4" />
                    Solicitar Saque
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Conta Bancária Principal */}
            <Card>
              <CardContent className="pt-6">
                <span className="text-primary font-medium">Conta Bancária Principal</span>
                
                {hasBankAccount && savedBankData ? (
                  <>
                    <div className="flex items-center gap-2 mt-4 mb-4">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{getBankName(savedBankData.bank)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>Conta PF</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">Chave PIX: {savedBankData.pixKey}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyPixKey}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>Tipo PIX: {getPixTypeLabel(savedBankData.pixKeyType)}</span>
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full mt-6 text-destructive hover:text-destructive"
                      onClick={() => {
                        setHasBankAccount(false);
                        setSavedBankData(null);
                        toast({
                          title: "Conta bancária removida",
                          description: "Configure uma nova conta para realizar saques.",
                        });
                      }}
                    >
                      Excluir conta bancária
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mt-4 mb-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <span className="text-yellow-600 dark:text-yellow-400">
                        Nenhuma conta bancária cadastrada. Configure uma conta para realizar saques.
                      </span>
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full gap-2"
                      onClick={() => setShowBankDialog(true)}
                    >
                      Configurar conta bancária
                      <Settings className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Aviso e Suporte ao Financeiro */}
          <Card className="mt-6 border-green-500/30 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-green-500/20">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-green-700 dark:text-green-400">
                      Suporte Financeiro
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Dúvidas sobre saques ou pagamentos? Entre em contato com nosso suporte financeiro.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Horário de atendimento: Seg a Sex, 9h às 18h
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2">
                      ⚠️ Saques em feriados e finais de semana podem ser aprovados conforme disponibilidade do suporte.
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="gap-2 border-green-500 text-green-600 hover:bg-green-500/10 whitespace-nowrap"
                  onClick={() => {
                    const whatsappNumber = "5564993151075"; // Número do financeiro
                    const message = encodeURIComponent("Olá! Preciso de suporte financeiro.");
                    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  Falar com Financeiro
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Dialog de Configurar Conta Bancária */}
          <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Configurar conta bancária</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Informações do Titular */}
                <Card className="border-0 shadow-none bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-primary font-medium mb-4">
                      <Building2 className="h-5 w-5" />
                      Informações do Titular
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Instituição Bancária</Label>
                      <Popover open={bankPopoverOpen} onOpenChange={setBankPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={bankPopoverOpen}
                            className="w-full justify-between font-normal"
                          >
                            {bankData.bank
                              ? banks.find((bank) => bank.code === bankData.bank)
                                ? `${bankData.bank} - ${banks.find((bank) => bank.code === bankData.bank)?.name}`
                                : "Selecione o banco"
                              : "Selecione o banco"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
                          <div className="p-2 border-b">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Buscar por código ou nome..."
                                value={bankSearch}
                                onChange={(e) => setBankSearch(e.target.value)}
                                className="pl-9"
                              />
                            </div>
                          </div>
                          <ScrollArea className="h-[200px]">
                            {filteredBanks.length === 0 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                Nenhum banco encontrado
                              </div>
                            ) : (
                              <div className="p-1">
                                {filteredBanks.map((bank) => (
                                  <div
                                    key={bank.code}
                                    className={cn(
                                      "flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer hover:bg-muted",
                                      bankData.bank === bank.code && "bg-muted"
                                    )}
                                    onClick={() => {
                                      setBankData(prev => ({ ...prev, bank: bank.code }));
                                      setBankPopoverOpen(false);
                                      setBankSearch('');
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "h-4 w-4",
                                        bankData.bank === bank.code ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {bank.code} - {bank.name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </CardContent>
                </Card>

                {/* Chave PIX */}
                <Card className="border-0 shadow-none bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-primary font-medium mb-4">
                      <CreditCard className="h-5 w-5" />
                      Chave PIX
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tipo de Chave PIX</Label>
                        <Select 
                          value={bankData.pixKeyType} 
                          onValueChange={(value) => setBankData(prev => ({ ...prev, pixKeyType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de chave PIX" />
                          </SelectTrigger>
                          <SelectContent>
                            {pixKeyTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Chave PIX</Label>
                        <Input 
                          placeholder={getPixKeyPlaceholder()}
                          value={bankData.pixKey}
                          onChange={(e) => setBankData(prev => ({ ...prev, pixKey: e.target.value }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowBankDialog(false);
                    setBankData({ bank: '', pixKeyType: '', pixKey: '' });
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleAddBankAccount}>
                  Adicionar Conta
                </Button>
              </div>
            </DialogContent>
          </Dialog>



          {/* Dialog de Solicitar Saque */}
          <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Solicitar Saque
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                  <p className="text-sm text-muted-foreground">Saldo disponível:</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(availableBalance)}
                  </p>
                </div>

                {savedBankData && (
                  <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                    <p className="text-sm text-muted-foreground">Conta de destino:</p>
                    <p className="font-medium">{getBankName(savedBankData.bank)}</p>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Chave PIX</Label>
                      <Input
                        value={withdrawPixKey}
                        onChange={(e) => setWithdrawPixKey(e.target.value)}
                        placeholder={savedBankData.pixKey}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Valor que deseja sacar</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      placeholder="0,00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Mínimo líquido: R$ 50,00 • Taxa: {userFeeConfig?.saque_fixed ? `R$ ${userFeeConfig.saque_fixed.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
                      {userFeeConfig?.saque_percentage ? ` + ${userFeeConfig.saque_percentage}%` : ''}
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => {
                        // Use the full balance as the gross amount
                        setWithdrawAmount(availableBalance.toFixed(2).replace('.', ','));
                      }}
                    >
                      Usar saldo total
                    </Button>
                  </div>
                </div>

                {/* Fee preview */}
                {withdrawAmount && parseFloat(withdrawAmount.replace(',', '.')) > 0 && (() => {
                  const preview = getWithdrawalPreview();
                  const exceedsBalance = preview.grossAmount > Math.round(availableBalance * 100) / 100;
                  return (
                    <div className={`p-3 rounded-lg space-y-2 ${exceedsBalance ? 'bg-destructive/10 border border-destructive/30' : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'}`}>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Será descontado do saldo:</span>
                        <span className={exceedsBalance ? 'text-destructive font-medium' : ''}>{formatCurrency(preview.grossAmount)}</span>
                      </div>
                      {exceedsBalance && (
                        <p className="text-xs text-destructive">Valor excede o saldo disponível</p>
                      )}
                      <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
                        <span>Taxa de saque:</span>
                        <span>- {formatCurrency(preview.fee)}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between font-medium">
                        <span>Você receberá:</span>
                        <span className="text-green-600 dark:text-green-400">
                          {formatCurrency(preview.netAmount)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowWithdrawDialog(false);
                    setWithdrawAmount("");
                    setWithdrawPixKey("");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleRequestWithdrawal}
                  disabled={isSubmittingWithdrawal || !isWithdrawalValid}
                >
                  {isSubmittingWithdrawal ? "Enviando..." : "Solicitar Saque"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog de confirmação de senha */}
          <Dialog open={showPasswordConfirmDialog} onOpenChange={(open) => {
            setShowPasswordConfirmDialog(open);
            if (!open) {
              setConfirmPassword('');
              setShowConfirmPassword(false);
            }
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  Confirme sua identidade
                </DialogTitle>
                <DialogDescription>
                  Para sua segurança, digite sua senha de login para confirmar o saque.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Resumo do saque */}
                <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Você receberá:</span>
                    <span className="font-medium text-green-600">{formatCurrency(parseFloat(withdrawAmount.replace(',', '.')) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Conta:</span>
                    <span>{banks.find(b => b.code === savedBankData?.bank)?.name || savedBankData?.bank}</span>
                  </div>
                </div>
                
                {/* Campo de senha */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Senha</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Digite sua senha de login"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && confirmPassword) {
                          handleConfirmWithdrawal();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordConfirmDialog(false);
                    setConfirmPassword('');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmWithdrawal}
                  disabled={isVerifyingPassword || !confirmPassword}
                >
                  {isVerifyingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    "Confirmar Saque"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Histórico de Saques
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadWithdrawalHistory}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Atualizar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {withdrawalHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum saque realizado ainda.</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Valor</TableHead>
                        <TableHead className="hidden sm:table-cell">Banco/PIX</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Data</TableHead>
                        <TableHead className="hidden lg:table-cell">Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawalHistory
                        .slice((withdrawalPage - 1) * WITHDRAWALS_PER_PAGE, withdrawalPage * WITHDRAWALS_PER_PAGE)
                        .map((withdrawal) => (
                          <TableRow key={withdrawal.id}>
                            <TableCell className="font-medium">
                              {formatCurrency(withdrawal.amount)}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                              <span className="block truncate max-w-[150px]">
                                {withdrawal.bank_name}
                              </span>
                              <span className="block truncate max-w-[150px] text-xs">
                                {withdrawal.pix_key.length > 20 ? `${withdrawal.pix_key.substring(0, 20)}...` : withdrawal.pix_key}
                              </span>
                            </TableCell>
                            <TableCell>
                              {withdrawal.status === 'pending' && (
                                <Badge variant="outline" className="text-yellow-600 border-yellow-600 text-xs">
                                  Pendente
                                </Badge>
                              )}
                              {withdrawal.status === 'approved' && (
                                <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                                  Aprovado
                                </Badge>
                              )}
                              {withdrawal.status === 'rejected' && (
                                <Badge variant="outline" className="text-destructive border-destructive text-xs">
                                  Rejeitado
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {new Date(withdrawal.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                              {withdrawal.rejection_reason || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  
                  {/* Pagination */}
                  {withdrawalHistory.length > WITHDRAWALS_PER_PAGE && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        Página {withdrawalPage} de {Math.ceil(withdrawalHistory.length / WITHDRAWALS_PER_PAGE)}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWithdrawalPage(p => Math.max(1, p - 1))}
                          disabled={withdrawalPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWithdrawalPage(p => Math.min(Math.ceil(withdrawalHistory.length / WITHDRAWALS_PER_PAGE), p + 1))}
                          disabled={withdrawalPage >= Math.ceil(withdrawalHistory.length / WITHDRAWALS_PER_PAGE)}
                        >
                          Próxima
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxas" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-primary" />
                Taxas
                {userFeeConfig && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {userFeeConfig.name}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">PIX</p>
                    <p className="text-sm text-muted-foreground">Taxa por transação</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {userFeeConfig ? `${userFeeConfig.pix_percentage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%` : '—'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      + R$ {userFeeConfig ? userFeeConfig.pix_fixed.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">Taxa de Saque</p>
                    <p className="text-sm text-muted-foreground">Por saque realizado</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {userFeeConfig ? `${userFeeConfig.saque_percentage.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}%` : '—'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      + R$ {userFeeConfig ? userFeeConfig.saque_fixed.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default AdminFinanceiro;
