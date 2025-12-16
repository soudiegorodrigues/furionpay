import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for, x-real-ip',
};

const SPEDPAY_API_URL = 'https://api.spedpay.space';

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

interface GeneratePixRequest {
  amount: number;
  customerName?: string;
  customerEmail?: string;
  customerDocument?: string;
  userId?: string;
  popupModel?: string;
  fingerprint?: string;
  utmParams?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };
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

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
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

// Check rate limit for fingerprint/IP
async function checkRateLimit(fingerprint: string | undefined, clientIp: string | undefined, config: RateLimitConfig): Promise<RateLimitResult> {
  // If rate limiting is disabled, allow all
  if (!config.enabled) {
    console.log('[RATE-LIMIT] Rate limiting disabled, allowing request');
    return { allowed: true };
  }

  const supabase = getSupabaseClient();
  
  // If no fingerprint provided, use IP only
  const identifier = fingerprint || clientIp;
  if (!identifier) {
    console.log('[RATE-LIMIT] No fingerprint or IP available, allowing request');
    return { allowed: true };
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - (config.windowHours * 60 * 60 * 1000));

  try {
    // Get or create rate limit record
    let { data: rateLimitRecord, error: fetchError } = await supabase
      .from('pix_rate_limits')
      .select('*')
      .eq('fingerprint_hash', identifier)
      .maybeSingle();

    if (fetchError) {
      console.error('[RATE-LIMIT] Error fetching rate limit:', fetchError);
      return { allowed: true }; // Allow on error to not block legitimate users
    }

    // If no record exists, this is a new device
    if (!rateLimitRecord) {
      console.log('[RATE-LIMIT] New device, creating record');
      return { allowed: true };
    }

    // Check if blocked
    if (rateLimitRecord.blocked_until && new Date(rateLimitRecord.blocked_until) > now) {
      const retryAfter = Math.ceil((new Date(rateLimitRecord.blocked_until).getTime() - now.getTime()) / 1000);
      console.log(`[RATE-LIMIT] Device is blocked until ${rateLimitRecord.blocked_until}, retry after ${retryAfter}s`);
      
      // Log blocked event
      await logRateLimitEvent(fingerprint, clientIp, 'blocked', 'device_blocked', rateLimitRecord.unpaid_count);
      
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
        console.log(`[RATE-LIMIT] Cooldown active, retry after ${retryAfter}s`);
        
        // Log cooldown event
        await logRateLimitEvent(fingerprint, clientIp, 'cooldown', 'cooldown_active', rateLimitRecord.unpaid_count);
        
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
      // Reset count if outside window
      console.log('[RATE-LIMIT] Outside window, resetting count');
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
      // Block for configured hours
      const blockedUntil = new Date(now.getTime() + (config.windowHours * 60 * 60 * 1000));
      
      await supabase
        .from('pix_rate_limits')
        .update({ blocked_until: blockedUntil.toISOString() })
        .eq('id', rateLimitRecord.id);
      
      const retryAfter = config.windowHours * 60 * 60;
      console.log(`[RATE-LIMIT] Max unpaid PIX reached (${rateLimitRecord.unpaid_count}), blocking for ${config.windowHours}h`);
      
      // Log max_unpaid event
      await logRateLimitEvent(fingerprint, clientIp, 'blocked', 'max_unpaid', rateLimitRecord.unpaid_count);
      
      return {
        allowed: false,
        reason: 'MAX_UNPAID',
        retryAfter,
        unpaidCount: rateLimitRecord.unpaid_count
      };
    }

    console.log(`[RATE-LIMIT] Allowed. Current unpaid count: ${rateLimitRecord.unpaid_count}`);
    return { allowed: true, unpaidCount: rateLimitRecord.unpaid_count };

  } catch (err) {
    console.error('[RATE-LIMIT] Unexpected error:', err);
    return { allowed: true }; // Allow on error
  }
}

