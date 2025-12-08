import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  Globe, 
  CreditCard, 
  Users, 
  FileText, 
  Percent, 
  Palette 
} from "lucide-react";

const adminSections = [
  { title: "Faturamento Global", icon: DollarSign },
  { title: "Domínios", icon: Globe },
  { title: "Multi-adquirência", icon: CreditCard },
  { title: "Usuários", icon: Users },
  { title: "Documentos", icon: FileText },
  { title: "Taxas", icon: Percent },
  { title: "Personalização", icon: Palette },
];

const Admin = () => {
  return (
    <AdminLayout title="Admin">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Painel Admin</h1>
        
        <div className="flex flex-wrap gap-3">
          {adminSections.map((section) => (
            <Button
              key={section.title}
              variant="outline"
              className="flex items-center gap-2"
            >
              <section.icon className="h-4 w-4" />
              {section.title}
            </Button>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Admin;
