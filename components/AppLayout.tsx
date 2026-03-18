'use client';

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, PlusCircle, History, User, Shield, LogOut, Percent, Bell, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import LoadingScreen from "./LoadingScreen";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/new-record", label: "Novo Registro", icon: PlusCircle },
  { to: "/history", label: "Histórico", icon: History },
  { to: "/clients", label: "Clientes", icon: Users },
  { to: "/profile", label: "Perfil", icon: User },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, isAdmin, signOut, profile, loading } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isProfileIncomplete = profile && !profile.profile_completed;

  // Notification state (mock for now, can be connected to DB later)
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Bem-vindo ao DiviCom!", message: "Complete seu perfil para aproveitar todas as funcionalidades.", read: false, date: new Date().toISOString() }
  ]);
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (isProfileIncomplete && pathname !== "/profile") {
        router.push("/profile");
      }
    }
  }, [user, isProfileIncomplete, pathname, router, loading]);

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      toast.success("Sessão encerrada com sucesso");
      router.push("/login");
    } catch (error) {
      console.error("Erro ao sair:", error);
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "P";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  };

  const allItems = isAdmin
    ? [...navItems, { to: "/admin", label: "Admin", icon: Shield }]
    : navItems;

  // If profile is incomplete, only show Profile in nav
  const visibleItems = isProfileIncomplete 
    ? [{ to: "/profile", label: "Perfil", icon: User }]
    : allItems;

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b bg-card px-4 py-2 flex items-center justify-between">
        <Link 
          href={isProfileIncomplete ? "/profile" : "/dashboard"} 
          className="flex items-center gap-2 group"
        >
          <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20 group-hover:scale-105 transition-transform">
            <Percent className="text-white h-5 w-5" strokeWidth={3} />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl tracking-tighter leading-none text-foreground">DIVCOM</span>
            <span className="text-[10px] font-bold text-emerald-600 tracking-[0.2em] leading-none mt-0.5">SISTEMAS</span>
          </div>
        </Link>
        
        <div className="flex items-center gap-3">
          {/* Notifications */}
          {!isProfileIncomplete && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="relative p-2 rounded-full hover:bg-accent transition-colors outline-none">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <h4 className="font-semibold text-sm">Notificações</h4>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-[10px] text-emerald-600 hover:underline font-medium">
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Nenhuma notificação no momento.
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {notifications.map((notification) => (
                        <div 
                          key={notification.id} 
                          className={cn(
                            "px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors",
                            !notification.read && "bg-emerald-50/50 dark:bg-emerald-950/20"
                          )}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <h5 className={cn("text-sm font-medium", !notification.read && "text-emerald-700 dark:text-emerald-400")}>
                              {notification.title}
                            </h5>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {new Date(notification.date).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* User Profile */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 hover:bg-accent p-1 rounded-full transition-colors outline-none">
                <Avatar className="h-8 w-8 border">
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={profile.full_name || ""} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {getInitials(profile?.full_name || "")}
                  </AvatarFallback>
                </Avatar>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="end">
              <div className="p-4 flex items-center gap-3">
                <Avatar className="h-12 w-12 border-none">
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={profile.full_name || ""} />
                  ) : null}
                  <AvatarFallback className="bg-[#E8F5E9] text-[#2E7D32] text-sm font-bold">
                    {getInitials(profile?.full_name || "")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <p className="font-bold text-sm leading-tight text-foreground">{profile?.full_name || "Profissional"}</p>
                  <p className="text-xs text-[#4682B4] font-medium">{profile?.specialty || "Especialidade não definida"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
                </div>
              </div>
              <Separator />
              <div className="px-4 py-2 space-y-1">
                {profile?.phone && <p className="text-xs text-muted-foreground">📞 <span className="font-medium text-foreground/80">Contato:</span> {profile.phone}</p>}
                {profile?.cpf_cnpj && <p className="text-xs text-muted-foreground">🪪 <span className="font-medium text-foreground/80">Documento:</span> {profile.cpf_cnpj}</p>}
                {profile?.bio && (
                  <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">
                    📝 <span className="font-medium text-foreground/80 not-italic">Bio:</span> &quot;{profile.bio}&quot;
                  </p>
                )}
              </div>
              <Separator />
              <div className="p-2">
                <Link 
                  href="/profile" 
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                >
                  <User className="h-4 w-4" />
                  Editar Perfil
                </Link>
                <button 
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LogOut className="h-4 w-4" />
                  {isLoggingOut ? "Saindo..." : "Sair da Conta"}
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container max-w-5xl py-6 animate-fade-in">
        {children}
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="sticky bottom-0 z-50 border-t bg-card px-2 py-1 flex justify-around md:hidden">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              href={item.to}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs transition-colors",
                active ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop sidebar-style nav */}
      <nav className="hidden md:flex fixed left-0 top-[57px] bottom-0 w-56 border-r bg-card flex-col p-4 gap-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              href={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Spacer for desktop sidebar */}
      <style>{`@media (min-width: 768px) { main { margin-left: 14rem; } }`}</style>
    </div>
  );
}
