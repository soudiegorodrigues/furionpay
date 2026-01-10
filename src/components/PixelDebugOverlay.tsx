import { useEffect, useState } from "react";
import { usePixel } from "./MetaPixelProvider";
import { X, Bug, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";

interface PixelDebugOverlayProps {
  enabled?: boolean;
}

export const PixelDebugOverlay = ({ enabled }: PixelDebugOverlayProps) => {
  const { debugStatus, isLoaded } = usePixel();
  const [isOpen, setIsOpen] = useState(false);
  const [fbqExists, setFbqExists] = useState(false);
  const [scriptTagExists, setScriptTagExists] = useState(false);

  // Check if overlay should be enabled via URL param
  const shouldShow = enabled || new URLSearchParams(window.location.search).get('pixel_debug') === '1';

  useEffect(() => {
    if (!shouldShow) return;

    // Check for window.fbq and script tag
    const checkPixelState = () => {
      setFbqExists(typeof window !== 'undefined' && typeof window.fbq === 'function');
      setScriptTagExists(!!document.querySelector('script[src*="fbevents.js"]'));
    };

    checkPixelState();
    const interval = setInterval(checkPixelState, 1000);

    return () => clearInterval(interval);
  }, [shouldShow]);

  if (!shouldShow) return null;

  const StatusIcon = ({ ok }: { ok: boolean | null }) => {
    if (ok === null) return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
    return ok ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getOverallStatus = () => {
    if (debugStatus.scriptError) return { status: 'error', message: 'Script Bloqueado', color: 'bg-red-500' };
    if (!debugStatus.pixelIds.length) return { status: 'warning', message: 'Sem Pixels', color: 'bg-yellow-500' };
    if (!debugStatus.scriptLoaded && debugStatus.scriptInjected) return { status: 'loading', message: 'Carregando...', color: 'bg-blue-500' };
    if (debugStatus.scriptLoaded && fbqExists) return { status: 'ok', message: 'Pixel OK', color: 'bg-green-500' };
    return { status: 'unknown', message: 'Verificando...', color: 'bg-gray-500' };
  };

  const overall = getOverallStatus();

  // Minimized button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 z-[9999] ${overall.color} text-white px-3 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium hover:opacity-90 transition-opacity`}
      >
        <Bug className="w-4 h-4" />
        {overall.message}
      </button>
    );
  }

  // Full overlay
  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-80 bg-black/95 text-white rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className={`${overall.color} px-4 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4" />
          <span className="font-semibold text-sm">Pixel Debug</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 rounded p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 text-sm">
        {/* Pixel IDs */}
        <div className="flex items-start gap-2">
          <StatusIcon ok={debugStatus.pixelIds.length > 0} />
          <div className="flex-1">
            <div className="font-medium text-gray-300">Pixel IDs</div>
            <div className="text-gray-400 font-mono text-xs break-all">
              {debugStatus.pixelIds.length > 0 
                ? debugStatus.pixelIds.join(', ') 
                : 'Nenhum pixel configurado'}
            </div>
          </div>
        </div>

        {/* Script Injected */}
        <div className="flex items-center gap-2">
          <StatusIcon ok={debugStatus.scriptInjected} />
          <div>
            <span className="text-gray-300">Script Injetado:</span>
            <span className={`ml-2 ${debugStatus.scriptInjected ? 'text-green-400' : 'text-red-400'}`}>
              {debugStatus.scriptInjected ? 'Sim' : 'Não'}
            </span>
          </div>
        </div>

        {/* Script Loaded */}
        <div className="flex items-center gap-2">
          <StatusIcon ok={debugStatus.scriptInjected ? debugStatus.scriptLoaded : null} />
          <div>
            <span className="text-gray-300">Script Carregado:</span>
            <span className={`ml-2 ${debugStatus.scriptLoaded ? 'text-green-400' : 'text-yellow-400'}`}>
              {debugStatus.scriptLoaded ? 'Sim' : 'Aguardando...'}
            </span>
          </div>
        </div>

        {/* Script Tag in DOM */}
        <div className="flex items-center gap-2">
          <StatusIcon ok={scriptTagExists} />
          <div>
            <span className="text-gray-300">Tag no DOM:</span>
            <span className={`ml-2 ${scriptTagExists ? 'text-green-400' : 'text-red-400'}`}>
              {scriptTagExists ? 'Presente' : 'Ausente'}
            </span>
          </div>
        </div>

        {/* window.fbq exists */}
        <div className="flex items-center gap-2">
          <StatusIcon ok={fbqExists} />
          <div>
            <span className="text-gray-300">window.fbq:</span>
            <span className={`ml-2 ${fbqExists ? 'text-green-400' : 'text-red-400'}`}>
              {fbqExists ? 'Disponível' : 'Indisponível'}
            </span>
          </div>
        </div>

        {/* Pending Events */}
        {debugStatus.pendingEventsCount > 0 && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <div>
              <span className="text-gray-300">Eventos na Fila:</span>
              <span className="ml-2 text-yellow-400">{debugStatus.pendingEventsCount}</span>
            </div>
          </div>
        )}

        {/* Error */}
        {debugStatus.scriptError && (
          <div className="bg-red-900/50 rounded p-2 text-xs">
            <div className="flex items-center gap-2 text-red-400 font-medium mb-1">
              <XCircle className="w-4 h-4" />
              Erro Detectado
            </div>
            <div className="text-red-300">{debugStatus.scriptError}</div>
            <div className="mt-2 text-gray-400">
              Possíveis causas:
              <ul className="list-disc list-inside mt-1 text-xs">
                <li>Ad-blocker ativo</li>
                <li>Brave Shields / Firefox Enhanced Tracking</li>
                <li>Extensões de privacidade</li>
                <li>CSP do domínio</li>
              </ul>
            </div>
          </div>
        )}

        {/* Provider Loaded */}
        <div className="pt-2 border-t border-gray-700 flex items-center gap-2">
          <StatusIcon ok={isLoaded} />
          <div>
            <span className="text-gray-300">Provider Pronto:</span>
            <span className={`ml-2 ${isLoaded ? 'text-green-400' : 'text-yellow-400'}`}>
              {isLoaded ? 'Sim' : 'Não'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-900 text-xs text-gray-500">
        Adicione <code className="bg-gray-800 px-1 rounded">?pixel_debug=1</code> na URL para ver este painel
      </div>
    </div>
  );
};
