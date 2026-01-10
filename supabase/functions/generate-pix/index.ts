import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for, x-real-ip',
};

// SpedPay removed - using Valorion, Inter, and Ativus only

// Default Rate Limit Configuration (can be overridden by database settings)
const DEFAULT_RATE_LIMIT_CONFIG = {
  maxUnpaidPix: 2,           // Máximo 2 PIX não pagos (default)
  windowHours: 36,           // Janela de 36 horas
  cooldownSeconds: 30,       // 30 segundos entre gerações
};

// Random names for anonymous donations
const RANDOM_NAMES = [
  'João Pedro Silva', 'Carlos Eduardo Santos', 'Rafael Henrique Oliveira', 
  'Lucas Gabriel Costa', 'Fernando Augusto Souza', 'Marcos Vinicius Lima',
  'Bruno Felipe Alves', 'Gustavo Henrique Rocha', 'Diego Rodrigues Ferreira',
  'André Luis Gomes', 'Thiago Martins Barbosa', 'Ricardo Almeida Pereira',
  'Paulo Roberto Nascimento', 'Matheus Henrique Carvalho', 'Leonardo Silva Ribeiro',
  'Maria Eduarda Santos', 'Ana Carolina Oliveira', 'Juliana Cristina Costa',
  'Camila Fernanda Souza', 'Beatriz Helena Lima', 'Larissa Cristiane Alves',
  'Patricia Regina Rocha', 'Fernanda Aparecida Ferreira', 'Amanda Cristina Gomes',
  'Gabriela Santos Martins', 'Mariana Silva Barbosa', 'Carolina Almeida Pereira',
  'Isabela Nascimento Costa', 'Leticia Carvalho Ribeiro', 'Vanessa Lima Santos'
];

// Random email domains
const EMAIL_DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br', 'uol.com.br'];

const getRandomName = () => RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];

const getRandomEmail = (name: string) => {
  const domain = EMAIL_DOMAINS[Math.floor(Math.random() * EMAIL_DOMAINS.length)];
  const cleanName = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\s+/g, '.')
    .replace(/[^a-z.]/g, '');
  const randomNum = Math.floor(Math.random() * 999) + 1;
  return `${cleanName}${randomNum}@${domain}`;
};

const getRandomPhone = () => {
  const ddds = ['11', '21', '31', '41', '51', '61', '71', '81', '85', '62', '27', '48'];
  const ddd = ddds[Math.floor(Math.random() * ddds.length)];
  const number = Math.floor(Math.random() * 900000000) + 100000000;
  return `${ddd}9${number.toString().slice(0, 8)}`;
};

interface OrderBumpData {
  id: string;
  title: string;
  price: number;
  productId?: string;
}

interface GeneratePixRequest {
  amount: number;
  customerName?: string;
  customerEmail?: string;
  customerDocument?: string;
  customerPhone?: string;
  customerCpf?: string;
  customerBirthdate?: string;
  customerAddress?: {
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  userId?: string;
  popupModel?: string;
  fingerprint?: string;
  productName?: string;
  offerId?: string;
  utmParams?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };
  orderBumps?: OrderBumpData[];
}

interface FeeConfig {
  pix_percentage: number;
  pix_fixed: number;
}

interface RetryConfig {
  enabled: boolean;
  max_retries: number;
  acquirer_order: string[];
  delay_between_retries_ms: number;
}

interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
  unpaidCount?: number;
}

interface RateLimitConfig {
  enabled: boolean;
  maxUnpaidPix: number;
  windowHours: number;
  cooldownSeconds: number;
}

interface AcquirerHealthStatus {
  acquirer: string;
  is_healthy: boolean;
  avg_response_time_ms: number;
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Check if seller has bypass_antifraud enabled by admin
async function checkSellerBypassAntifraud(userId: string | undefined): Promise<boolean> {
  if (!userId) {
    console.log('[BYPASS-ANTIFRAUDE] No userId provided, bypass not applicable');
    return false;
  }
  
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('bypass_antifraud')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('[BYPASS-ANTIFRAUDE] Error checking bypass status:', error);
      return false;
    }
    
    const bypassEnabled = data?.bypass_antifraud === true;
    console.log(`[BYPASS-ANTIFRAUDE] User ${userId.substring(0, 8)}... bypass_antifraud = ${bypassEnabled}`);
    
    return bypassEnabled;
  } catch (err) {
    console.error('[BYPASS-ANTIFRAUDE] Exception checking bypass status:', err);
    return false;
  }
}

// Get rate limit config from database or use defaults
async function getRateLimitConfig(): Promise<RateLimitConfig> {
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('key, value')
      .is('user_id', null)
      .in('key', [
        'rate_limit_enabled',
        'rate_limit_max_unpaid',
        'rate_limit_window_hours',
        'rate_limit_cooldown_seconds'
      ]);

    if (error || !data || data.length === 0) {
      console.log('[RATE-LIMIT] Using default config');
      return {
        enabled: true,
        maxUnpaidPix: DEFAULT_RATE_LIMIT_CONFIG.maxUnpaidPix,
        windowHours: DEFAULT_RATE_LIMIT_CONFIG.windowHours,
        cooldownSeconds: DEFAULT_RATE_LIMIT_CONFIG.cooldownSeconds,
      };
    }

    const config: RateLimitConfig = {
      enabled: data.find(d => d.key === 'rate_limit_enabled')?.value !== 'false',
      maxUnpaidPix: parseInt(data.find(d => d.key === 'rate_limit_max_unpaid')?.value || String(DEFAULT_RATE_LIMIT_CONFIG.maxUnpaidPix)),
      windowHours: parseInt(data.find(d => d.key === 'rate_limit_window_hours')?.value || String(DEFAULT_RATE_LIMIT_CONFIG.windowHours)),
      cooldownSeconds: parseInt(data.find(d => d.key === 'rate_limit_cooldown_seconds')?.value || String(DEFAULT_RATE_LIMIT_CONFIG.cooldownSeconds)),
    };

    console.log(`[RATE-LIMIT] Config loaded: enabled=${config.enabled}, maxUnpaid=${config.maxUnpaidPix}, window=${config.windowHours}h, cooldown=${config.cooldownSeconds}s`);
    return config;
  } catch (err) {
    console.error('[RATE-LIMIT] Error loading config:', err);
    return {
      enabled: true,
      maxUnpaidPix: DEFAULT_RATE_LIMIT_CONFIG.maxUnpaidPix,
      windowHours: DEFAULT_RATE_LIMIT_CONFIG.windowHours,
      cooldownSeconds: DEFAULT_RATE_LIMIT_CONFIG.cooldownSeconds,
    };
  }
}

// Log rate limit event to database
async function logRateLimitEvent(
  fingerprint: string | undefined, 
  clientIp: string | undefined, 
  eventType: 'blocked' | 'cooldown',
  reason: string,
  unpaidCount?: number
): Promise<void> {
  const supabase = getSupabaseClient();
  
  try {
    await supabase
      .from('rate_limit_events')
      .insert({
        fingerprint_hash: fingerprint || clientIp || 'unknown',
        ip_address: clientIp || null,
        event_type: eventType,
        reason: reason,
        unpaid_count: unpaidCount || null,
      });
    console.log(`[RATE-LIMIT] Event logged: ${eventType} - ${reason}`);
  } catch (err) {
    console.error('[RATE-LIMIT] Error logging event:', err);
  }
}

