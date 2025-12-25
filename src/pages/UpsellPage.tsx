import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Clock, CheckCircle, Shield, Lock } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface FunnelStepData {
  id: string;
  funnel_id: string;
  step_type: string;
  title: string | null;
  headline: string | null;
  description: string | null;
  offer_price: number | null;
  original_price: number | null;
  timer_seconds: number | null;
  button_accept_text: string | null;
  button_decline_text: string | null;
  image_url: string | null;
  video_url: string | null;
  background_color: string | null;
  button_color: string | null;
  next_step_on_accept: string | null;
  next_step_on_decline: string | null;
  is_active: boolean | null;
  offer_product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
  } | null;
}

interface FunnelData {
  id: string;
  thank_you_url: string | null;
  product_id: string;
}

interface TransactionData {
  id: string;
  donor_name: string | null;
  donor_email: string | null;
  donor_phone: string | null;
  donor_cpf: string | null;
  product_name: string | null;
  user_id: string;
}

export default function UpsellPage() {
  const { stepId, transactionId } = useParams<{ stepId: string; transactionId: string }>();
  const navigate = useNavigate();
  
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [upsellPixData, setUpsellPixData] = useState<{
    pixCode: string;
    qrCode: string;
    transactionId: string;
  } | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

  // Fetch original transaction data
  const { data: transaction, isLoading: loadingTransaction } = useQuery({
    queryKey: ["transaction-for-upsell", transactionId],
    queryFn: async () => {
      if (!transactionId) return null;
      
      const { data, error } = await supabase
        .from("pix_transactions")
        .select("id, donor_name, donor_email, donor_phone, donor_cpf, product_name, user_id")
        .eq("id", transactionId)
        .single();
      
      if (error) throw error;
      return data as TransactionData;
    },
    enabled: !!transactionId,
  });

  // Fetch current funnel step
  const { data: currentStep, isLoading: loadingStep } = useQuery({
    queryKey: ["funnel-step", stepId],
    queryFn: async () => {
      if (!stepId) return null;
      
      const { data, error } = await supabase
        .from("funnel_steps")
        .select(`
          id, funnel_id, step_type, title, headline, description,
          offer_price, original_price, timer_seconds,
          button_accept_text, button_decline_text,
          image_url, video_url, background_color, button_color,
          next_step_on_accept, next_step_on_decline, is_active,
          offer_product:products!offer_product_id(id, name, price, image_url)
        `)
        .eq("id", stepId)
        .single();
      
      if (error) throw error;
      return data as FunnelStepData;
    },
    enabled: !!stepId,
  });

  // Fetch funnel data for thank_you_url
  const { data: funnel } = useQuery({
    queryKey: ["funnel-for-step", currentStep?.funnel_id],
    queryFn: async () => {
      if (!currentStep?.funnel_id) return null;
      
      const { data, error } = await supabase
        .from("sales_funnels")
        .select("id, thank_you_url, product_id")
        .eq("id", currentStep.funnel_id)
        .single();
      
      if (error) throw error;
      return data as FunnelData;
    },
    enabled: !!currentStep?.funnel_id,
  });

  // Initialize timer
  useEffect(() => {
    if (currentStep && timeLeft === null) {
      setTimeLeft(currentStep.timer_seconds || 300);
    }
  }, [currentStep, timeLeft]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || upsellPixData) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          // Timer expired - go to decline path
          handleDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, upsellPixData]);

  // Poll for upsell payment status
  useEffect(() => {
    if (!upsellPixData?.transactionId || isPaid) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-pix-status", {
          body: { transactionId: upsellPixData.transactionId },
        });

        if (!error && data && data.status === "paid") {
          setIsPaid(true);
          toast.success("Pagamento confirmado!");
          clearInterval(pollInterval);
          
          // Record conversion
          if (currentStep && funnel) {
            await supabase.from("funnel_conversions").insert({
              funnel_id: funnel.id,
              step_id: currentStep.id,
              transaction_id: upsellPixData.transactionId,
              action: "paid",
            });
          }
          
          // Wait then redirect to next step or thank you
          setTimeout(() => {
            navigateToNextStep("accept");
          }, 2000);
        }
      } catch (err) {
        console.error("Error polling upsell status:", err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [upsellPixData?.transactionId, isPaid, currentStep, funnel]);

  // Navigate to next step or thank you page
  const navigateToNextStep = useCallback((action: "accept" | "decline") => {
    if (!currentStep || !transactionId) {
      navigate("/");
      return;
    }

    const nextStepId = action === "accept" 
      ? currentStep.next_step_on_accept 
      : currentStep.next_step_on_decline;

    if (nextStepId) {
      // Go to next funnel step
      navigate(`/upsell/${nextStepId}/${transactionId}`);
    } else {
      // No next step - go to thank you page
      if (funnel?.thank_you_url) {
        window.location.href = funnel.thank_you_url;
      } else {
        navigate("/");
      }
    }
  }, [currentStep, funnel, transactionId, navigate]);

  const handleDecline = useCallback(async () => {
    // Record decline conversion
    if (currentStep && funnel) {
      await supabase.from("funnel_conversions").insert({
        funnel_id: funnel.id,
        step_id: currentStep.id,
        transaction_id: transactionId,
        action: "declined",
      });
    }
    
    navigateToNextStep("decline");
  }, [currentStep, funnel, transactionId, navigateToNextStep]);

  const handleAccept = async () => {
    if (!currentStep || !transaction) return;
    
    setIsAccepting(true);
    try {
      // Record accepted conversion
      if (funnel) {
        await supabase.from("funnel_conversions").insert({
          funnel_id: funnel.id,
          step_id: currentStep.id,
          transaction_id: transactionId,
          action: "accepted",
        });
      }

      const { data, error } = await supabase.functions.invoke("generate-upsell-pix", {
        body: {
          originalTransactionId: transactionId,
          stepId: currentStep.id,
        },
      });

      if (error) throw error;

      if (data?.pixCode) {
        setUpsellPixData({
          pixCode: data.pixCode,
          qrCode: data.qrCode || data.pixCode,
          transactionId: data.transactionId,
        });
        toast.success("PIX gerado! Realize o pagamento para confirmar.");
      } else {
        throw new Error("Erro ao gerar PIX");
      }
    } catch (error) {
      console.error("Error generating upsell PIX:", error);
      toast.error("Erro ao processar. Tente novamente.");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleCheckPayment = async () => {
    if (!upsellPixData?.transactionId) return;
    
    setIsCheckingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-pix-status", {
        body: { transactionId: upsellPixData.transactionId },
      });

      if (!error && data && data.status === "paid") {
        setIsPaid(true);
        toast.success("Pagamento confirmado!");
        
        // Record conversion
        if (currentStep && funnel) {
          await supabase.from("funnel_conversions").insert({
            funnel_id: funnel.id,
            step_id: currentStep.id,
            transaction_id: upsellPixData.transactionId,
            action: "paid",
          });
        }
        
        setTimeout(() => {
          navigateToNextStep("accept");
        }, 2000);
      } else {
        toast.info("Pagamento ainda não identificado. Aguarde alguns segundos.");
      }
    } catch (err) {
      toast.error("Erro ao verificar pagamento.");
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const handleCopyCode = async () => {
    if (!upsellPixData?.pixCode) return;
    
    try {
      await navigator.clipboard.writeText(upsellPixData.pixCode);
      toast.success("Código PIX copiado!");
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Loading state
  if (loadingTransaction || loadingStep) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // No step found - redirect to home
  if (!currentStep) {
    navigate("/");
    return null;
  }

  // Thank you step type - redirect to thank you page
  if (currentStep.step_type === "thankyou") {
    if (funnel?.thank_you_url) {
      window.location.href = funnel.thank_you_url;
    } else {
      navigate("/");
    }
    return null;
  }

  // Get colors with defaults
  const backgroundColor = currentStep.background_color || "#f3f4f6";
  const buttonColor = currentStep.button_color || "#22c55e";
  const offerPrice = currentStep.offer_price || currentStep.offer_product?.price || 0;

  // Payment confirmed state
  if (isPaid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor }}>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-green-600 mb-2">
            Pagamento Confirmado!
          </h1>
          <p className="text-gray-600 mb-4">
            Seu pedido foi processado com sucesso.
          </p>
          <p className="text-sm text-gray-500">
            Redirecionando...
          </p>
        </div>
      </div>
    );
  }

  // Show PIX payment for upsell
  if (upsellPixData) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor }}
      >
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full">
          <h2 className="text-xl font-bold text-center mb-4">
            Finalize o pagamento
          </h2>
          
          <div className="text-center mb-4">
            <p className="text-2xl font-bold text-green-600">
              {formatPrice(offerPrice)}
            </p>
            <p className="text-sm text-gray-500">
              {currentStep.offer_product?.name}
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-4">
            <div className="bg-white p-3 border rounded-lg">
              <QRCodeSVG value={upsellPixData.pixCode} size={180} level="M" />
            </div>
          </div>

          {/* PIX Code */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Código PIX Copia e Cola:</p>
            <div className="bg-gray-100 p-3 rounded-lg break-all text-xs font-mono">
              {upsellPixData.pixCode.substring(0, 100)}...
            </div>
            <Button onClick={handleCopyCode} className="w-full mt-2" variant="outline">
              Copiar código PIX
            </Button>
          </div>

          {/* Check Payment */}
          <Button
            onClick={handleCheckPayment}
            disabled={isCheckingPayment}
            className="w-full text-white"
            style={{ backgroundColor: buttonColor }}
          >
            {isCheckingPayment ? "Verificando..." : "Já fiz o pagamento"}
          </Button>

          {/* Cancel */}
          <button
            onClick={handleDecline}
            className="w-full text-center text-gray-500 text-sm mt-4 underline"
          >
            Cancelar e continuar
          </button>
        </div>
      </div>
    );
  }

  // Main offer view (upsell, downsell, crosssell)
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor }}
    >
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 max-w-lg w-full">
        {/* Timer */}
        {timeLeft !== null && timeLeft > 0 && (
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 bg-red-100 text-red-600 px-4 py-2 rounded-full font-medium animate-pulse">
              <Clock className="h-4 w-4" />
              Oferta expira em {formatTime(timeLeft)}
            </div>
          </div>
        )}

        {/* Headline */}
        <h1 className="text-xl md:text-2xl font-bold text-center text-gray-800 mb-4">
          {currentStep.headline || "Espera! Temos uma oferta exclusiva para você"}
        </h1>

        {/* Product Image */}
        {(currentStep.image_url || currentStep.offer_product?.image_url) && (
          <div className="flex justify-center mb-4">
            <img
              src={currentStep.image_url || currentStep.offer_product?.image_url || ""}
              alt={currentStep.offer_product?.name}
              className="w-40 h-40 object-cover rounded-lg shadow-md"
            />
          </div>
        )}

        {/* Video */}
        {currentStep.video_url && (
          <div className="mb-4 aspect-video rounded-lg overflow-hidden">
            <iframe
              src={currentStep.video_url.replace("watch?v=", "embed/")}
              className="w-full h-full"
              allowFullScreen
            />
          </div>
        )}

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-2">
          {currentStep.title || "Oferta Especial"}
        </h2>

        {/* Product Name */}
        <p className="text-center text-gray-600 mb-4">
          {currentStep.offer_product?.name}
        </p>

        {/* Description */}
        {currentStep.description && (
          <p className="text-gray-600 text-center mb-4">
            {currentStep.description}
          </p>
        )}

        {/* Price */}
        <div className="text-center mb-6">
          {currentStep.original_price && currentStep.original_price > offerPrice && (
            <p className="text-gray-400 line-through">
              De {formatPrice(currentStep.original_price)}
            </p>
          )}
          <p className="text-3xl font-bold text-green-600">
            Por apenas {formatPrice(offerPrice)}
          </p>
        </div>

        {/* Accept Button */}
        <Button
          onClick={handleAccept}
          disabled={isAccepting}
          className="w-full text-white font-bold py-4 text-lg mb-3 transition-transform hover:scale-[1.02]"
          style={{ backgroundColor: buttonColor }}
        >
          {isAccepting ? "Processando..." : (currentStep.button_accept_text || "SIM! Quero aproveitar")}
        </Button>

        {/* Decline Button */}
        <button
          onClick={handleDecline}
          className="w-full text-center text-gray-500 text-sm underline hover:text-gray-700"
        >
          {currentStep.button_decline_text || "Não, obrigado"}
        </button>

        {/* Security Badges */}
        <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Shield className="h-4 w-4" />
            Compra Segura
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Lock className="h-4 w-4" />
            Dados Protegidos
          </div>
        </div>
      </div>
    </div>
  );
}
