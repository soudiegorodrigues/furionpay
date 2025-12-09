import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface CloakerData {
  id: string;
  safe_url: string;
  offer_url: string;
  block_bots: boolean;
  block_vpn: boolean;
  verify_device: boolean;
  country: string;
  blocked_devices: string[];
  is_active: boolean;
}

const CloakerRedirect = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processCloaker = async () => {
      if (!id) {
        navigate("/");
        return;
      }

      try {
        // Fetch cloaker data
        const { data: cloaker, error } = await supabase
          .from("cloakers")
          .select("*")
          .eq("id", id)
          .eq("is_active", true)
          .maybeSingle();

        if (error || !cloaker) {
          console.error("Cloaker not found:", error);
          // Redirect to safe page or home if not found
          navigate("/");
          return;
        }

        const cloakerData = cloaker as CloakerData;
        
        // Check device blocking
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobile = /android/.test(userAgent) && !/iphone|ipad/.test(userAgent);
        const isIPhone = /iphone|ipad|ipod/.test(userAgent);
        const isTablet = /tablet|ipad/.test(userAgent);
        const isDesktop = !isMobile && !isIPhone && !isTablet;

        const blockedDevices = cloakerData.blocked_devices || [];

        if (
          (blockedDevices.includes("mobile") && isMobile) ||
          (blockedDevices.includes("iphone") && isIPhone) ||
          (blockedDevices.includes("tablet") && isTablet) ||
          (blockedDevices.includes("desktop") && isDesktop)
        ) {
          // Device is blocked, redirect to safe URL
          window.location.href = cloakerData.safe_url;
          return;
        }

        // Check for bots (basic detection)
        if (cloakerData.block_bots) {
          const botPatterns = [
            /bot/i, /crawler/i, /spider/i, /slurp/i, /facebookexternalhit/i,
            /googlebot/i, /bingbot/i, /yandexbot/i, /baiduspider/i
          ];
          
          if (botPatterns.some(pattern => pattern.test(navigator.userAgent))) {
            window.location.href = cloakerData.safe_url;
            return;
          }
        }

        // If all checks pass, redirect to offer URL
        window.location.href = cloakerData.offer_url;

      } catch (err) {
        console.error("Error processing cloaker:", err);
        navigate("/");
      }
    };

    processCloaker();
  }, [id, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">
        Redirecionando...
      </div>
    </div>
  );
};

export default CloakerRedirect;
