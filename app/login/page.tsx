'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Percent } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      return searchParams.get('type') === 'recovery';
    }
    return false;
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isResettingPassword) {
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      if (password.length < 6 || !hasSpecialChar) {
        toast.error("A senha deve ter pelo menos 6 caracteres e um caractere especial.");
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        toast.error("As senhas não coincidem.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        if (error.message === 'Failed to fetch') {
          toast.error("Erro de conexão. Verifique se o Supabase está configurado corretamente.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Senha atualizada com sucesso!");
        setIsResettingPassword(false);
        router.push("/dashboard");
      }
      setLoading(false);
      return;
    }

    if (isForgotPassword) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?type=recovery`,
      });
      if (error) {
        if (error.message === 'Failed to fetch') {
          toast.error("Erro de conexão. Verifique se o Supabase está configurado corretamente.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
        setIsForgotPassword(false);
      }
      setLoading(false);
      return;
    }

    if (isSignUp) {
      // Password validation
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      if (password.length < 6 || !hasSpecialChar) {
        toast.error("A senha deve ter pelo menos 6 caracteres e um caractere especial.");
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        toast.error("As senhas não coincidem.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        if (error.message === 'Failed to fetch') {
          toast.error("Erro de conexão. Verifique se o Supabase está configurado corretamente.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Conta criada! Verifique seu email.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message === 'Failed to fetch') {
          toast.error("Erro de conexão. Verifique se o Supabase está configurado corretamente.");
        } else {
          toast.error("Email ou senha incorretos.");
        }
      } else {
        router.push("/dashboard");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md animate-slide-up">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-600 flex items-center justify-center mb-2 shadow-xl shadow-emerald-600/20">
            <Percent className="text-white h-8 w-8" strokeWidth={3} />
          </div>
          <div className="flex flex-col items-center">
            <span className="font-black text-3xl tracking-tighter leading-none text-foreground">DIVCOM</span>
            <span className="text-xs font-bold text-emerald-600 tracking-[0.3em] leading-none mt-1">SISTEMAS</span>
          </div>
          <CardDescription className="pt-2">
            {isResettingPassword
              ? "Defina sua nova senha"
              : isForgotPassword 
                ? "Recupere o acesso à sua conta" 
                : isSignUp 
                  ? "Crie sua conta profissional" 
                  : "Acesse sua conta"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isResettingPassword && !isForgotPassword && isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </div>
            )}
            {!isResettingPassword && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
            )}
            {!isForgotPassword && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">
                    {isResettingPassword ? "Nova Senha" : "Senha"}
                  </Label>
                  {!isSignUp && !isResettingPassword && (
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-[10px] text-emerald-600 hover:underline font-medium"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                {(isSignUp || isResettingPassword) && (
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Mínimo de 6 caracteres e pelo menos um caractere especial (ex: @, #, $, %).
                  </p>
                )}
              </div>
            )}
            {!isForgotPassword && (isSignUp || isResettingPassword) && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  {isResettingPassword ? "Confirmar Nova Senha" : "Confirmar Senha"}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading 
                ? "Carregando..." 
                : isResettingPassword
                  ? "Atualizar Senha"
                  : isForgotPassword 
                    ? "Enviar link de recuperação" 
                    : isSignUp 
                      ? "Criar conta" 
                      : "Entrar"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            {isResettingPassword ? (
              <button
                onClick={() => setIsResettingPassword(false)}
                className="text-primary font-medium hover:underline"
              >
                Voltar para o login
              </button>
            ) : isForgotPassword ? (
              <button
                onClick={() => setIsForgotPassword(false)}
                className="text-primary font-medium hover:underline"
              >
                Voltar para o login
              </button>
            ) : (
              <>
                {isSignUp ? "Já tem conta?" : "Não tem conta?"}{" "}
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-primary font-medium hover:underline"
                >
                  {isSignUp ? "Faça login" : "Cadastre-se"}
                </button>
              </>
            )}
          </p>
        </CardContent>
      </Card>
      <div className="absolute bottom-6 text-center">
        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium">
          © {new Date().getFullYear()} Divcom Sistemas • Desenvolvido por <span className="text-emerald-600/80">PY - sites e automações inteligentes</span>
        </p>
      </div>
    </div>
  );
}
