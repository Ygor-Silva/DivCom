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
  const [filterDate, setFilterDate] = useState("");
  const [filterType, setFilterType] = useState("all");
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

        if (filterDate) query = query.eq("service_date", filterDate);
        if (filterType && filterType !== "all") query = query.eq("service_type", filterType);

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
  }, [user, authLoading, filterDate, filterType]);

  const serviceTypes = [...new Set(records.map((r) => r.service_type))];

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
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("DiviCom", 15, 15);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Gestão de Comissões", 15, 21);
    
    doc.text(`Gerado em: ${today}`, pageWidth - 15, 15, { align: "right" });

    // Content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Atendimentos", 15, 40);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const professionalName = profile?.full_name || user?.email || "Profissional";
    const specialty = profile?.specialty ? ` — ${profile.specialty}` : "";
    doc.text(`Profissional: ${professionalName}${specialty}`, 15, 48);

    // Table
    const tableHeaders = [["Comanda", "Data", "Cliente", "Serviço", "Valor", "Comissão", "Obs"]];
    const tableData = records.map(r => [
      r.comanda_id || "-",
      new Date(r.service_date + "T12:00:00").toLocaleDateString("pt-BR"),
      r.client_name,
      r.service_type,
      `R$ ${Number(r.service_value).toFixed(2)}`,
      `R$ ${Number(r.professional_commission).toFixed(2)}`,
      r.notes || ""
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: 55,
      theme: "grid",
      headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        4: { halign: "right" },
        5: { halign: "right" }
      }
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const totalValue = records.reduce((acc, r) => acc + Number(r.service_value), 0);
    const totalCommission = records.reduce((acc, r) => acc + Number(r.professional_commission), 0);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Total: R$ ${totalValue.toFixed(2)}`, pageWidth - 15, finalY, { align: "right" });
    doc.setTextColor(34, 197, 94);
    doc.text(`Comissão Total: R$ ${totalCommission.toFixed(2)}`, pageWidth - 15, finalY + 7, { align: "right" });

    // Footer
    doc.setFillColor(34, 197, 94);
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
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="pl-10"
                placeholder="Filtrar por data"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipo de serviço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {serviceTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={records.length === 0}>
              <TableIcon className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportPDF} disabled={records.length === 0}>
              <FileText className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
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