// Check single identifier (fingerprint or IP) for rate limiting
async function checkSingleIdentifier(
  supabase: ReturnType<typeof getSupabaseClient>,
  identifier: string,
  clientIp: string | undefined,
  config: RateLimitConfig,
  now: Date,
  identifierType: 'fingerprint' | 'ip'
): Promise<RateLimitResult> {
  const windowStart = new Date(now.getTime() - (config.windowHours * 60 * 60 * 1000));

  try {
    // Get rate limit record for this identifier
    const { data: rateLimitRecord, error: fetchError } = await supabase
      .from('pix_rate_limits')
      .select('*')
      .eq('fingerprint_hash', identifier)
      .maybeSingle();

    if (fetchError) {
      console.error(`[RATE-LIMIT] Error fetching ${identifierType} rate limit:`, fetchError);
      return { allowed: true };
    }

    // If no record exists, this is a new device/IP
    if (!rateLimitRecord) {
      console.log(`[RATE-LIMIT] New ${identifierType}, allowing`);
      return { allowed: true };
    }

    // Check if whitelisted - skip ALL rate limit checks
    if (rateLimitRecord.is_whitelisted === true) {
      console.log(`[RATE-LIMIT] ${identifierType} is WHITELISTED, allowing without limits`);
      return { allowed: true };
    }

    // Check if blocked
    if (rateLimitRecord.blocked_until && new Date(rateLimitRecord.blocked_until) > now) {
      const retryAfter = Math.ceil((new Date(rateLimitRecord.blocked_until).getTime() - now.getTime()) / 1000);
      console.log(`[RATE-LIMIT] ${identifierType} is blocked until ${rateLimitRecord.blocked_until}, retry after ${retryAfter}s`);
      
      await logRateLimitEvent(identifier, clientIp, 'blocked', `${identifierType}_blocked`, rateLimitRecord.unpaid_count);
      
      return {
        allowed: false,
        reason: 'BLOCKED',
        retryAfter,
        unpaidCount: rateLimitRecord.unpaid_count
      };
    }

    // Check cooldown between generations
    if (rateLimitRecord.last_generation_at) {
      const lastGen = new Date(rateLimitRecord.last_generation_at);
      const secondsSinceLastGen = (now.getTime() - lastGen.getTime()) / 1000;
      
      if (secondsSinceLastGen < config.cooldownSeconds) {
        const retryAfter = Math.ceil(config.cooldownSeconds - secondsSinceLastGen);
        console.log(`[RATE-LIMIT] ${identifierType} cooldown active, retry after ${retryAfter}s`);
        
        await logRateLimitEvent(identifier, clientIp, 'cooldown', `${identifierType}_cooldown`, rateLimitRecord.unpaid_count);
        
        return {
          allowed: false,
          reason: 'COOLDOWN',
          retryAfter,
          unpaidCount: rateLimitRecord.unpaid_count
        };
      }
    }

    // Check if record is within the time window
    const recordUpdated = new Date(rateLimitRecord.updated_at);
    if (recordUpdated < windowStart) {
      console.log(`[RATE-LIMIT] ${identifierType} outside window, resetting count`);
      await supabase
        .from('pix_rate_limits')
        .update({ 
          unpaid_count: 0, 
          updated_at: now.toISOString(),
          blocked_until: null 
        })
        .eq('id', rateLimitRecord.id);
      
      return { allowed: true, unpaidCount: 0 };
    }

    // Check unpaid count limit
    if (rateLimitRecord.unpaid_count >= config.maxUnpaidPix) {
      const blockedUntil = new Date(now.getTime() + (config.windowHours * 60 * 60 * 1000));
      
      await supabase
        .from('pix_rate_limits')
        .update({ blocked_until: blockedUntil.toISOString() })
        .eq('id', rateLimitRecord.id);
      
      const retryAfter = config.windowHours * 60 * 60;
      console.log(`[RATE-LIMIT] ${identifierType} max unpaid PIX reached (${rateLimitRecord.unpaid_count}), blocking for ${config.windowHours}h`);
      
      await logRateLimitEvent(identifier, clientIp, 'blocked', `${identifierType}_max_unpaid`, rateLimitRecord.unpaid_count);
      
      return {
        allowed: false,
        reason: 'MAX_UNPAID',
        retryAfter,
        unpaidCount: rateLimitRecord.unpaid_count
      };
    }

    console.log(`[RATE-LIMIT] ${identifierType} allowed. Current unpaid count: ${rateLimitRecord.unpaid_count}`);
    return { allowed: true, unpaidCount: rateLimitRecord.unpaid_count };

  } catch (err) {
    console.error(`[RATE-LIMIT] Unexpected error checking ${identifierType}:`, err);
    return { allowed: true };
  }
}

// Check rate limit for BOTH fingerprint AND IP (combined security)
async function checkRateLimit(fingerprint: string | undefined, clientIp: string | undefined, config: RateLimitConfig): Promise<RateLimitResult> {
  // If rate limiting is disabled, allow all
  if (!config.enabled) {
    console.log('[RATE-LIMIT] Rate limiting disabled, allowing request');
    return { allowed: true };
  }

  // If no identifiers available, allow
  if (!fingerprint && !clientIp) {
    console.log('[RATE-LIMIT] No fingerprint or IP available, allowing request');
    return { allowed: true };
  }

  const supabase = getSupabaseClient();
  const now = new Date();

  // Check FINGERPRINT if available
  if (fingerprint) {
    console.log(`[RATE-LIMIT] Checking fingerprint: ${fingerprint.substring(0, 8)}...`);
    const fingerprintResult = await checkSingleIdentifier(supabase, fingerprint, clientIp, config, now, 'fingerprint');
    if (!fingerprintResult.allowed) {
      console.log('[RATE-LIMIT] BLOCKED by fingerprint check');
      return fingerprintResult;
    }
  }

  // Check IP if available AND different from fingerprint
  if (clientIp && clientIp !== fingerprint) {
    console.log(`[RATE-LIMIT] Checking IP: ${clientIp}`);
    const ipResult = await checkSingleIdentifier(supabase, clientIp, clientIp, config, now, 'ip');
    if (!ipResult.allowed) {
      console.log('[RATE-LIMIT] BLOCKED by IP check');
      return ipResult;
    }
  }

  console.log('[RATE-LIMIT] Both fingerprint and IP checks passed');
  return { allowed: true };
}

