import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CollapsibleSectionCardProps {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

export function CollapsibleSectionCard({
  id,
  icon: Icon,
  title,
  description,
  children,
  isOpen,
  onToggle,
}: CollapsibleSectionCardProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-base">{title}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
              <ChevronDown 
                className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180"
                )} 
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-6">
            <div className="border-t pt-6">
              {children}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
