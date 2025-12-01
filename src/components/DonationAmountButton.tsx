import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DonationAmountButtonProps {
  amount: number;
  isSelected: boolean;
  isMostChosen?: boolean;
  onClick: () => void;
}

export const DonationAmountButton = ({
  amount,
  isSelected,
  isMostChosen = false,
  onClick,
}: DonationAmountButtonProps) => {
  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(amount);

  return (
    <div className="relative">
      {isMostChosen && (
        <span className="absolute -top-2 left-1.5 sm:left-2 z-10 rounded-md bg-badge px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-badge-foreground shadow-sm">
          Mais escolhido
        </span>
      )}
      <Button
        variant={isSelected ? "donationSelected" : "donation"}
        size="donation"
        onClick={onClick}
        className={cn(
          "w-full text-sm sm:text-base py-2.5 sm:py-3",
          isMostChosen && !isSelected && "border-primary/50"
        )}
      >
        {formattedAmount}
      </Button>
    </div>
  );
};