// Update single rate limit record
async function updateSingleRateLimitRecord(
  supabase: ReturnType<typeof getSupabaseClient>,
  identifier: string,
  clientIp: string | undefined,
  config: RateLimitConfig,
  now: string,
  identifierType: 'fingerprint' | 'ip'
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('pix_rate_limits')
      .select('id, unpaid_count')
      .eq('fingerprint_hash', identifier)
      .maybeSingle();

    if (existing) {
      const newUnpaidCount = existing.unpaid_count + 1;
      
      // Check if reached limit NOW - block immediately
      const shouldBlock = config.enabled && newUnpaidCount >= config.maxUnpaidPix;
      const blockedUntil = shouldBlock 
        ? new Date(Date.now() + (config.windowHours * 60 * 60 * 1000)).toISOString()
        : null;
      
      const { error: updateError } = await supabase
        .from('pix_rate_limits')
        .update({
          unpaid_count: newUnpaidCount,
          last_generation_at: now,
          updated_at: now,
          ip_address: identifierType === 'ip' ? identifier : (clientIp || null),
          blocked_until: blockedUntil,
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error(`[RATE-LIMIT] Error updating ${identifierType} record:`, updateError);
      } else {
        console.log(`[RATE-LIMIT] Updated ${identifierType} unpaid_count to ${newUnpaidCount}: ${identifier.substring(0, 8)}...`);
        
        if (shouldBlock) {
          await logRateLimitEvent(identifier, clientIp, 'blocked', `${identifierType}_max_unpaid_immediate`, newUnpaidCount);
          console.log(`[RATE-LIMIT] ${identifierType} BLOCKED IMMEDIATELY after reaching ${newUnpaidCount} unpaid PIX`);
        }
      }
    } else {
      const { error: insertError } = await supabase
        .from('pix_rate_limits')
        .insert({
          fingerprint_hash: identifier,
          ip_address: identifierType === 'ip' ? identifier : (clientIp || null),
          unpaid_count: 1,
          last_generation_at: now,
          updated_at: now,
        });

      if (insertError) {
        console.error(`[RATE-LIMIT] Error inserting ${identifierType} record:`, insertError);
      } else {
        console.log(`[RATE-LIMIT] Created new ${identifierType} rate limit record: ${identifier.substring(0, 8)}...`);
      }
    }
  } catch (err) {
    console.error(`[RATE-LIMIT] Error updating ${identifierType} record:`, err);
  }
}

// Update rate limit records for BOTH fingerprint AND IP
async function updateRateLimitRecord(fingerprint: string | undefined, clientIp: string | undefined): Promise<void> {
  if (!fingerprint && !clientIp) return;

  const supabase = getSupabaseClient();
  const config = await getRateLimitConfig();
  const now = new Date().toISOString();

  // Update FINGERPRINT record if available
  if (fingerprint) {
    await updateSingleRateLimitRecord(supabase, fingerprint, clientIp, config, now, 'fingerprint');
  }

  // Update IP record if available AND different from fingerprint
  if (clientIp && clientIp !== fingerprint) {
    await updateSingleRateLimitRecord(supabase, clientIp, clientIp, config, now, 'ip');
  }
}

// Get user fee config or default
async function getUserFeeConfig(userId?: string): Promise<FeeConfig | null> {
  const supabase = getSupabaseClient();
  
  // First try to get user-specific fee config
  if (userId) {
    const { data: userSetting } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'user_fee_config')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (userSetting?.value) {
      const { data: feeConfig } = await supabase
        .from('fee_configs')
        .select('pix_percentage, pix_fixed')
        .eq('id', userSetting.value)
        .maybeSingle();
      
      if (feeConfig) {
        console.log('Using user-specific fee config:', feeConfig);
        return feeConfig as FeeConfig;
      }
    }
  }
  
  // Fallback to default fee config
  const { data: defaultConfig } = await supabase
    .from('fee_configs')
    .select('pix_percentage, pix_fixed')
    .eq('is_default', true)
    .maybeSingle();
  
  if (defaultConfig) {
    console.log('Using default fee config:', defaultConfig);
    return defaultConfig as FeeConfig;
  }
  
  console.log('No fee config found');
  return null;
}

// Get retry configuration for PIX from retry_flow_steps table
async function getRetryConfig(): Promise<RetryConfig | null> {
  const supabase = getSupabaseClient();
  
  // Fetch active steps from retry_flow_steps table (the table the frontend uses)
  const { data: steps, error } = await supabase
    .from('retry_flow_steps')
    .select('acquirer, step_order')
    .eq('payment_method', 'pix')
    .eq('is_active', true)
    .order('step_order', { ascending: true });
  
  if (error) {
    console.log('[RETRY] Error fetching retry steps:', error);
    return null;
  }
  
  if (!steps || steps.length === 0) {
    console.log('[RETRY] No active retry steps configured');
    return null;
  }
  
  // Build acquirer_order array from steps
  const acquirerOrder = steps.map(s => s.acquirer);
  
  // Create config from steps - each acquirer gets 2 attempts before moving to next
  const config: RetryConfig = {
    enabled: true,
    max_retries: steps.length * 2, // 2 attempts per acquirer
    acquirer_order: acquirerOrder,
    delay_between_retries_ms: 1000 // 1 second delay between retries
  };
  
  console.log(`[RETRY] Config loaded from retry_flow_steps: acquirers=${acquirerOrder.join(' -> ')}, max_retries=${config.max_retries}`);
  return config;
}

// ============= HEALTH CHECK PROATIVO =============
// Get healthy acquirers from cache (consulta instantânea)
async function getHealthyAcquirers(): Promise<AcquirerHealthStatus[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('acquirer_health_status')
    .select('acquirer, is_healthy, avg_response_time_ms')
    .eq('is_healthy', true)
    .order('avg_response_time_ms', { ascending: true });
  
  if (error) {
    console.log('[HEALTH] Error fetching healthy acquirers:', error);
    return [];
  }
  
  console.log(`[HEALTH] ${data?.length || 0} healthy acquirers found`);
  return (data as AcquirerHealthStatus[]) || [];
}

// Check if specific acquirer is healthy
async function isAcquirerHealthy(acquirer: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('acquirer_health_status')
    .select('is_healthy')
    .eq('acquirer', acquirer)
    .maybeSingle();
  
  if (error || !data) {
    console.log(`[HEALTH] Could not check health for ${acquirer}, assuming healthy`);
    return true; // Default to healthy if can't check
  }
  
  return data.is_healthy;
}

// Get primary acquirer from pix_acquirer setting
async function getPrimaryAcquirer(): Promise<string | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'pix_acquirer')
    .is('user_id', null)
    .maybeSingle();
  
  if (error || !data?.value) {
    console.log('[HEALTH] No primary acquirer configured');
    return null;
  }
  
  console.log(`[HEALTH] Primary acquirer: ${data.value}`);
  return data.value;
}
// ================================================

async function isAcquirerEnabled(acquirer: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', `${acquirer}_enabled`)
    .is('user_id', null)
    .maybeSingle();
  
  if (error) {
    console.log(`Error checking if ${acquirer} is enabled:`, error);
    return true; // Default to enabled if error
  }
  
  // Default to enabled (true) if not set, disabled only if explicitly 'false'
  const enabled = data?.value !== 'false';
  console.log(`Acquirer ${acquirer} enabled:`, enabled);
  return enabled;
}

