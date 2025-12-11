import { AdminHeader } from "@/components/AdminSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Construction } from "lucide-react";

export default function AdminProducts() {
  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader title="Produtos" icon={Package} />
      
      <main className="flex-1 p-4 md:p-6 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6">
              <Construction className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Página em Produção</h2>
            <p className="text-muted-foreground mb-4">
              Estamos trabalhando para trazer a melhor experiência de gerenciamento de produtos para você.
            </p>
            <Badge variant="secondary" className="text-sm">Em breve</Badge>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