// Update rate limit record after PIX generation
async function updateRateLimitRecord(fingerprint: string | undefined, clientIp: string | undefined): Promise<void> {
  const supabase = getSupabaseClient();
  
  const identifier = fingerprint || clientIp;
  if (!identifier) return;

  const now = new Date().toISOString();

  try {
    // Get rate limit config to know the limit
    const config = await getRateLimitConfig();
    
    // Check if record exists
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
      
      // Update existing record - increment unpaid_count and potentially block
      const { error: updateError } = await supabase
        .from('pix_rate_limits')
        .update({
          unpaid_count: newUnpaidCount,
          last_generation_at: now,
          updated_at: now,
          ip_address: clientIp || null,
          blocked_until: blockedUntil,
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('[RATE-LIMIT] Error updating record:', updateError);
      } else {
        console.log(`[RATE-LIMIT] Updated unpaid_count to ${newUnpaidCount} for fingerprint: ${identifier.substring(0, 8)}...`);
        
        // If blocked immediately, log the event
        if (shouldBlock) {
          await logRateLimitEvent(identifier, clientIp, 'blocked', 'max_unpaid_reached_immediate', newUnpaidCount);
          console.log(`[RATE-LIMIT] Device BLOCKED IMMEDIATELY after reaching ${newUnpaidCount} unpaid PIX (limit: ${config.maxUnpaidPix})`);
        }
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('pix_rate_limits')
        .insert({
          fingerprint_hash: identifier,
          ip_address: clientIp || null,
          unpaid_count: 1,
          last_generation_at: now,
          updated_at: now,
        });

      if (insertError) {
        console.error('[RATE-LIMIT] Error inserting record:', insertError);
      } else {
        console.log(`[RATE-LIMIT] Created new rate limit record for fingerprint: ${identifier.substring(0, 8)}...`);
      }
    }

  } catch (err) {
    console.error('[RATE-LIMIT] Error updating rate limit record:', err);
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

// Get retry configuration for PIX
async function getRetryConfig(): Promise<RetryConfig | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('retry_configurations')
    .select('enabled, max_retries, acquirer_order, delay_between_retries_ms')
    .eq('payment_method', 'pix')
    .maybeSingle();
  
  if (error) {
    console.log('Error fetching retry config:', error);
    return null;
  }
  
  if (data) {
    console.log('Retry config loaded:', data);
    return data as RetryConfig;
  }
  
  console.log('No retry config found');
  return null;
}

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
    console.log('Default acquirer not configured, using spedpay');
    return 'spedpay';
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

async function getApiKeyFromDatabase(userId?: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  
  // First try to get user-specific API key if userId provided
  if (userId) {
    const { data: userData, error: userError } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'spedpay_api_key')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (!userError && userData?.value) {
      console.log('Using user-specific SpedPay API key');
      return userData.value;
    }
  }
  
  // Fallback to global SpedPay API key from admin_settings (user_id = null)
  const { data: globalData, error: globalError } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'spedpay_api_key')
    .is('user_id', null)
    .maybeSingle();
  
  if (!globalError && globalData?.value) {
    console.log('Using global SpedPay API key from admin_settings');
    return globalData.value;
  }
  
  console.log('No SpedPay API key found in database');
  return null;
}

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

// Log API monitoring event
async function logApiEvent(
  acquirer: string, 
  eventType: 'success' | 'failure' | 'retry' | 'circuit_open' | 'circuit_close',
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
  acquirer: string = 'spedpay',
  fingerprintHash?: string,
  clientIp?: string
): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    
    // Insert with fingerprint and IP
    const { data, error } = await supabase
      .from('pix_transactions')
      .insert({
        amount,
        txid,
        pix_code: pixCode,
        donor_name: donorName,
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
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error logging PIX transaction:', error);
      return null;
    } else {
      console.log('PIX transaction logged with ID:', data.id);
      return data.id as string;
    }
  } catch (err) {
    console.error('Error in logPixGenerated:', err);
    return null;
  }
}