async function getDefaultAcquirer(): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'default_acquirer')
    .is('user_id', null)
    .maybeSingle();
  
  if (error || !data?.value) {
    console.log('Default acquirer not configured, using valorion');
    return 'valorion';
  }
  
  console.log('Platform default acquirer:', data.value);
  return data.value;
}

async function getUserAcquirer(userId?: string): Promise<string> {
  // First, get the platform default acquirer
  const defaultAcquirer = await getDefaultAcquirer();
  
  if (!userId) {
    console.log('No userId, using platform default acquirer:', defaultAcquirer);
    return defaultAcquirer;
  }
  
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'user_acquirer')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error || !data?.value) {
    console.log('User acquirer not configured, using platform default:', defaultAcquirer);
    return defaultAcquirer;
  }
  
  console.log('User acquirer:', data.value);
  return data.value;
}

// SpedPay functions removed - using Valorion, Inter, and Ativus only

async function getProductNameFromDatabase(userId?: string, popupModel?: string): Promise<string> {
  const supabase = getSupabaseClient();
  const DEFAULT_PRODUCT_NAME = 'Anônimo';
  
  // First try to get product_name from checkout_offers using userId + popup_model
  if (userId && popupModel) {
    const { data: offerData, error: offerError } = await supabase
      .from('checkout_offers')
      .select('product_name')
      .eq('user_id', userId)
      .eq('popup_model', popupModel)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (!offerError && offerData?.product_name && offerData.product_name.trim() !== '') {
      console.log('Using product name from checkout offer:', offerData.product_name);
      return offerData.product_name;
    }
  }
  
  // Fallback: try to get any checkout offer from this user with product_name
  if (userId) {
    const { data: anyOfferData, error: anyOfferError } = await supabase
      .from('checkout_offers')
      .select('product_name')
      .eq('user_id', userId)
      .not('product_name', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (!anyOfferError && anyOfferData?.product_name && anyOfferData.product_name.trim() !== '') {
      console.log('Using product name from user checkout offer (fallback):', anyOfferData.product_name);
      return anyOfferData.product_name;
    }
  }
  
  console.log('Using default product name:', DEFAULT_PRODUCT_NAME);
  return DEFAULT_PRODUCT_NAME;
}

// ============= BRCODE PIX VALIDATION =============
// Validates BRCode EMV structure to detect invalid QR codes
interface BRCodeValidationResult {
  valid: boolean;
  error?: string;
}

function validateBRCode(pixCode: string): BRCodeValidationResult {
  // Basic length validation
  if (!pixCode || pixCode.length < 50) {
    return { valid: false, error: 'BRCode muito curto (mínimo 50 caracteres)' };
  }
  
  if (pixCode.length > 512) {
    return { valid: false, error: 'BRCode muito longo (máximo 512 caracteres)' };
  }
  
  // BRCodes do Inter com URL dinâmica são SEMPRE válidos (mesmo com 5901*)
  // O 5901* é apenas nome do beneficiário abreviado, não afeta o pagamento
  if (pixCode.includes('spi-qrcode.bancointer.com.br') || pixCode.includes('interag.com.br')) {
    console.log('[BRCODE-VALIDATION] ✅ BRCode do Inter detectado - aceito automaticamente');
    return { valid: true };
  }
  
  // BRCodes do Valorion/Microcashif usam *** no campo 62 - é formato válido deles
  // O 62070503*** é padrão do Microcashif para referência do pagamento
  if (pixCode.includes('qrcode.microcashif.com.br') || pixCode.includes('62070503***')) {
    console.log('[BRCODE-VALIDATION] ✅ BRCode do Valorion/Microcashif detectado - aceito automaticamente');
    return { valid: true };
  }
  
  // Check for placeholder characters (apenas se não for formato conhecido)
  if (pixCode.includes('???') || pixCode.includes('###')) {
    return { valid: false, error: 'BRCode contém caracteres de placeholder (???,###)' };
  }
  
  // BRCode EMV must start with "00" (Payload Format Indicator)
  if (!pixCode.startsWith('00')) {
    return { valid: false, error: 'BRCode não começa com Payload Format Indicator (00)' };
  }
  
  // Verify CRC16 exists at the end (field 63 with tag "6304")
  const crcIndex = pixCode.lastIndexOf('6304');
  if (crcIndex === -1) {
    return { valid: false, error: 'BRCode sem CRC16 (campo 6304)' };
  }
  
  // CRC16 must be 4 hexadecimal characters after "6304"
  const crc = pixCode.substring(crcIndex + 4);
  if (crc.length !== 4) {
    return { valid: false, error: `CRC16 com tamanho incorreto (${crc.length} != 4)` };
  }
  
  if (!/^[0-9A-Fa-f]{4}$/.test(crc)) {
    return { valid: false, error: `CRC16 contém caracteres inválidos: ${crc}` };
  }
  
  // Verify presence of receiver info (field 26 for static or 27 for dynamic PIX)
  const hasReceiverInfo = pixCode.includes('26') || pixCode.includes('27');
  if (!hasReceiverInfo) {
    return { valid: false, error: 'BRCode sem informação do recebedor (campos 26/27)' };
  }
  
  // Check for BR.GOV.BCB.PIX identifier
  if (!pixCode.includes('BR.GOV.BCB.PIX') && !pixCode.includes('br.gov.bcb.pix')) {
    return { valid: false, error: 'BRCode sem identificador PIX do BCB' };
  }
  
  // All validations passed
  return { valid: true };
}
// ================================================

// Log API monitoring event
async function logApiEvent(
  acquirer: string, 
  eventType: 'success' | 'failure' | 'retry' | 'circuit_open' | 'circuit_close' | 'invalid_brcode',
  responseTimeMs?: number,
  errorMessage?: string,
  retryAttempt?: number
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    await supabase.from('api_monitoring_events').insert({
      acquirer,
      event_type: eventType,
      response_time_ms: responseTimeMs || null,
      error_message: errorMessage || null,
      retry_attempt: retryAttempt || null
    });
  } catch (err) {
    console.error('Error logging API event:', err);
  }
}

