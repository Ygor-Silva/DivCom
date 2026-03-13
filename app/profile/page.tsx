'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [monthlyGoal, setMonthlyGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Helper functions for masking
  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(-\d{4})\d+?$/, "$1");
  };

  const maskCpfCnpj = (value: string) => {
    const raw = value.replace(/\D/g, "");
    if (raw.length <= 11) {
      // CPF
      return raw
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})/, "$1-$2")
        .replace(/(-\d{2})\d+?$/, "$1");
    } else {
      // CNPJ
      return raw
        .replace(/(\d{2})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1/$2")
        .replace(/(\d{4})(\d{1,2})/, "$1-$2")
        .replace(/(-\d{2})\d+?$/, "$1");
    }
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setCpfCnpj(maskCpfCnpj(profile.cpf_cnpj || ""));
      setPhone(maskPhone(profile.phone || ""));
      setSpecialty(profile.specialty || "");
      setBio(profile.bio || "");
      setMonthlyGoal(profile.monthly_goal?.toString() || "");
      setAvatarPreview(profile.avatar_url || null);
    }
  }, [profile]);

  const getInitials = (name?: string | null) => {
    if (!name) return "P";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`; // Corrected: putting file inside user ID folder

    try {
      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        if (uploadError.message.includes("Bucket not found")) {
          toast.error("Erro: O bucket 'avatars' não foi criado no Supabase Storage.");
          throw new Error("Bucket 'avatars' not found. Please create it in Supabase Dashboard.");
        }
        throw uploadError;
      }

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // 3. Update Profile in DB
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setAvatarPreview(publicUrl);
      await refreshProfile();
      toast.success("Foto de perfil atualizada!");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error("Erro ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const isCompleted = !!(fullName.trim() && phone.trim() && specialty.trim());
      
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          cpf_cnpj: cpfCnpj.trim(),
          phone: phone.trim(),
          specialty: specialty.trim(),
          bio: bio.trim(),
          monthly_goal: monthlyGoal ? parseFloat(monthlyGoal) : null,
          profile_completed: isCompleted,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Perfil atualizado!");
      await refreshProfile();
      
      if (isCompleted) {
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error("Erro ao salvar perfil.");
    } finally {
      setLoading(false);
    }
  };

  const isIncomplete = !profile?.profile_completed;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          {isIncomplete && (
            <p className="text-orange-500 text-sm font-medium mt-1">
              ⚠️ Complete seu perfil para começar a usar o sistema.
            </p>
          )}
        </div>

        <Card>
          <CardContent className="pt-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative group">
                <Avatar className="h-24 w-24">
                  {avatarPreview ? (
                    <AvatarImage src={avatarPreview} alt="Avatar" />
                  ) : null}
                  <AvatarFallback className="bg-accent text-accent-foreground text-2xl font-bold">
                    {getInitials(fullName || profile?.full_name || "")}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 rounded-full bg-foreground/0 group-hover:bg-foreground/40 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Camera className="h-6 w-6 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {uploading ? "Enviando..." : "Clique na foto para alterar"}
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label>CPF/CNPJ</Label>
                  <Input value={cpfCnpj} onChange={(e) => setCpfCnpj(maskCpfCnpj(e.target.value))} maxLength={18} placeholder="000.000.000-00" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone *</Label>
                  <Input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} required maxLength={15} placeholder="(11) 99999-0000" />
                </div>
                <div className="space-y-2">
                  <Label>Especialidade Principal *</Label>
                  <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} required maxLength={50} placeholder="Colorista, Barbeiro..." />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mini-bio</Label>
                  <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} rows={3} placeholder="Conte um pouco sobre você..." />
                </div>
                <div className="space-y-2">
                  <Label>Meta Mensal de Faturamento (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={monthlyGoal} onChange={(e) => setMonthlyGoal(e.target.value)} placeholder="Ex: 5000.00" />
                  <p className="text-[10px] text-muted-foreground">Defina uma meta para acompanhar no seu Dashboard.</p>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Salvando..." : "Salvar Perfil"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
