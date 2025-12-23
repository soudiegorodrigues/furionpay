import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import forge from "https://esm.sh/node-forge@1.3.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function convertP12ToPem(p12Base64: string, password: string): { certificate: string; privateKey: string } {
  console.log("Starting P12 to PEM conversion...");
  
  // Decode base64 to binary string
  const p12Der = forge.util.decode64(p12Base64);
  console.log(`P12 file size: ${p12Der.length} bytes`);
  
  // Parse ASN.1 structure
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  
  // Parse PKCS#12 structure
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password || '');
  console.log("P12 parsed successfully");
  
  // Extract certificate
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBagList = certBags[forge.pki.oids.certBag] || [];
  
  if (certBagList.length === 0) {
    throw new Error("Nenhum certificado encontrado no arquivo P12");
  }
  
  const certificate = forge.pki.certificateToPem(certBagList[0].cert);
  console.log("Certificate extracted successfully");
  
  // Extract private key - try different bag types
  let privateKey = '';
  
  // Try pkcs8ShroudedKeyBag first (most common)
  const shroudedKeyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const shroudedKeyBagList = shroudedKeyBags[forge.pki.oids.pkcs8ShroudedKeyBag] || [];
  
  if (shroudedKeyBagList.length > 0 && shroudedKeyBagList[0].key) {
    privateKey = forge.pki.privateKeyToPem(shroudedKeyBagList[0].key);
    console.log("Private key extracted from pkcs8ShroudedKeyBag");
  } else {
    // Try keyBag
    const keyBags = p12.getBags({ bagType: forge.pki.oids.keyBag });
    const keyBagList = keyBags[forge.pki.oids.keyBag] || [];
    
    if (keyBagList.length > 0 && keyBagList[0].key) {
      privateKey = forge.pki.privateKeyToPem(keyBagList[0].key);
      console.log("Private key extracted from keyBag");
    }
  }
  
  if (!privateKey) {
    throw new Error("Nenhuma chave privada encontrada no arquivo P12");
  }
  
  return { certificate, privateKey };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { p12Base64, password } = await req.json();
    
    if (!p12Base64) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Arquivo P12 não fornecido" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log("Attempting to convert P12 certificate...");
    console.log(`Password provided: ${password ? 'Yes' : 'No'}`);
    
    try {
      const result = convertP12ToPem(p12Base64, password || '');
      
      console.log("Conversion successful!");
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          certificate: result.certificate,
          privateKey: result.privateKey
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (parseError: any) {
      console.error("Error during P12 parsing:", parseError.message);
      
      // Check for common errors
      if (parseError.message.includes("Invalid password") || 
          parseError.message.includes("PKCS#12 MAC could not be verified")) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Senha incorreta para o certificado P12"
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      throw parseError;
    }
    
  } catch (error: any) {
    console.error("Error converting P12:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Erro ao processar certificado" 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