interface CustomerData {
  phone?: string;
  cpf?: string;
  birthdate?: string;
  address?: {
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
}

async function logPixGenerated(
  amount: number, 
  txid: string, 
  pixCode: string, 
  donorName: string, 
  utmData?: Record<string, any>, 
  productName?: string, 
  userId?: string, 
  popupModel?: string,
  feePercentage?: number,
  feeFixed?: number,
  acquirer: string = 'ativus',
  fingerprintHash?: string,
  clientIp?: string,
  donorEmail?: string,
  customerData?: CustomerData,
  offerId?: string
): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    
    // Insert with fingerprint, IP, customer data, and offer_id
    const { data, error } = await supabase
      .from('pix_transactions')
      .insert({
        amount,
        txid,
        pix_code: pixCode,
        donor_name: donorName,
        donor_email: donorEmail || null,
        donor_phone: customerData?.phone || null,
        donor_cpf: customerData?.cpf || null,
        donor_birthdate: customerData?.birthdate || null,
        donor_cep: customerData?.address?.cep || null,
        donor_street: customerData?.address?.street || null,
        donor_number: customerData?.address?.number || null,
        donor_complement: customerData?.address?.complement || null,
        donor_neighborhood: customerData?.address?.neighborhood || null,
        donor_city: customerData?.address?.city || null,
        donor_state: customerData?.address?.state || null,
        status: 'generated',
        utm_data: utmData || null,
        product_name: productName || null,
        user_id: userId || null,
        popup_model: popupModel || null,
        fee_percentage: feePercentage ?? null,
        fee_fixed: feeFixed ?? null,
        acquirer,
        fingerprint_hash: fingerprintHash || null,
        client_ip: clientIp || null,
        offer_id: offerId || null,
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error logging PIX transaction:', error);
      return null;
    } else {
      console.log('PIX transaction logged with ID:', data.id, 'Offer ID:', offerId || 'none');
      return data.id as string;
    }
  } catch (err) {
    console.error('Error in logPixGenerated:', err);
    return null;
  }
}

// Helper delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Check if test mode is enabled for a specific acquirer
async function checkTestMode(acquirer: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .is('user_id', null)
      .eq('key', 'retry_test_fail_acquirer')
      .maybeSingle();
    
    if (error || !data) {
      return false;
    }
    
    const shouldFail = data.value === acquirer;
    if (shouldFail) {
      console.log(`[TEST MODE] Forçando falha no ${acquirer} para teste de retry`);
    }
    return shouldFail;
  } catch (err) {
    console.error('[TEST MODE] Error checking test mode:', err);
    return false;
  }
}

// Call specific acquirer
async function callAcquirer(
  acquirer: string,
  params: {
    amount: number;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerCpf?: string;
    customerBirthdate?: string;
    customerAddress?: {
      cep?: string;
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
    };
    utmParams?: Record<string, any>;
    userId?: string;
    popupModel?: string;
    productName: string;
    feeConfig: FeeConfig | null;
    fingerprint?: string;
    clientIp?: string;
    orderBumps?: OrderBumpData[];
    offerId?: string;
  }
): Promise<{ success: boolean; pixCode?: string; qrCodeUrl?: string; transactionId?: string; error?: string; invalidBRCode?: boolean }> {
  
  // Check if test mode is forcing failure for this acquirer
  const shouldSimulateFail = await checkTestMode(acquirer);
  if (shouldSimulateFail) {
    await logApiEvent(acquirer, 'failure', 50, '[TESTE] Falha simulada para teste de retry');
    return { success: false, error: '[TESTE] Falha simulada para teste de retry' };
  }
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  const startTime = Date.now();
  
  // Helper function to validate BRCode after successful acquirer response
  const validateAndReturn = async (
    data: { success: boolean; pixCode?: string; qrCodeUrl?: string; transactionId?: string; error?: string },
    responseTime: number,
    acq: string
  ): Promise<{ success: boolean; pixCode?: string; qrCodeUrl?: string; transactionId?: string; error?: string; invalidBRCode?: boolean }> => {
    if (data.success && data.pixCode) {
      const validation = validateBRCode(data.pixCode);
      if (!validation.valid) {
        console.log(`[BRCODE-VALIDATION] ❌ Invalid BRCode from ${acq}: ${validation.error}`);
        console.log(`[BRCODE-VALIDATION] BRCode preview: ${data.pixCode.substring(0, 50)}...`);
        await logApiEvent(acq, 'invalid_brcode', responseTime, validation.error);
        return { 
          success: false, 
          error: `BRCode inválido do ${acq}: ${validation.error}`,
          invalidBRCode: true
        };
      }
      console.log(`[BRCODE-VALIDATION] ✓ BRCode from ${acq} is valid (${data.pixCode.length} chars)`);
      await logApiEvent(acq, 'success', responseTime);
      return { success: true, pixCode: data.pixCode, qrCodeUrl: data.qrCodeUrl, transactionId: data.transactionId };
    }
    
    await logApiEvent(acq, 'failure', responseTime, data.error);
    return { success: false, error: data.error };
  };
  
  try {
    if (acquirer === 'inter') {
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-pix-inter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ 
          amount: params.amount, 
          donorName: params.customerName,
          donorEmail: params.customerEmail,
          donorPhone: params.customerPhone,
          donorCpf: params.customerCpf,
          donorBirthdate: params.customerBirthdate,
          donorAddress: params.customerAddress,
          utmData: params.utmParams, 
          userId: params.userId, 
          popupModel: params.popupModel,
          productName: params.productName,
          fingerprint: params.fingerprint,
          clientIp: params.clientIp,
          orderBumps: params.orderBumps,
          offerId: params.offerId,
        }),
      });
      
      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      return await validateAndReturn(data, responseTime, 'inter');
    }
    
    if (acquirer === 'ativus') {
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-pix-ativus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ 
          amount: params.amount, 
          donorName: params.customerName,
          donorEmail: params.customerEmail,
          donorPhone: params.customerPhone,
          donorCpf: params.customerCpf,
          donorBirthdate: params.customerBirthdate,
          donorAddress: params.customerAddress,
          utmData: params.utmParams, 
          userId: params.userId, 
          popupModel: params.popupModel,
          productName: params.productName,
          fingerprint: params.fingerprint,
          clientIp: params.clientIp,
          orderBumps: params.orderBumps,
          offerId: params.offerId,
        }),
      });
      
      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      return await validateAndReturn(data, responseTime, 'ativus');
    }
    
    if (acquirer === 'valorion') {
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-pix-valorion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ 
          amount: params.amount, 
          donorName: params.customerName,
          donorEmail: params.customerEmail,
          donorPhone: params.customerPhone,
          donorCpf: params.customerCpf,
          donorBirthdate: params.customerBirthdate,
          donorAddress: params.customerAddress,
          utmData: params.utmParams, 
          userId: params.userId, 
          popupModel: params.popupModel,
          productName: params.productName,
          fingerprint: params.fingerprint,
          clientIp: params.clientIp,
          orderBumps: params.orderBumps,
          offerId: params.offerId,
        }),
      });
      
      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      return await validateAndReturn(data, responseTime, 'valorion');
    }
    
    if (acquirer === 'efi') {
      console.log('[EFI] Calling generate-pix-efi...');
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-pix-efi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ 
          amount: params.amount, 
          donorName: params.customerName,
          donorEmail: params.customerEmail,
          donorPhone: params.customerPhone,
          donorCpf: params.customerCpf,
          donorBirthdate: params.customerBirthdate,
          donorAddress: params.customerAddress,
          utmData: params.utmParams, 
          userId: params.userId, 
          popupModel: params.popupModel,
          productName: params.productName,
          fingerprint: params.fingerprint,
          clientIp: params.clientIp,
          orderBumps: params.orderBumps,
          offerId: params.offerId,
        }),
      });
      
      const data = await response.json();
      const responseTime = Date.now() - startTime;
      console.log('[EFI] Response:', JSON.stringify(data), 'responseTime:', responseTime);
      
      return await validateAndReturn(data, responseTime, 'efi');
    }
    
    return { success: false, error: `Unknown acquirer: ${acquirer}` };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    await logApiEvent(acquirer, 'failure', responseTime, errorMsg);
    return { success: false, error: errorMsg };
  }
}

