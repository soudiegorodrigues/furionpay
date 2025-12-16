import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import { fetchAddressByCep, formatCep } from "@/lib/viaCep";
import { FormData } from "./types";

interface AddressFieldsProps {
  formData: FormData;
  setFormData: (data: FormData) => void;
  inputClassName?: string;
  labelClassName?: string;
  variant?: "light" | "dark";
}

export function AddressFields({
  formData,
  setFormData,
  inputClassName = "h-12 border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-gray-300",
  labelClassName = "text-gray-700 font-medium",
  variant = "light",
}: AddressFieldsProps) {
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  const handleCepChange = (value: string) => {
    const formatted = formatCep(value);
    setFormData({ ...formData, cep: formatted });
    setCepError(null);

    // Auto-search when CEP is complete
    if (formatted.replace(/\D/g, '').length === 8) {
      searchCep(formatted);
    }
  };

  const searchCep = async (cep: string) => {
    setIsSearchingCep(true);
    setCepError(null);

    const result = await fetchAddressByCep(cep);

    if (result) {
      setFormData({
        ...formData,
        cep: formatCep(result.cep),
        street: result.logradouro,
        neighborhood: result.bairro,
        city: result.localidade,
        state: result.uf,
        complement: formData.complement, // Keep existing complement
      });
    } else {
      setCepError("CEP não encontrado");
    }

    setIsSearchingCep(false);
  };

  const darkInputClass = variant === "dark" 
    ? "h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500"
    : inputClassName;

  const darkLabelClass = variant === "dark" ? "text-gray-300 font-medium" : labelClassName;

  return (
    <div className="space-y-4">
      {/* CEP */}
      <div className="space-y-2">
        <Label className={darkLabelClass}>CEP *</Label>
        <div className="flex gap-2">
          <Input
            value={formData.cep}
            onChange={(e) => handleCepChange(e.target.value)}
            placeholder="00000-000"
            maxLength={9}
            className={`flex-1 ${darkInputClass}`}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => searchCep(formData.cep)}
            disabled={isSearchingCep || formData.cep.replace(/\D/g, '').length !== 8}
            className={variant === "dark" ? "border-white/10 hover:bg-white/5" : ""}
          >
            {isSearchingCep ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        {cepError && (
          <p className="text-xs text-red-500">{cepError}</p>
        )}
      </div>

      {/* Street */}
      <div className="space-y-2">
        <Label className={darkLabelClass}>Endereço/Rua *</Label>
        <Input
          value={formData.street}
          onChange={(e) => setFormData({ ...formData, street: e.target.value })}
          placeholder="Nome da rua"
          className={darkInputClass}
          readOnly={!!formData.street && formData.street.length > 0}
        />
      </div>

      {/* Number + Complement */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className={darkLabelClass}>Número *</Label>
          <Input
            value={formData.number}
            onChange={(e) => setFormData({ ...formData, number: e.target.value })}
            placeholder="Nº"
            className={darkInputClass}
          />
        </div>
        <div className="space-y-2">
          <Label className={darkLabelClass}>Complemento</Label>
          <Input
            value={formData.complement}
            onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
            placeholder="Apto, Bloco..."
            className={darkInputClass}
          />
        </div>
      </div>

      {/* Neighborhood */}
      <div className="space-y-2">
        <Label className={darkLabelClass}>Bairro *</Label>
        <Input
          value={formData.neighborhood}
          onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
          placeholder="Bairro"
          className={darkInputClass}
          readOnly={!!formData.neighborhood && formData.neighborhood.length > 0}
        />
      </div>

      {/* City + State */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <Label className={darkLabelClass}>Cidade</Label>
          <Input
            value={formData.city}
            readOnly
            placeholder="Cidade"
            className={`${darkInputClass} bg-gray-50 ${variant === "dark" ? "bg-white/5" : ""}`}
          />
        </div>
        <div className="space-y-2">
          <Label className={darkLabelClass}>UF</Label>
          <Input
            value={formData.state}
            readOnly
            placeholder="UF"
            className={`${darkInputClass} bg-gray-50 ${variant === "dark" ? "bg-white/5" : ""}`}
          />
        </div>
      </div>
    </div>
  );
}
