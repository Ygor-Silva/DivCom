'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

const SERVICE_TYPES = [
  "Corte de Cabelo",
  "Coloração",
  "Escova",
  "Manicure",
  "Pedicure",
  "Barba",
  "Hidratação",
  "Progressiva",
  "Penteado",
  "Outro",
];

export default function NewRecordPage() {
  const { user } = useAuth();
  const [clientName, setClientName] = useState("");
  const [comandaId, setComandaId] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [serviceValue, setServiceValue] = useState("");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [ownerPercent, setOwnerPercent] = useState(30);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.from("salon_settings").select("owner_commission_percent").single().then(({ data }) => {
      if (data) setOwnerPercent(Number(data.owner_commission_percent));
    });
  }, []);

  const value = parseFloat(serviceValue) || 0;
  const ownerCut = value * (ownerPercent / 100);
  const commission = value - ownerCut;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase.from("service_records").insert({
        user_id: user.id,
        client_name: clientName.trim(),
        comanda_id: comandaId.trim() || null,
        service_type: serviceType,
        service_value: value,
        owner_cut: ownerCut,
        professional_commission: commission,
        service_date: serviceDate,
        notes: notes.trim() || null,
      });

      if (error) {
        console.error("Erro Supabase:", error);
        if (error.code === "42P01") {
          toast.error("Erro: A tabela 'service_records' não foi encontrada no banco de dados.");
        } else if (error.code === "42703") {
          toast.error("Erro: A coluna 'comanda_id' não existe. Você rodou o comando SQL no Supabase?");
        } else {
          toast.error(`Erro ao salvar: ${error.message}`);
        }
      } else {
        setSuccess(true);
        
        // Pré-cadastro em background para não travar a tela
        (async () => {
          try {
            const { data: existingClients, error: searchError } = await supabase
              .from("clients")
              .select("id")
              .eq("user_id", user.id)
              .ilike("name", clientName.trim())
              .limit(1);

            if (!searchError && (!existingClients || existingClients.length === 0)) {
              await supabase.from("clients").insert({
                user_id: user.id,
                name: clientName.trim(),
                notes: "Pré-cadastro automático via Novo Registro",
              });
            }
          } catch (err) {
            console.error("Erro no pré-cadastro automático:", err);
          }
        })();

        setTimeout(() => {
          setSuccess(false);
          setClientName("");
          setComandaId("");
          setServiceType("");
          setServiceValue("");
          setNotes("");
          setServiceDate(new Date().toISOString().split("T")[0]);
        }, 1500);
      }
    } catch (err: any) {
      console.error("Erro inesperado:", err);
      toast.error("Ocorreu um erro inesperado. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
          <CheckCircle2 className="h-16 w-16 text-primary mb-4" />
          <h2 className="text-xl font-bold">Registro salvo!</h2>
          <p className="text-muted-foreground text-sm">Atendimento registrado com sucesso.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Novo Registro</h1>
          <p className="text-muted-foreground text-sm">Registre um atendimento realizado</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Nome do Cliente</Label>
                  <Input
                    id="client"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Maria Silva"
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comanda">N° da Comanda</Label>
                  <Input
                    id="comanda"
                    value={comandaId}
                    onChange={(e) => setComandaId(e.target.value)}
                    placeholder="001"
                    maxLength={50}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Serviço</Label>
                  <Select value={serviceType} onValueChange={setServiceType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Valor do Serviço (R$)</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={serviceValue}
                    onChange={(e) => setServiceValue(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {value > 0 && (
                <Card className="bg-accent border-0">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-accent-foreground mb-2">Divisão automática</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Dono ({ownerPercent}%)</span>
                      <span className="font-semibold">R$ {ownerCut.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Sua Comissão ({100 - ownerPercent}%)</span>
                      <span className="font-bold text-primary">R$ {commission.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalhes adicionais..."
                  maxLength={500}
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || !serviceType}>
                {loading ? "Salvando..." : "Registrar Atendimento"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
