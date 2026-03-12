'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { DollarSign, TrendingUp, Scissors, Calendar, ArrowRight, Info } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import LoadingScreen from "@/components/LoadingScreen";

type DailyData = { date: string; fullDate: string; total: number };

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isStatDialogOpen, setIsStatDialogOpen] = useState(false);
  const [isDayDialogOpen, setIsDayDialogOpen] = useState(false);

  useEffect(() => {
    const fetchRecords = async () => {
      if (!user) return;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

      const { data } = await supabase
        .from("service_records")
        .select("*")
        .gte("service_date", startOfMonth)
        .order("service_date", { ascending: false });

      setRecords(data || []);
      setLoading(false);
    };
    fetchRecords();
  }, [user]);

  const totalRevenue = records.reduce((sum, r) => sum + Number(r.service_value), 0);
  const totalCommission = records.reduce((sum, r) => sum + Number(r.professional_commission), 0);
  const totalServices = records.length;
  const averageTicket = totalServices > 0 ? totalRevenue / totalServices : 0;
  const averageCommission = totalServices > 0 ? totalCommission / totalServices : 0;
  const uniqueDays = new Set(records.map(r => r.service_date)).size;

  // Group by day for chart
  const dailyMap: Record<string, number> = {};
  records.forEach((r) => {
    const day = r.service_date;
    dailyMap[day] = (dailyMap[day] || 0) + (isAdmin ? Number(r.service_value) : Number(r.professional_commission));
  });
  
  const chartData: DailyData[] = Object.entries(dailyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, total]) => ({
      date: new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      fullDate: date,
      total,
    }));

  const stats = [
    {
      id: "revenue",
      title: isAdmin ? "Faturamento Total" : "Meus Ganhos",
      value: `R$ ${(isAdmin ? totalRevenue : totalCommission).toFixed(2)}`,
      footer: `Total serviços: R$ ${totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30"
    },
    {
      id: "commission",
      title: isAdmin ? "Comissões Pagas" : "Valor dos Serviços",
      value: `R$ ${(isAdmin ? totalCommission : totalRevenue).toFixed(2)}`,
      footer: `Comissão média: R$ ${averageCommission.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10"
    },
    {
      id: "services",
      title: "Atendimentos",
      value: totalServices.toString(),
      footer: `Ticket médio: R$ ${averageTicket.toFixed(2)}`,
      icon: Scissors,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10"
    },
    {
      id: "period",
      title: "Período",
      value: new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).toLowerCase(),
      footer: `${uniqueDays} dias com atendimento`,
      icon: Calendar,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10"
    },
  ];

  const handleStatClick = (statId: string) => {
    if (statId === "period") return;
    setSelectedStat(statId);
    setIsStatDialogOpen(true);
  };

  const handleBarClick = (data: any) => {
    setSelectedDay(data.fullDate);
    setIsDayDialogOpen(true);
  };

  const dayRecords = records.filter(r => r.service_date === selectedDay);

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Resumo do mês atual</p>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
          </Badge>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            const isClickable = stat.id !== "period";
            return (
              <Card 
                key={i} 
                className={cn(
                  "animate-fade-in transition-all duration-200 border-2",
                  stat.borderColor || "border-border/40",
                  isClickable && "cursor-pointer hover:shadow-md hover:-translate-y-1 active:scale-95"
                )}
                style={{ animationDelay: `${i * 80}ms` }}
                onClick={() => isClickable && handleStatClick(stat.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", stat.bg)}>
                      <Icon className={cn("h-5 w-5", stat.color)} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-xl font-bold tracking-tight text-foreground">{loading ? "..." : stat.value}</p>
                  <div className="mt-3 pt-2 border-t border-border/50">
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {loading ? "..." : stat.footer}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Chart */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Ganhos Diários</CardTitle>
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </CardHeader>
          <CardContent className="pt-4">
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">Nenhum registro neste mês ainda.</p>
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }} 
                      stroke="hsl(var(--muted-foreground))"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }} 
                      stroke="hsl(var(--muted-foreground))"
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--accent))', opacity: 0.4 }}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                      }}
                      formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, "Total"]}
                    />
                    <Bar 
                      dataKey="total" 
                      radius={[4, 4, 0, 0]} 
                      onClick={handleBarClick}
                      className="cursor-pointer"
                    >
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.fullDate === new Date().toISOString().split('T')[0] ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.6)"}
                          className="hover:fill-primary transition-colors"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="text-[10px] text-center text-muted-foreground mt-4">
              Dica: Clique em uma barra para ver os detalhes do dia.
            </p>
          </CardContent>
        </Card>

        {/* Stat Details Dialog */}
        <Dialog open={isStatDialogOpen} onOpenChange={setIsStatDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedStat === "revenue" ? "Detalhamento de Faturamento" : "Detalhamento de Serviços"}
              </DialogTitle>
              <DialogDescription>
                Lista completa de registros que compõem o valor total deste mês.
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-xs">
                        {new Date(record.service_date + "T12:00:00").toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="font-medium">{record.client_name}</TableCell>
                      <TableCell>{record.service_type}</TableCell>
                      <TableCell className="text-right">
                        R$ {Number(record.service_value).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        R$ {Number(record.professional_commission).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        {/* Day Details Dialog */}
        <Dialog open={isDayDialogOpen} onOpenChange={setIsDayDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                Atendimentos de {selectedDay ? new Date(selectedDay + "T12:00:00").toLocaleDateString("pt-BR") : ""}
              </DialogTitle>
              <DialogDescription>
                Serviços realizados nesta data específica.
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4">
              {dayRecords.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhum registro para este dia.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      {!isAdmin && <TableHead className="text-right">Sua Comiss.</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dayRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.client_name}</TableCell>
                        <TableCell>{record.service_type}</TableCell>
                        <TableCell className="text-right">
                          R$ {Number(record.service_value).toFixed(2)}
                        </TableCell>
                        {!isAdmin && (
                          <TableCell className="text-right text-emerald-600 font-semibold">
                            R$ {Number(record.professional_commission).toFixed(2)}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(" ");