// Generate PIX with SMART retry logic using Health Check cache
async function generatePixWithRetry(
  retryConfig: RetryConfig,
  params: {
    amount: number;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerCpf?: string;
    customerBirthdate?: string;
    customerAddress?: {
      cep?: string;
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
    };
    utmParams?: Record<string, any>;
    userId?: string;
    popupModel?: string;
    productName: string;
    feeConfig: FeeConfig | null;
    fingerprint?: string;
    clientIp?: string;
    orderBumps?: OrderBumpData[];
    offerId?: string;
  }
): Promise<{ success: boolean; pixCode?: string; qrCodeUrl?: string; transactionId?: string; error?: string; acquirerUsed?: string }> {
  
  // ============= HEALTH CHECK PROATIVO =============
  // 1. Buscar adquirente primária configurada
  const primaryAcquirer = await getPrimaryAcquirer();
  
  // 2. Buscar status de saúde de todos os adquirentes (consulta instantânea ao cache)
  const healthyAcquirers = await getHealthyAcquirers();
  const healthyAcquirerNames = healthyAcquirers.map(h => h.acquirer);
  const attemptedAcquirers = new Set<string>();
  
  console.log(`[SMART] Primary acquirer: ${primaryAcquirer || 'none'}`);
  console.log(`[SMART] Healthy acquirers: ${healthyAcquirerNames.join(', ') || 'none'}`);
  
  // 3. Verificar se a primária está saudável
  const primaryIsHealthy = primaryAcquirer && healthyAcquirerNames.includes(primaryAcquirer);
  
  if (primaryAcquirer && primaryIsHealthy) {
    // Primária está saudável - tenta diretamente (ZERO DELAY)
    console.log(`[SMART] ✅ Primary ${primaryAcquirer} is HEALTHY - calling directly`);
    
    const isEnabled = await isAcquirerEnabled(primaryAcquirer);
    if (isEnabled) {
      attemptedAcquirers.add(primaryAcquirer);
      const result = await callAcquirer(primaryAcquirer, params);
      if (result.success) {
        console.log(`[SMART] Success with primary ${primaryAcquirer}`);
        return { ...result, acquirerUsed: primaryAcquirer };
      }
      // Check if it was an invalid BRCode - log and continue to retry flow
      if (result.invalidBRCode) {
        console.log(`[SMART] ⚠️ Primary ${primaryAcquirer} returned INVALID BRCODE - immediately trying retry flow`);
      } else {
        console.log(`[SMART] Primary ${primaryAcquirer} failed despite being healthy: ${result.error}`);
      }
    }
  } else if (primaryAcquirer) {
    console.log(`[SMART] ⚠️ Primary ${primaryAcquirer} is UNHEALTHY - skipping directly to retry flow`);
  }
  
  // 4. Usar retry flow, mas APENAS com adquirentes saudáveis
  // Filtrar a primária (já tentamos) e manter apenas saudáveis
  let retryAcquirers = retryConfig.acquirer_order
    .filter(a => a !== primaryAcquirer) // Remove primária (já tentamos ou está com problema)
    .filter(a => healthyAcquirerNames.includes(a)); // Apenas saudáveis
  
  console.log(`[SMART] Retry flow with healthy acquirers: ${retryAcquirers.join(' -> ') || 'none'}`);
  
  // Se não há adquirentes saudáveis no retry, tentar todos do retry mesmo assim (fallback)
  if (retryAcquirers.length === 0) {
    console.log(`[SMART] No healthy acquirers in retry flow, using all enabled acquirers as fallback`);
    retryAcquirers = retryConfig.acquirer_order.filter(a => a !== primaryAcquirer);
  }
  // ================================================
  
  const maxRetries = Math.min(retryConfig.max_retries, retryAcquirers.length * 2);
  const delayMs = retryConfig.delay_between_retries_ms;
  
  let lastError: string = '';
  let attemptNumber = 0;
  
  for (const acquirer of retryAcquirers) {
    // Check if acquirer is enabled
    const isEnabled = await isAcquirerEnabled(acquirer);
    if (!isEnabled) {
      console.log(`[SMART] Acquirer ${acquirer} is disabled, skipping`);
      continue;
    }
    
    // Calculate attempts per acquirer
    const attemptsPerAcquirer = Math.ceil(maxRetries / retryAcquirers.length);
    
    for (let i = 0; i < attemptsPerAcquirer; i++) {
      attemptNumber++;
      if (attemptNumber > maxRetries) break;
      
      console.log(`[SMART] Attempt ${attemptNumber}/${maxRetries} with ${acquirer}`);
      
      // Log retry attempt
      if (attemptNumber > 1) {
        await logApiEvent(acquirer, 'retry', undefined, undefined, attemptNumber);
      }
      
       attemptedAcquirers.add(acquirer);
       const result = await callAcquirer(acquirer, params);
      
      if (result.success) {
        console.log(`[SMART] ✅ Success with ${acquirer} on attempt ${attemptNumber}`);
        return { ...result, acquirerUsed: acquirer };
      }
      
      lastError = result.error || 'Unknown error';
      
      // If BRCode is invalid, skip to next acquirer immediately (no delay)
      if (result.invalidBRCode) {
        console.log(`[SMART] ⚠️ ${acquirer} returned INVALID BRCODE - skipping to next acquirer immediately`);
        break; // Exit inner loop to try next acquirer
      }
      
      console.log(`[SMART] ❌ Failed with ${acquirer}: ${lastError}`);
      
      // Wait before next attempt (only for non-BRCode errors)
      if (attemptNumber < maxRetries) {
        console.log(`[SMART] Waiting ${delayMs}ms before next attempt`);
        await delay(delayMs);
      }
    }
    
    if (attemptNumber >= maxRetries) break;
  }
  
  console.log(`[SMART] All ${attemptNumber} attempts failed. Last error: ${lastError}`);

  // Extra safety fallback: if retry_flow_steps is misconfigured (e.g. only includes a broken acquirer),
  // try other enabled acquirers at least once before failing.
  const EXTRA_FALLBACK_ORDER = ['ativus', 'efi', 'inter', 'valorion'];
  const extraAcquirers = EXTRA_FALLBACK_ORDER.filter(a => !attemptedAcquirers.has(a));

  if (extraAcquirers.length > 0) {
    console.log(`[SMART] Extra fallback after retry flow exhausted: ${extraAcquirers.join(' -> ')}`);

    for (const acquirer of extraAcquirers) {
      const isEnabled = await isAcquirerEnabled(acquirer);
      if (!isEnabled) {
        console.log(`[SMART] Extra fallback: ${acquirer} is disabled, skipping`);
        continue;
      }

      attemptedAcquirers.add(acquirer);
      console.log(`[SMART] Extra fallback attempt with ${acquirer}`);

      const result = await callAcquirer(acquirer, params);
      if (result.success) {
        console.log(`[SMART] ✅ Extra fallback success with ${acquirer}`);
        return { ...result, acquirerUsed: acquirer };
      }

      lastError = result.error || 'Unknown error';
      if (result.invalidBRCode) {
        console.log(`[SMART] ⚠️ Extra fallback ${acquirer} returned INVALID BRCODE - continuing`);
        continue;
      }

      console.log(`[SMART] ❌ Extra fallback ${acquirer} failed: ${lastError}`);
    }
  }

  return { success: false, error: `Falha após ${attemptNumber} tentativas: ${lastError}` };
}

