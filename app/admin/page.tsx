'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Settings, Users, DollarSign } from "lucide-react";

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [ownerPercent, setOwnerPercent] = useState("30");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOwnerCut, setTotalOwnerCut] = useState(0);
  const [loading, setLoading] = useState(false);

  // New user creation
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (!isAdmin) return;

    supabase.from("salon_settings").select("*").single().then(({ data }) => {
      if (data) setOwnerPercent(String(data.owner_commission_percent));
    });

    supabase.from("profiles").select("*").then(({ data }) => {
      setProfiles(data || []);
    });

    supabase.from("service_records").select("service_value, owner_cut").then(({ data }) => {
      if (data) {
        setTotalRevenue(data.reduce((s, r) => s + Number(r.service_value), 0));
        setTotalOwnerCut(data.reduce((s, r) => s + Number(r.owner_cut), 0));
      }
    });
  }, [isAdmin]);

  const handleSaveSettings = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("salon_settings")
      .update({ owner_commission_percent: parseFloat(ownerPercent) })
      .not("id", "is", null);

    if (error) toast.error("Erro ao salvar.");
    else toast.success("Configurações salvas!");
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: newEmail,
      password: newPassword,
      options: { data: { full_name: newName } },
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Usuário ${newEmail} criado!`);
      setNewEmail("");
      setNewPassword("");
      setNewName("");
    }
    setLoading(false);
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Acesso restrito a administradores.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Painel Admin</h1>
          <p className="text-muted-foreground text-sm">Gerencie o salão</p>
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">Faturamento Total</p>
              </div>
              <p className="text-xl font-bold">R$ {totalRevenue.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Parte do Dono</p>
              <p className="text-xl font-bold text-primary">R$ {totalOwnerCut.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Profissionais</p>
              <p className="text-xl font-bold">{profiles.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" /> Comissão do Dono
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <div className="space-y-2 flex-1">
                <Label>Porcentagem (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={ownerPercent}
                  onChange={(e) => setOwnerPercent(e.target.value)}
                />
              </div>
              <Button onClick={handleSaveSettings} disabled={loading}>
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Create User */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Criar Novo Usuário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome" required />
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" required />
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Senha" required minLength={6} />
              </div>
              <Button type="submit" disabled={loading}>Criar Usuário</Button>
            </form>
          </CardContent>
        </Card>

        {/* Professionals list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profissionais Cadastrados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Especialidade</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">{p.full_name || "—"}</TableCell>
                      <TableCell className="text-sm">{p.specialty || "—"}</TableCell>
                      <TableCell className="text-sm">{p.phone || "—"}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${p.profile_completed ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>
                          {p.profile_completed ? "Completo" : "Pendente"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
