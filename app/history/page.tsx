'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, FileText, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import LoadingScreen from "@/components/LoadingScreen";

export default function HistoryPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      console.log("Iniciando busca de histórico...", { authLoading, userId: user?.id });
      if (authLoading) return;
      if (!user) {
        console.log("Usuário não autenticado no histórico.");
        setLoading(false);
        return;
      }

      try {
        console.log("Executando query no Supabase...");
        let query = supabase
          .from("service_records")
          .select("*")
          .order("service_date", { ascending: false });

        if (startDate) query = query.gte("service_date", startDate);
        if (endDate) query = query.lte("service_date", endDate);
        if (filterType && filterType !== "all") query = query.eq("service_type", filterType);
        if (minValue) query = query.gte("service_value", parseFloat(minValue));
        if (maxValue) query = query.lte("service_value", parseFloat(maxValue));
        if (searchQuery) query = query.ilike("client_name", `%${searchQuery}%`);

        const { data, error } = await query;
        
        if (error) {
          console.error("Erro ao buscar histórico:", error);
          toast.error(`Erro ao carregar histórico: ${error.message}`);
          setRecords([]);
        } else {
          setRecords(data || []);
        }
      } catch (err) {
        console.error("Erro inesperado no histórico:", err);
        toast.error("Erro inesperado ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user, authLoading, startDate, endDate, filterType, minValue, maxValue, searchQuery]);

  const serviceTypes = [
    "Corte de Cabelo", "Coloração", "Escova", "Manicure", "Pedicure", 
    "Barba", "Hidratação", "Progressiva", "Penteado", "Outro"
  ];

  const exportCSV = () => {
    if (records.length === 0) return;
    
    const headers = ["Comanda", "Data", "Cliente", "Serviço", "Valor", "Comissão", "Obs"];
    const rows = records.map(r => [
      r.comanda_id || "-",
      new Date(r.service_date + "T12:00:00").toLocaleDateString("pt-BR"),
      r.client_name,
      r.service_type,
      `R$ ${Number(r.service_value).toFixed(2)}`,
      `R$ ${Number(r.professional_commission).toFixed(2)}`,
      r.notes || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `historico_divicom_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exportado com sucesso!");
  };

  const exportPDF = () => {
    if (records.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const today = new Date().toLocaleDateString("pt-BR");

    // Header
    doc.setFillColor(34, 197, 94); // emerald-600
    doc.rect(0, 0, pageWidth, 25, "F");
    
    // Add Logo (using base64 or text if image is not available)
    // For simplicity and reliability in jsPDF without external image loading issues, 
    // we'll create a stylized text logo that mimics the DiviCom identity
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("DIVICOM", 15, 17);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Gestão de Comissões", 55, 17);
    
    doc.text(`Gerado em: ${today}`, pageWidth - 15, 15, { align: "right" });

    // Content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório Consolidado de Atendimentos", 15, 40);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const professionalName = profile?.full_name || user?.email || "Profissional";
    const specialty = profile?.specialty ? ` — ${profile.specialty}` : "";
    doc.text(`Profissional: ${professionalName}${specialty}`, 15, 48);

    // Summary Metrics
    const totalValue = records.reduce((acc, r) => acc + Number(r.service_value), 0);
    const totalCommission = records.reduce((acc, r) => acc + Number(r.professional_commission), 0);
    const totalServices = records.length;
    const avgTicket = totalServices > 0 ? totalValue / totalServices : 0;

    doc.setFillColor(244, 244, 245); // zinc-100
    doc.rect(15, 55, pageWidth - 30, 25, "F");
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo do Período", 20, 62);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Total de Atendimentos: ${totalServices}`, 20, 70);
    doc.text(`Ticket Médio: R$ ${avgTicket.toFixed(2)}`, 20, 75);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Faturamento Total: R$ ${totalValue.toFixed(2)}`, pageWidth / 2, 70);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text(`Sua Comissão: R$ ${totalCommission.toFixed(2)}`, pageWidth / 2, 75);

    // Table
    const tableHeaders = [["Data", "Cliente", "Serviço", "Valor", "Comissão"]];
    const tableData = records.map(r => [
      new Date(r.service_date + "T12:00:00").toLocaleDateString("pt-BR"),
      r.client_name,
      r.service_type,
      `R$ ${Number(r.service_value).toFixed(2)}`,
      `R$ ${Number(r.professional_commission).toFixed(2)}`
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: 85,
      theme: "grid",
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        3: { halign: "right" },
        4: { halign: "right" }
      }
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Total: R$ ${totalValue.toFixed(2)}`, pageWidth - 15, finalY, { align: "right" });
    doc.setTextColor(5, 150, 105);
    doc.text(`Comissão Total: R$ ${totalCommission.toFixed(2)}`, pageWidth - 15, finalY + 7, { align: "right" });

    // Footer
    doc.setFillColor(5, 150, 105);
    doc.rect(0, pageHeight - 15, pageWidth, 15, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text("DiviCom — Gestão Inteligente de Comissões", pageWidth / 2, pageHeight - 7, { align: "center" });

    doc.save(`relatorio_divicom_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF exportado com sucesso!");
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingScreen />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Histórico</h1>
          <p className="text-muted-foreground text-sm">Todos os seus atendimentos</p>
        </div>

        {/* Filters and Exports */}
        <div className="flex flex-col gap-4">
          <Card className="bg-muted/40 border-dashed">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Busca por Cliente */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Buscar Cliente</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-sm"
                      placeholder="Nome do cliente..."
                    />
                  </div>
                </div>

                {/* Tipo de Serviço */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Serviço</label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Todos os serviços" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os serviços</SelectItem>
                      {serviceTypes.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Período */}
                <div className="space-y-1.5 lg:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Período</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-9 text-sm"
                    />
                    <span className="text-muted-foreground text-sm">até</span>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Faixa de Valor */}
                <div className="space-y-1.5 lg:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Faixa de Valor (R$)</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Mínimo"
                      value={minValue}
                      onChange={(e) => setMinValue(e.target.value)}
                      className="h-9 text-sm"
                    />
                    <span className="text-muted-foreground text-sm">-</span>
                    <Input
                      type="number"
                      placeholder="Máximo"
                      value={maxValue}
                      onChange={(e) => setMaxValue(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                
                {/* Botões de Ação */}
                <div className="lg:col-span-2 flex items-end justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-9 text-xs"
                    onClick={() => {
                      setSearchQuery("");
                      setStartDate("");
                      setEndDate("");
                      setFilterType("all");
                      setMinValue("");
                      setMaxValue("");
                    }}
                  >
                    Limpar Filtros
                  </Button>
                  <Button variant="outline" size="sm" className="h-9" onClick={exportCSV} disabled={records.length === 0}>
                    <TableIcon className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="default" size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700" onClick={exportPDF} disabled={records.length === 0}>
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar Relatório PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {records.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Nenhum registro encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Comanda</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead>Obs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm font-medium">
                          {r.comanda_id || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(r.service_date + "T12:00:00").toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{r.client_name}</TableCell>
                        <TableCell className="text-sm">
                          <span className="px-2 py-0.5 rounded-full bg-accent text-[10px] font-medium">
                            {r.service_type}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">R$ {Number(r.service_value).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-sm font-semibold text-primary">
                          R$ {Number(r.professional_commission).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                          {r.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
