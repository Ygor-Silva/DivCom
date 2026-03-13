'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit2, Trash2, User, Phone, Mail, FileText } from "lucide-react";
import { toast } from "sonner";
import LoadingScreen from "@/components/LoadingScreen";

type Client = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
};

type ClientStats = {
  totalSpent: number;
  visits: number;
  lastVisit: string | null;
};

export default function ClientsPage() {
  const { user, loading: authLoading } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, ClientStats>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", notes: "" });
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete Confirmation State
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatPhone = (value: string) => {
    const v = value.replace(/\D/g, '');
    const match = v.match(/^(\d{0,2})(\d{0,5})(\d{0,4})$/);
    if (!match) return value;
    
    const p1 = match[1];
    const p2 = match[2];
    const p3 = match[3];
    
    if (p3) return `(${p1}) ${p2}-${p3}`;
    if (p2) return `(${p1}) ${p2}`;
    if (p1) return `(${p1}`;
    return '';
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  useEffect(() => {
    fetchData();
  }, [user, authLoading]);

  const fetchData = async () => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch Clients
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (clientsError) throw clientsError;

      // Fetch Service Records for Stats
      const { data: recordsData, error: recordsError } = await supabase
        .from("service_records")
        .select("client_name, service_value, service_date")
        .eq("user_id", user.id);

      if (recordsError) throw recordsError;

      // Calculate Stats
      const stats: Record<string, ClientStats> = {};
      
      clientsData?.forEach(client => {
        const clientRecords = recordsData?.filter(
          r => r.client_name.toLowerCase().trim() === client.name.toLowerCase().trim()
        ) || [];

        const totalSpent = clientRecords.reduce((sum, r) => sum + Number(r.service_value), 0);
        const visits = clientRecords.length;
        
        // Find last visit
        let lastVisit = null;
        if (clientRecords.length > 0) {
          const sortedDates = clientRecords.map(r => r.service_date).sort((a, b) => b.localeCompare(a));
          lastVisit = sortedDates[0];
        }

        stats[client.id] = { totalSpent, visits, lastVisit };
      });

      setClients(clientsData || []);
      setStatsMap(stats);
    } catch (error: any) {
      console.error("Erro ao buscar clientes:", error);
      toast.error("Erro ao carregar clientes. Verifique se a tabela foi criada no banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (client?: Client) => {
    setErrors({});
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        phone: client.phone || "",
        email: client.email || "",
        notes: client.notes || ""
      });
    } else {
      setEditingClient(null);
      setFormData({ name: "", phone: "", email: "", notes: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const newErrors: { name?: string; phone?: string; email?: string } = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "O nome do cliente é obrigatório.";
    }

    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = "E-mail inválido.";
    }
    
    const phoneNumbers = formData.phone.replace(/\D/g, "");
    if (formData.phone && phoneNumbers.length < 10) {
      newErrors.phone = "Telefone inválido. Digite o DDD e o número.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSaving(true);
    try {
      if (editingClient) {
        // Update
        const { error } = await supabase
          .from("clients")
          .update({
            name: formData.name.trim(),
            phone: formData.phone.trim() || null,
            email: formData.email.trim() || null,
            notes: formData.notes.trim() || null
          })
          .eq("id", editingClient.id);
        
        if (error) throw error;
        toast.success("Cliente atualizado com sucesso!");
      } else {
        // Insert
        const { error } = await supabase
          .from("clients")
          .insert([{
            user_id: user.id,
            name: formData.name.trim(),
            phone: formData.phone.trim() || null,
            email: formData.email.trim() || null,
            notes: formData.notes.trim() || null
          }]);
        
        if (error) throw error;
        toast.success("Cliente adicionado com sucesso!");
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Erro ao salvar cliente:", error);
      toast.error("Erro ao salvar cliente.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("clients").delete().eq("id", clientToDelete.id);
      if (error) throw error;
      toast.success("Cliente excluído.");
      fetchData();
      setClientToDelete(null);
    } catch (error: any) {
      console.error("Erro ao excluir cliente:", error);
      toast.error("Erro ao excluir cliente.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery)) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) return <AppLayout><LoadingScreen /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Gestão de Clientes</h1>
            <p className="text-muted-foreground text-sm">Gerencie sua carteira de clientes e acompanhe o histórico</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 max-w-md"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">Nenhum cliente encontrado.</p>
                {searchQuery && (
                  <Button variant="link" onClick={() => setSearchQuery("")} className="mt-2">
                    Limpar busca
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead className="text-center">Visitas</TableHead>
                      <TableHead className="text-right">Ticket Médio</TableHead>
                      <TableHead className="text-right">Total Gasto</TableHead>
                      <TableHead className="text-center">Última Visita</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => {
                      const stats = statsMap[client.id] || { totalSpent: 0, visits: 0, lastVisit: null };
                      const avgTicket = stats.visits > 0 ? stats.totalSpent / stats.visits : 0;
                      
                      return (
                        <TableRow key={client.id}>
                          <TableCell>
                            <div className="font-medium">{client.name}</div>
                            {client.notes && (
                              <div className="text-xs text-muted-foreground truncate max-w-[150px]" title={client.notes}>
                                {client.notes}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {client.phone && (
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3 mr-1" /> {client.phone}
                                </div>
                              )}
                              {client.email && (
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <Mail className="h-3 w-3 mr-1" /> {client.email}
                                </div>
                              )}
                              {!client.phone && !client.email && (
                                <span className="text-xs text-muted-foreground italic">Sem contato</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center bg-accent text-accent-foreground h-6 w-6 rounded-full text-xs font-semibold">
                              {stats.visits}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            R$ {avgTicket.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-emerald-600 text-sm">
                            R$ {stats.totalSpent.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {stats.lastVisit ? new Date(stats.lastVisit + "T12:00:00").toLocaleDateString("pt-BR") : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleOpenDialog(client)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setClientToDelete(client)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 mt-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={e => {
                    setFormData({...formData, name: e.target.value});
                    if (errors.name) setErrors({...errors, name: undefined});
                  }} 
                  placeholder="Ex: Maria Silva"
                  className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={e => {
                    setFormData({...formData, phone: formatPhone(e.target.value)});
                    if (errors.phone) setErrors({...errors, phone: undefined});
                  }} 
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  className={errors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={formData.email} 
                  onChange={e => {
                    setFormData({...formData, email: e.target.value});
                    if (errors.email) setErrors({...errors, email: undefined});
                  }} 
                  placeholder="maria@email.com"
                  className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Anotações / Preferências</Label>
                <Input 
                  id="notes" 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  placeholder="Ex: Gosta de café sem açúcar, alérgica a amônia..."
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                  {isSaving ? "Salvando..." : "Salvar Cliente"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Excluir Cliente</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja excluir o cliente <strong className="text-foreground">{clientToDelete?.name}</strong>? 
                <br /><br />
                O histórico de atendimentos associado a este nome não será apagado.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setClientToDelete(null)} disabled={isDeleting}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? "Excluindo..." : "Excluir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