// Helper delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Call specific acquirer
async function callAcquirer(
  acquirer: string,
  params: {
    amount: number;
    customerName?: string;
    utmParams?: Record<string, any>;
    userId?: string;
    popupModel?: string;
    productName: string;
    feeConfig: FeeConfig | null;
    fingerprint?: string;
    clientIp?: string;
  }
): Promise<{ success: boolean; pixCode?: string; qrCodeUrl?: string; transactionId?: string; error?: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  const startTime = Date.now();
  
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
          utmParams: params.utmParams, 
          userId: params.userId, 
          popupModel: params.popupModel,
          fingerprint: params.fingerprint,
          clientIp: params.clientIp,
        }),
      });
      
      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      if (data.success) {
        await logApiEvent('inter', 'success', responseTime);
        return { success: true, pixCode: data.pixCode, qrCodeUrl: data.qrCodeUrl, transactionId: data.transactionId };
      } else {
        await logApiEvent('inter', 'failure', responseTime, data.error);
        return { success: false, error: data.error };
      }
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
          utmData: params.utmParams, 
          userId: params.userId, 
          popupModel: params.popupModel,
          fingerprint: params.fingerprint,
          clientIp: params.clientIp,
        }),
      });
      
      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      if (data.success) {
        await logApiEvent('ativus', 'success', responseTime);
        return { success: true, pixCode: data.pixCode, qrCodeUrl: data.qrCodeUrl, transactionId: data.transactionId };
      } else {
        await logApiEvent('ativus', 'failure', responseTime, data.error);
        return { success: false, error: data.error };
      }
    }
    
    if (acquirer === 'spedpay') {
      // Get SpedPay API key
      let apiKey = await getApiKeyFromDatabase(params.userId);
      if (!apiKey) {
        apiKey = Deno.env.get('SPEDPAY_API_KEY') || null;
      }
      
      if (!apiKey) {
        return { success: false, error: 'SpedPay API key not configured' };
      }
      
      const externalId = `donation_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const donorName = params.customerName || getRandomName();
      const donorEmail = getRandomEmail(donorName);
      const donorPhone = getRandomPhone();
      const webhookUrl = `${supabaseUrl}/functions/v1/pix-webhook`;

      const customerData: Record<string, any> = {
        name: donorName,
        email: donorEmail,
        phone: donorPhone,
        document_type: 'CPF',
        document: '12345678909',
      };

      if (params.utmParams) {
        if (params.utmParams.utm_source) customerData.utm_source = params.utmParams.utm_source;
        if (params.utmParams.utm_medium) customerData.utm_medium = params.utmParams.utm_medium;
        if (params.utmParams.utm_campaign) customerData.utm_campaign = params.utmParams.utm_campaign;
        if (params.utmParams.utm_content) customerData.utm_content = params.utmParams.utm_content;
        if (params.utmParams.utm_term) customerData.utm_term = params.utmParams.utm_term;
      }

      const transactionData = {
        external_id: externalId,
        total_amount: params.amount,
        payment_method: 'PIX',
        webhook_url: webhookUrl,
        customer: customerData,
        items: [
          {
            id: `item_${externalId}`,
            title: params.productName,
            description: params.productName,
            price: params.amount,
            quantity: 1,
            is_physical: false,
          }
        ],
        ip: params.clientIp || '0.0.0.0',
      };

      const response = await fetch(`${SPEDPAY_API_URL}/v1/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-secret': apiKey,
        },
        body: JSON.stringify(transactionData),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        await logApiEvent('spedpay', 'failure', responseTime, errorText);
        return { success: false, error: errorText };
      }

      const data = await response.json();
      
      let pixCode = data.pix?.payload || data.pix?.qr_code || data.pixCode || data.qr_code;
      let qrCodeUrl = data.pix?.qr_code_url || data.qrCodeUrl;
      const transactionId = data.id || externalId;

      // If PIX code not in response, poll for it
      if (!pixCode && data.id) {
        for (let attempt = 1; attempt <= 5; attempt++) {
          await delay(1500);
          
          const detailsResponse = await fetch(`${SPEDPAY_API_URL}/v1/transactions/${data.id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'api-secret': apiKey,
            },
          });
          
          if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json();
            pixCode = detailsData.pix?.payload || detailsData.pix?.qr_code || detailsData.pixCode || detailsData.qr_code;
            qrCodeUrl = detailsData.pix?.qr_code_url || detailsData.qrCodeUrl;
            
            if (pixCode) break;
          }
        }
      }

      if (!pixCode) {
        await logApiEvent('spedpay', 'failure', responseTime, 'PIX code not found after polling');
        return { success: false, error: 'PIX code not found' };
      }

      // Log to database with fingerprint
      await logPixGenerated(
        params.amount, 
        transactionId, 
        pixCode, 
        donorName, 
        params.utmParams, 
        params.productName, 
        params.userId, 
        params.popupModel,
        params.feeConfig?.pix_percentage,
        params.feeConfig?.pix_fixed,
        'spedpay',
        params.fingerprint,
        params.clientIp
      );

      await logApiEvent('spedpay', 'success', responseTime);
      return { success: true, pixCode, qrCodeUrl, transactionId };
    }
    
    return { success: false, error: `Unknown acquirer: ${acquirer}` };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    await logApiEvent(acquirer, 'failure', responseTime, errorMsg);
    return { success: false, error: errorMsg };
  }
}

// Generate PIX with retry logic
async function generatePixWithRetry(
  retryConfig: RetryConfig,
  params: {
    amount: number;
    customerName?: string;
    utmParams?: Record<string, any>;
    userId?: string;
    popupModel?: string;
    productName: string;
    feeConfig: FeeConfig | null;
    fingerprint?: string;
    clientIp?: string;
  }
): Promise<{ success: boolean; pixCode?: string; qrCodeUrl?: string; transactionId?: string; error?: string; acquirerUsed?: string }> {
  const acquirers = retryConfig.acquirer_order;
  const maxRetries = retryConfig.max_retries;
  const delayMs = retryConfig.delay_between_retries_ms;
  
  let lastError: string = '';
  let attemptNumber = 0;
  
  console.log(`[RETRY] Starting with config: max_retries=${maxRetries}, acquirers=${acquirers.join(',')}, delay=${delayMs}ms`);
  
  for (const acquirer of acquirers) {
    // Check if acquirer is enabled
    const isEnabled = await isAcquirerEnabled(acquirer);
    if (!isEnabled) {
      console.log(`[RETRY] Acquirer ${acquirer} is disabled, skipping`);
      continue;
    }
    
    // Calculate attempts per acquirer (distribute retries across acquirers)
    const attemptsPerAcquirer = Math.ceil(maxRetries / acquirers.length);
    
    for (let i = 0; i < attemptsPerAcquirer; i++) {
      attemptNumber++;
      if (attemptNumber > maxRetries) break;
      
      console.log(`[RETRY] Attempt ${attemptNumber}/${maxRetries} with ${acquirer}`);
      
      // Log retry attempt
      if (attemptNumber > 1) {
        await logApiEvent(acquirer, 'retry', undefined, undefined, attemptNumber);
      }
      
      const result = await callAcquirer(acquirer, params);
      
      if (result.success) {
        console.log(`[RETRY] Success with ${acquirer} on attempt ${attemptNumber}`);
        return { ...result, acquirerUsed: acquirer };
      }
      
      lastError = result.error || 'Unknown error';
      console.log(`[RETRY] Failed with ${acquirer}: ${lastError}`);
      
      // Wait before next attempt
      if (attemptNumber < maxRetries) {
        console.log(`[RETRY] Waiting ${delayMs}ms before next attempt`);
        await delay(delayMs);
      }
    }
    
    if (attemptNumber >= maxRetries) break;
  }
  
  console.log(`[RETRY] All ${attemptNumber} attempts failed. Last error: ${lastError}`);
  return { success: false, error: `Falha após ${attemptNumber} tentativas: ${lastError}` };
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, customerName, customerEmail, customerDocument, utmParams, userId, popupModel, fingerprint }: GeneratePixRequest = await req.json();
    
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

    // ============= RATE LIMIT CHECK =============
    // Load rate limit config from database
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
    // ============================================

    // Get user fee config
    const feeConfig = await getUserFeeConfig(userId);
    console.log('Fee config for transaction:', feeConfig);

    // Get product name from checkout_offers
    const productName = await getProductNameFromDatabase(userId, popupModel);
    console.log('Product name:', productName);

    // Get retry configuration
    const retryConfig = await getRetryConfig();
    
    // If retry is enabled, use retry logic
    if (retryConfig && retryConfig.enabled) {
      console.log('[RETRY MODE] Using automatic retry with fallback');
      
      const result = await generatePixWithRetry(retryConfig, {
        amount,
        customerName,
        utmParams,
        userId,
        popupModel,
        productName,
        feeConfig,
        fingerprint,
        clientIp
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

    // Fallback: Original logic without retry
    console.log('[STANDARD MODE] Using single acquirer without retry');
    
    // Check user's acquirer preference
    const acquirer = await getUserAcquirer(userId);
    console.log('Selected acquirer:', acquirer);

    // Check if the selected acquirer is enabled
    const isEnabled = await isAcquirerEnabled(acquirer);
    if (!isEnabled) {
      console.log(`Acquirer ${acquirer} is disabled`);
      const acquirerName = acquirer === 'inter' ? 'Banco Inter' : acquirer === 'ativus' ? 'Ativus Hub' : 'SpedPay';
      return new Response(
        JSON.stringify({ error: `Adquirente ${acquirerName} está desativada. Ative-a no painel admin ou selecione outra adquirente.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call the selected acquirer directly
    const result = await callAcquirer(acquirer, {
      amount,
      customerName,
      utmParams,
      userId,
      popupModel,
      productName,
      feeConfig,
      fingerprint,
      clientIp
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
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error generating PIX:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