// Check if IP is in permanent blacklist
async function checkIpBlacklist(clientIp: string | undefined): Promise<{ blocked: boolean; reason?: string }> {
  if (!clientIp) {
    return { blocked: false };
  }
  
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('ip_blacklist')
      .select('reason')
      .eq('ip_address', clientIp)
      .eq('is_active', true)
      .maybeSingle();
    
    if (error) {
      console.error('[BLACKLIST] Error checking IP blacklist:', error);
      return { blocked: false };
    }
    
    if (data) {
      console.log(`[BLACKLIST] IP ${clientIp} is BLACKLISTED: ${data.reason}`);
      return { blocked: true, reason: data.reason || 'IP bloqueado permanentemente' };
    }
    
    return { blocked: false };
  } catch (err) {
    console.error('[BLACKLIST] Exception checking IP blacklist:', err);
    return { blocked: false };
  }
}

// Get client IP from request headers
function getClientIp(req: Request): string | undefined {
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // Get the first IP in the list (client's original IP)
    return xForwardedFor.split(',')[0].trim();
  }
  
  const xRealIp = req.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp;
  }
  
  return undefined;
}

// ============= HIGH VALUE IP LIMIT =============
// Para valores >= R$700, só permite 1 PIX não pago por IP
const HIGH_VALUE_THRESHOLD = 700;

