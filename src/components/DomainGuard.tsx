import { ReactNode } from "react";
import { Navigate } from "react-router-dom";

interface DomainGuardProps {
  children: ReactNode;
}

// Lista de domínios permitidos para acessar o painel admin
const ALLOWED_ADMIN_DOMAINS = [
  "app.furionpay.com",
  "localhost",
  "127.0.0.1",
  // Domínios de preview do Lovable
  ".lovable.app",
  ".lovableproject.com"
];

const isAllowedDomain = (): boolean => {
  const hostname = window.location.hostname;
  
  return ALLOWED_ADMIN_DOMAINS.some(domain => {
    if (domain.startsWith(".")) {
      // Verifica se termina com o domínio (ex: .lovable.app)
      return hostname.endsWith(domain) || hostname === domain.slice(1);
    }
    return hostname === domain;
  });
};

export const DomainGuard = ({ children }: DomainGuardProps) => {
  if (!isAllowedDomain()) {
    // Redireciona para a página principal (que será o checkout)
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
