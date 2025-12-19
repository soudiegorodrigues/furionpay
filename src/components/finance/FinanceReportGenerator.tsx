import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { FileText, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  date: string;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
}

type ReportType = 'income' | 'expense' | 'both';

export const FinanceReportGenerator = ({ userId }: { userId?: string }) => {
  const { user } = useAdminAuth(); const effectiveUserId = userId ?? user?.id;
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [reportType, setReportType] = useState<ReportType>('both');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [includeCategories, setIncludeCategories] = useState(true);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  // Remove [ID: uuid] from description for cleaner PDF display
  const cleanDescription = (desc: string | null): string => {
    if (!desc) return '-';
    return desc.replace(/\s*\[ID:\s*[a-f0-9-]+\]/gi, '').trim() || '-';
  };

  const generatePDF = async () => {
    if (!effectiveUserId) return;
    
    setIsGenerating(true);
    try {
      // Fetch transactions for period
      let query = supabase
        .from('finance_transactions')
        .select('*')
        .eq('user_id', effectiveUserId!)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (reportType !== 'both') {
        query = query.eq('type', reportType);
      } else {
        query = query.in('type', ['income', 'expense']);
      }

      const { data: transactions, error: txError } = await query;
      if (txError) throw txError;

      // Fetch categories
      const { data: categories, error: catError } = await supabase
        .from('finance_categories')
        .select('*')
        .eq('user_id', effectiveUserId!);
      if (catError) throw catError;

      const categoryMap = new Map(categories?.map(c => [c.id, c]) || []);

      // Create PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(0, 0, 0); // Black color
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório Financeiro', 14, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período: ${formatDate(startDate)} a ${formatDate(endDate)}`, 14, 28);
      
      // Report type badge
      const reportTypeLabel = reportType === 'income' ? 'Receitas' : reportType === 'expense' ? 'Despesas' : 'Receitas e Despesas';
      doc.text(`Tipo: ${reportTypeLabel}`, pageWidth - 14 - doc.getTextWidth(`Tipo: ${reportTypeLabel}`), 28);

      // Reset text color
      doc.setTextColor(0, 0, 0);
      
      let yPosition = 45;

      // Summary Section
      const incomeTransactions = transactions?.filter(t => t.type === 'income') || [];
      const expenseTransactions = transactions?.filter(t => t.type === 'expense') || [];
      
      const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
      const balance = totalIncome - totalExpense;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo', 14, yPosition);
      yPosition += 8;

      // Summary boxes
      doc.setFillColor(240, 253, 244); // Light green
      doc.roundedRect(14, yPosition, 55, 25, 3, 3, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(22, 163, 74);
      doc.text('Total Receitas', 18, yPosition + 8);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(totalIncome), 18, yPosition + 18);

      doc.setFillColor(254, 242, 242); // Light red
      doc.roundedRect(74, yPosition, 55, 25, 3, 3, 'F');
      doc.setTextColor(220, 38, 38);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Total Despesas', 78, yPosition + 8);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(totalExpense), 78, yPosition + 18);

      doc.setFillColor(239, 246, 255); // Light blue
      doc.roundedRect(134, yPosition, 55, 25, 3, 3, 'F');
      doc.setTextColor(balance >= 0 ? 37 : 220, balance >= 0 ? 99 : 38, balance >= 0 ? 235 : 38);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Saldo', 138, yPosition + 8);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(balance), 138, yPosition + 18);

      yPosition += 35;
      doc.setTextColor(0, 0, 0);

      // Income Table
      if (reportType !== 'expense' && incomeTransactions.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 163, 74);
        doc.text(`Receitas (${incomeTransactions.length})`, 14, yPosition);
        yPosition += 5;

        const incomeData = incomeTransactions.map(t => [
          formatDate(t.date),
          cleanDescription(t.description),
          includeCategories ? (categoryMap.get(t.category_id || '')?.name || '-') : '',
          formatCurrency(t.amount)
        ]);

        const incomeHeaders = includeCategories 
          ? ['Data', 'Descrição', 'Categoria', 'Valor']
          : ['Data', 'Descrição', 'Valor'];

        autoTable(doc, {
          startY: yPosition,
          head: [incomeHeaders],
          body: includeCategories ? incomeData : incomeData.map(row => [row[0], row[1], row[3]]),
          theme: 'striped',
          headStyles: { 
            fillColor: [22, 163, 74],
            textColor: 255,
            fontStyle: 'bold'
          },
          alternateRowStyles: { fillColor: [240, 253, 244] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
          columnStyles: includeCategories ? {
            0: { cellWidth: 25 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 35 },
            3: { cellWidth: 30, halign: 'right' }
          } : {
            0: { cellWidth: 25 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 35, halign: 'right' }
          }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }

      // Check if need new page
      if (yPosition > 250 && reportType !== 'income' && expenseTransactions.length > 0) {
        doc.addPage();
        yPosition = 20;
      }

      // Expense Table
      if (reportType !== 'income' && expenseTransactions.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text(`Despesas (${expenseTransactions.length})`, 14, yPosition);
        yPosition += 5;

        const expenseData = expenseTransactions.map(t => [
          formatDate(t.date),
          cleanDescription(t.description),
          includeCategories ? (categoryMap.get(t.category_id || '')?.name || '-') : '',
          formatCurrency(t.amount)
        ]);

        const expenseHeaders = includeCategories 
          ? ['Data', 'Descrição', 'Categoria', 'Valor']
          : ['Data', 'Descrição', 'Valor'];

        autoTable(doc, {
          startY: yPosition,
          head: [expenseHeaders],
          body: includeCategories ? expenseData : expenseData.map(row => [row[0], row[1], row[3]]),
          theme: 'striped',
          headStyles: { 
            fillColor: [220, 38, 38],
            textColor: 255,
            fontStyle: 'bold'
          },
          alternateRowStyles: { fillColor: [254, 242, 242] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
          columnStyles: includeCategories ? {
            0: { cellWidth: 25 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 35 },
            3: { cellWidth: 30, halign: 'right' }
          } : {
            0: { cellWidth: 25 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 35, halign: 'right' }
          }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }

      // Category Summary if enabled
      if (includeCategories && categories && categories.length > 0) {
        // Check if need new page
        if (yPosition > 220) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumo por Categoria', 14, yPosition);
        yPosition += 5;

        const categoryTotals = new Map<string, { name: string; type: string; total: number }>();
        
        transactions?.forEach(t => {
          const cat = categoryMap.get(t.category_id || '');
          if (cat) {
            const existing = categoryTotals.get(cat.id) || { name: cat.name, type: cat.type, total: 0 };
            existing.total += t.amount;
            categoryTotals.set(cat.id, existing);
          }
        });

        const categoryData = Array.from(categoryTotals.values())
          .sort((a, b) => b.total - a.total)
          .map(c => [
            c.name,
            c.type === 'income' ? 'Receita' : 'Despesa',
            formatCurrency(c.total)
          ]);

        if (categoryData.length > 0) {
          autoTable(doc, {
            startY: yPosition,
            head: [['Categoria', 'Tipo', 'Total']],
            body: categoryData,
            theme: 'striped',
            headStyles: { 
              fillColor: [100, 100, 100],
              textColor: 255,
              fontStyle: 'bold'
            },
            styles: { fontSize: 9 },
            margin: { left: 14, right: 14 },
            columnStyles: {
              0: { cellWidth: 'auto' },
              1: { cellWidth: 30 },
              2: { cellWidth: 35, halign: 'right' }
            }
          });

          // Pie Chart after category table
          yPosition = (doc as any).lastAutoTable.finalY + 15;

          // Check if need new page for chart
          if (yPosition > 180) {
            doc.addPage();
            yPosition = 20;
          }

          // Pie chart title
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('Distribuição por Categoria', 14, yPosition);
          yPosition += 8;

          // Colors for pie slices
          const pieColors: [number, number, number][] = [
            [22, 163, 74],   // Green
            [220, 38, 38],   // Red
            [59, 130, 246],  // Blue
            [245, 158, 11],  // Orange
            [139, 92, 246],  // Purple
            [236, 72, 153],  // Pink
            [20, 184, 166],  // Teal
            [100, 116, 139], // Gray
          ];

          // Prepare chart data (max 8 categories)
          const chartData = Array.from(categoryTotals.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 8)
            .map((c, index) => ({
              name: c.name,
              value: c.total,
              color: pieColors[index % pieColors.length]
            }));

          const total = chartData.reduce((sum, item) => sum + item.value, 0);
          
          // Chart dimensions
          const chartCenterX = 55;
          const chartCenterY = yPosition + 35;
          const chartRadius = 28;

          // Draw pie chart using arc segments
          let startAngle = -Math.PI / 2; // Start from top
          
          chartData.forEach(item => {
            const sliceAngle = (item.value / total) * 2 * Math.PI;
            const endAngle = startAngle + sliceAngle;
            
            doc.setFillColor(item.color[0], item.color[1], item.color[2]);
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.8);
            
            // Draw pie slice using small triangles approximation
            const steps = Math.max(20, Math.floor(sliceAngle * 30));
            for (let i = 0; i < steps; i++) {
              const angle1 = startAngle + (sliceAngle * i / steps);
              const angle2 = startAngle + (sliceAngle * (i + 1) / steps);
              
              doc.triangle(
                chartCenterX, chartCenterY,
                chartCenterX + chartRadius * Math.cos(angle1), chartCenterY + chartRadius * Math.sin(angle1),
                chartCenterX + chartRadius * Math.cos(angle2), chartCenterY + chartRadius * Math.sin(angle2),
                'F'
              );
            }
            
            startAngle = endAngle;
          });

          // Draw white circle border around pie
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(1);
          doc.circle(chartCenterX, chartCenterY, chartRadius, 'S');

          // Draw legend next to pie chart
          let legendY = yPosition + 5;
          const legendX = 100;
          
          chartData.forEach((item) => {
            // Colored square
            doc.setFillColor(item.color[0], item.color[1], item.color[2]);
            doc.rect(legendX, legendY - 3, 4, 4, 'F');
            
            // Category name and value
            doc.setTextColor(60, 60, 60);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            
            const percentage = ((item.value / total) * 100).toFixed(1);
            const legendText = `${item.name.substring(0, 18)}: ${formatCurrency(item.value)} (${percentage}%)`;
            doc.text(legendText, legendX + 7, legendY);
            
            legendY += 8;
          });

          yPosition = chartCenterY + chartRadius + 15;
        }
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Gerado em ${new Date().toLocaleString('pt-BR')} | FurionPay - Gestão Financeira | Página ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save PDF
      const fileName = `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: "Relatório gerado!",
        description: `Arquivo ${fileName} baixado com sucesso`
      });
      
      setShowDialog(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Tente novamente em alguns instantes",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setShowDialog(true)}
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        <span className="hidden sm:inline">Gerar Relatório</span>
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Gerar Relatório PDF
            </DialogTitle>
            <DialogDescription>
              Configure as opções do relatório financeiro
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Receitas e Despesas</SelectItem>
                  <SelectItem value="income">Apenas Receitas</SelectItem>
                  <SelectItem value="expense">Apenas Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Incluir Categorias</Label>
                <p className="text-xs text-muted-foreground">
                  Mostrar resumo por categoria
                </p>
              </div>
              <Switch 
                checked={includeCategories}
                onCheckedChange={setIncludeCategories}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={generatePDF} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
