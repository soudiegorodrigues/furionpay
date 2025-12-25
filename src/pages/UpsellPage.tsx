import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Clock, CheckCircle, Shield, Lock, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface UpsellData {
  id: string;
  title: string;
  description: string | null;
  headline: string | null;
  upsell_price: number;
  original_price: number | null;
  timer_seconds: number;
  button_text: string;
  decline_text: string;
  image_url: string | null;
  video_url: string | null;
  background_color: string;
  button_color: string;
  upsell_product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
  } | null;
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
  const { transactionId } = useParams<{ transactionId: string }>();
  const [searchParams] = useSearchParams();
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

  // Get thank you URL from query params
  const thankYouUrl = searchParams.get("thank_you_url");

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

  // Fetch upsell configuration for the product
  const { data: upsell, isLoading: loadingUpsell } = useQuery({
    queryKey: ["upsell-for-transaction", transaction?.product_name, transaction?.user_id],
    queryFn: async () => {
      if (!transaction?.product_name || !transaction?.user_id) return null;
      
      // First, find the product by name and user_id
      const { data: products, error: productError } = await supabase
        .from("products")
        .select("id")
        .eq("user_id", transaction.user_id)
        .eq("name", transaction.product_name)
        .limit(1);
      
      if (productError || !products?.length) return null;
      
      const productId = products[0].id;
      
      // Then fetch the active upsell for this product
      const { data, error } = await supabase
        .from("product_upsells")
        .select(`
          id, title, description, headline, upsell_price, original_price,
          timer_seconds, button_text, decline_text, image_url, video_url,
          background_color, button_color,
          upsell_product:products!upsell_product_id(id, name, price, image_url)
        `)
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("position", { ascending: true })
        .limit(1);
      
      if (error) throw error;
      return data?.[0] as UpsellData | null;
    },
    enabled: !!transaction?.product_name && !!transaction?.user_id,
  });

  // Initialize timer
  useEffect(() => {
    if (upsell && timeLeft === null) {
      setTimeLeft(upsell.timer_seconds);
    }
  }, [upsell, timeLeft]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || upsellPixData) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          // Timer expired - go to thank you
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
          toast.success("Pagamento do Upsell confirmado!");
          clearInterval(pollInterval);
          
          // Wait a bit then redirect
          setTimeout(() => {
            redirectToThankYou();
          }, 2000);
        }
      } catch (err) {
        console.error("Error polling upsell status:", err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [upsellPixData?.transactionId, isPaid]);

  const redirectToThankYou = useCallback(() => {
    if (thankYouUrl) {
      window.location.href = thankYouUrl;
    } else {
      navigate("/");
    }
  }, [thankYouUrl, navigate]);

  const handleDecline = useCallback(() => {
    redirectToThankYou();
  }, [redirectToThankYou]);

  const handleAccept = async () => {
    if (!upsell || !transaction) return;
    
    setIsAccepting(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-upsell-pix", {
        body: {
          originalTransactionId: transactionId,
          upsellId: upsell.id,
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
        setTimeout(() => {
          redirectToThankYou();
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
  if (loadingTransaction || loadingUpsell) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // No upsell configured - redirect to thank you
  if (!upsell) {
    redirectToThankYou();
    return null;
  }

  // Payment confirmed state
  if (isPaid) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-green-600 mb-2">
            Pagamento Confirmado!
          </h1>
          <p className="text-gray-600 mb-4">
            Seu upsell foi processado com sucesso.
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
        style={{ backgroundColor: upsell.background_color }}
      >
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full">
          <h2 className="text-xl font-bold text-center mb-4">
            Finalize o pagamento do Upsell
          </h2>
          
          <div className="text-center mb-4">
            <p className="text-2xl font-bold text-green-600">
              {formatPrice(upsell.upsell_price)}
            </p>
            <p className="text-sm text-gray-500">
              {upsell.upsell_product?.name}
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
            className="w-full"
            style={{ backgroundColor: upsell.button_color }}
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

  // Main upsell offer view
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: upsell.background_color }}
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
          {upsell.headline || "Espera! Temos uma oferta exclusiva para você"}
        </h1>

        {/* Product Image */}
        {(upsell.image_url || upsell.upsell_product?.image_url) && (
          <div className="flex justify-center mb-4">
            <img
              src={upsell.image_url || upsell.upsell_product?.image_url || ""}
              alt={upsell.upsell_product?.name}
              className="w-40 h-40 object-cover rounded-lg shadow-md"
            />
          </div>
        )}

        {/* Video */}
        {upsell.video_url && (
          <div className="mb-4 aspect-video rounded-lg overflow-hidden">
            <iframe
              src={upsell.video_url.replace("watch?v=", "embed/")}
              className="w-full h-full"
              allowFullScreen
            />
          </div>
        )}

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-2">
          {upsell.title}
        </h2>

        {/* Product Name */}
        <p className="text-center text-gray-600 mb-4">
          {upsell.upsell_product?.name}
        </p>

        {/* Description */}
        {upsell.description && (
          <p className="text-gray-600 text-center mb-4">
            {upsell.description}
          </p>
        )}

        {/* Price */}
        <div className="text-center mb-6">
          {upsell.original_price && upsell.original_price > upsell.upsell_price && (
            <p className="text-gray-400 line-through">
              De {formatPrice(upsell.original_price)}
            </p>
          )}
          <p className="text-3xl font-bold text-green-600">
            Por apenas {formatPrice(upsell.upsell_price)}
          </p>
        </div>

        {/* Accept Button */}
        <Button
          onClick={handleAccept}
          disabled={isAccepting}
          className="w-full text-white font-bold py-4 text-lg mb-3 transition-transform hover:scale-[1.02]"
          style={{ backgroundColor: upsell.button_color }}
        >
          {isAccepting ? "Processando..." : upsell.button_text}
        </Button>

        {/* Decline Button */}
        <button
          onClick={handleDecline}
          className="w-full text-center text-gray-500 text-sm underline hover:text-gray-700"
        >
          {upsell.decline_text}
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