async function checkHighValueIpLimit(
  clientIp: string | undefined, 
  amount: number
): Promise<{ blocked: boolean; reason?: string }> {
  // Se valor abaixo do threshold, não aplica essa regra
  if (amount < HIGH_VALUE_THRESHOLD) {
    return { blocked: false };
  }
  
  if (!clientIp) {
    console.log('[HIGH-VALUE] No IP available, allowing request');
    return { blocked: false };
  }
  
  const supabase = getSupabaseClient();
  
  try {
    // Conta quantos PIX >= R$700 com status 'generated' esse IP tem
    const { count, error } = await supabase
      .from('pix_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('client_ip', clientIp)
      .eq('status', 'generated')
      .gte('amount', HIGH_VALUE_THRESHOLD);
    
    if (error) {
      console.error('[HIGH-VALUE] Error checking IP limit:', error);
      return { blocked: false }; // Em caso de erro, permite (fail-open)
    }
    
    if (count && count >= 1) {
      console.log(`[HIGH-VALUE] IP ${clientIp} BLOCKED - already has ${count} unpaid PIX >= R$${HIGH_VALUE_THRESHOLD}`);
      return { 
        blocked: true, 
        reason: `Este IP já possui ${count} PIX de valor alto (R$${HIGH_VALUE_THRESHOLD}+) não pago. Pague o PIX pendente antes de gerar outro.`
      };
    }
    
    console.log(`[HIGH-VALUE] IP ${clientIp} allowed - no unpaid high-value PIX`);
    return { blocked: false };
  } catch (err) {
    console.error('[HIGH-VALUE] Exception:', err);
    return { blocked: false }; // Fail-open em caso de exceção
  }
}

// ============= HIGH VALUE SELLER LIMIT =============
// Para valores >= R$700, só permite 1 PIX não pago por VENDEDOR (userId)
// Isso evita ataque com rotação de IP/fingerprint.
async function checkHighValueSellerLimit(
  userId: string | undefined,
  amount: number
): Promise<{ blocked: boolean; reason?: string; count?: number }> {
  if (amount < HIGH_VALUE_THRESHOLD) {
    return { blocked: false };
  }

  if (!userId) {
    console.log('[HIGH-VALUE-SELLER] No userId provided, skipping seller limit');
    return { blocked: false };
  }

  const supabase = getSupabaseClient();

  try {
    const { count, error } = await supabase
      .from('pix_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'generated')
      .gte('amount', HIGH_VALUE_THRESHOLD);

    if (error) {
      console.error('[HIGH-VALUE-SELLER] Error checking seller limit:', error);
      return { blocked: false }; // fail-open
    }

    if (count && count >= 1) {
      console.log(`[HIGH-VALUE-SELLER] Seller ${userId.substring(0, 8)}... BLOCKED - already has ${count} unpaid PIX >= R$${HIGH_VALUE_THRESHOLD}`);
      return {
        blocked: true,
        count,
        reason: `Este usuário já possui ${count} PIX de valor alto (R$${HIGH_VALUE_THRESHOLD}+) não pago. Aguarde o PIX pendente expirar ou ser pago antes de gerar outro.`
      };
    }

    console.log(`[HIGH-VALUE-SELLER] Seller ${userId.substring(0, 8)}... allowed - no unpaid high-value PIX`);
    return { blocked: false, count: count || 0 };
  } catch (err) {
    console.error('[HIGH-VALUE-SELLER] Exception:', err);
    return { blocked: false }; // fail-open
  }
}
// ==================================================

// ===============================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, customerName, customerEmail, customerDocument, customerPhone, customerCpf, customerBirthdate, customerAddress, utmParams, userId, popupModel, fingerprint, productName: requestProductName, orderBumps, offerId }: GeneratePixRequest = await req.json();
    
    console.log('Order Bumps received:', orderBumps ? JSON.stringify(orderBumps) : 'none');
    
    // Get client IP
    const clientIp = getClientIp(req);

    console.log('User ID:', userId);
    console.log('Popup Model:', popupModel);
    console.log('UTM params received:', utmParams);
    console.log('Amount:', amount);
    console.log('Fingerprint:', fingerprint ? `${fingerprint.substring(0, 8)}...` : 'not provided');
    console.log('Client IP:', clientIp);

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= CHECK PERMANENT IP BLACKLIST =============
    // Verifica se o IP está na blacklist permanente ANTES de qualquer outra coisa
    const blacklistCheck = await checkIpBlacklist(clientIp);
    if (blacklistCheck.blocked) {
      console.log(`[BLACKLIST] Request blocked. IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ 
          error: 'IP_BLACKLISTED',
          message: 'Este IP foi bloqueado permanentemente devido a atividade suspeita.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // ========================================================

    // ============= CHECK HIGH-VALUE IP LIMIT =============
    // Para valores >= R$700, só permite 1 PIX não pago por IP
    const highValueCheck = await checkHighValueIpLimit(clientIp, amount);
    if (highValueCheck.blocked) {
      console.log(`[HIGH-VALUE] Request blocked. IP: ${clientIp}, Amount: R$${amount}`);
      return new Response(
        JSON.stringify({ 
          error: 'HIGH_VALUE_LIMIT',
          message: highValueCheck.reason,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // =====================================================

    // ============= CHECK HIGH-VALUE SELLER LIMIT =============
    // Para valores >= R$700, só permite 1 PIX não pago por VENDEDOR (userId)
    const highValueSellerCheck = await checkHighValueSellerLimit(userId, amount);
    if (highValueSellerCheck.blocked) {
      console.log(`[HIGH-VALUE-SELLER] Request blocked. User: ${userId}, Amount: R$${amount}`);
      try {
        await logRateLimitEvent(userId, clientIp, 'blocked', 'seller_high_value_limit', highValueSellerCheck.count);
      } catch (_) {
        // logging should never block request
      }
      return new Response(
        JSON.stringify({
          error: 'HIGH_VALUE_SELLER_LIMIT',
          message: highValueSellerCheck.reason,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // =========================================================

    // ============= CHECK SELLER BYPASS ANTIFRAUDE =============
    // Verifica se o vendedor tem bypass_antifraud ativado pelo admin
    const sellerBypassAntifraud = await checkSellerBypassAntifraud(userId);
    
    if (sellerBypassAntifraud) {
      console.log('[BYPASS-ANTIFRAUDE] Seller has bypass_antifraud enabled, skipping rate limit check');
    }
    // ===========================================================

    // ============= RATE LIMIT CHECK =============
    // Rate limit só é aplicado se o vendedor NÃO tiver bypass ativo
    if (!sellerBypassAntifraud) {
      const rateLimitConfig = await getRateLimitConfig();
      const rateLimitResult = await checkRateLimit(fingerprint, clientIp, rateLimitConfig);
      
      if (!rateLimitResult.allowed) {
        console.log(`[RATE-LIMIT] Request blocked. Reason: ${rateLimitResult.reason}, RetryAfter: ${rateLimitResult.retryAfter}s`);
        
        let errorMessage = 'Limite de geração de PIX atingido.';
        if (rateLimitResult.reason === 'COOLDOWN') {
          errorMessage = `Aguarde ${rateLimitResult.retryAfter} segundos antes de gerar outro PIX.`;
        } else if (rateLimitResult.reason === 'MAX_UNPAID') {
          errorMessage = `Você atingiu o limite de ${rateLimitConfig.maxUnpaidPix} PIX não pagos. Pague os PIX pendentes ou aguarde ${rateLimitConfig.windowHours} horas.`;
        } else if (rateLimitResult.reason === 'BLOCKED') {
          const hoursRemaining = Math.ceil((rateLimitResult.retryAfter || 0) / 3600);
          errorMessage = `Sua conta está temporariamente bloqueada. Tente novamente em ${hoursRemaining} hora(s).`;
        }
        
        return new Response(
          JSON.stringify({ 
            error: 'RATE_LIMIT',
            message: errorMessage,
            retryAfter: rateLimitResult.retryAfter,
            unpaidCount: rateLimitResult.unpaidCount,
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    // ============================================

    // Get user fee config
    const feeConfig = await getUserFeeConfig(userId);
    console.log('Fee config for transaction:', feeConfig);

    // Get product name - use from request if provided, otherwise fetch from database
    const productName = requestProductName || await getProductNameFromDatabase(userId, popupModel);
    console.log('Product name:', productName);

    // Get retry configuration
    const retryConfig = await getRetryConfig();
    
    // If retry is enabled, use retry logic
    if (retryConfig && retryConfig.enabled) {
      console.log('[RETRY MODE] Using automatic retry with fallback');
      
      const result = await generatePixWithRetry(retryConfig, {
        amount,
        customerName,
        customerEmail,
        customerPhone,
        customerCpf,
        customerBirthdate,
        customerAddress,
        utmParams,
        userId,
        popupModel,
        productName,
        feeConfig,
        fingerprint,
        clientIp,
        orderBumps,
        offerId
      });
      
      if (result.success) {
        // Update rate limit record after successful generation
        await updateRateLimitRecord(fingerprint, clientIp);
        
        return new Response(
          JSON.stringify({
            success: true,
            pixCode: result.pixCode,
            qrCodeUrl: result.qrCodeUrl,
            transactionId: result.transactionId,
            acquirerUsed: result.acquirerUsed
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: result.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fallback: Original logic without retry - NOW WITH AUTOMATIC FALLBACK
    console.log('[STANDARD MODE] Using single acquirer with automatic fallback');
    
    // Check user's acquirer preference
    const preferredAcquirer = await getUserAcquirer(userId);
    console.log('Preferred acquirer:', preferredAcquirer);

    // Fallback order: prioritize Ativus (most stable), then EFI, Inter, Valorion
    const FALLBACK_ORDER = ['ativus', 'efi', 'inter', 'valorion'];
    
    // Build ordered list: preferred first, then fallbacks (excluding preferred to avoid duplicates)
    const acquirersToTry = [
      preferredAcquirer,
      ...FALLBACK_ORDER.filter(a => a !== preferredAcquirer)
    ];
    
    console.log(`[STANDARD+FALLBACK] Order: ${acquirersToTry.join(' → ')}`);

    let lastError = '';
    let acquirerUsed = '';

    for (const acquirer of acquirersToTry) {
      // Check if the acquirer is enabled
      const isEnabled = await isAcquirerEnabled(acquirer);
      if (!isEnabled) {
        console.log(`[STANDARD+FALLBACK] Acquirer ${acquirer} is disabled, skipping`);
        continue;
      }

      console.log(`[STANDARD+FALLBACK] Trying ${acquirer}...`);

      const result = await callAcquirer(acquirer, {
        amount,
        customerName,
        customerEmail,
        customerPhone,
        customerCpf,
        customerBirthdate,
        customerAddress,
        utmParams,
        userId,
        popupModel,
        productName,
        feeConfig,
        fingerprint,
        clientIp,
        offerId
      });

      if (result.success) {
        // Update rate limit record after successful generation
        await updateRateLimitRecord(fingerprint, clientIp);
        
        acquirerUsed = acquirer;
        console.log(`[STANDARD+FALLBACK] ✅ Success with ${acquirer}`);
        
        return new Response(
          JSON.stringify({
            success: true,
            pixCode: result.pixCode,
            qrCodeUrl: result.qrCodeUrl,
            transactionId: result.transactionId,
            acquirerUsed: acquirer
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      lastError = result.error || 'Unknown error';
      
      // If BRCode is invalid, log specifically and continue to next
      if (result.invalidBRCode) {
        console.log(`[STANDARD+FALLBACK] ⚠️ ${acquirer} returned INVALID BRCODE - trying next acquirer`);
      } else {
        console.log(`[STANDARD+FALLBACK] ❌ ${acquirer} failed: ${lastError}`);
      }
    }

    // All acquirers failed
    console.log(`[STANDARD+FALLBACK] All acquirers failed. Last error: ${lastError}`);
    return new Response(
      JSON.stringify({ error: `Falha ao gerar PIX com todos os adquirentes disponíveis. Tente novamente em alguns segundos. (${lastError})` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating PIX:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
