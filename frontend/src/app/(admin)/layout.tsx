"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Boxes,
  Truck,
  Beaker,
  ChefHat,
  Factory,
  ShoppingCart,
  Store,
} from "lucide-react";
import { toast } from "sonner";

// Componentes Shadcn
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// --- Itens do Menu ---
const menuItems = [
  { href: "/dashboard", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/products", label: "Produtos", icon: Package },
  { href: "/sales", label: "Saídas/Vendas", icon: Store },
  { href: "/purchases", label: "Entradas/Compras", icon: ShoppingCart },
  { href: "/stock-history", label: "Movimentações", icon: ArrowLeftRight },
  { href: "/suppliers", label: "Fornecedores", icon: Truck },
];

const productionMenuItems = [
  { href: "/ingredients", label: "Insumos", icon: Beaker },
  { href: "/recipes", label: "Receitas", icon: ChefHat },
  { href: "/productions", label: "Produção", icon: Factory },
];

const configMenuItems = [
  { href: "/settings", label: "Configurações", icon: Settings },
];

// --- Componente Auxiliar de Navegação ---
function NavGroup({
  title,
  items,
  pathname,
}: {
  title: string;
  items: any[];
  pathname: string;
}) {
  return (
    <div className="mb-6 last:mb-0">
      <p className="px-3 text-[11px] font-bold text-sidebar-foreground/50 uppercase tracking-widest mb-2">
        {title}
      </p>
      <div className="space-y-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group text-sm font-medium overflow-hidden
                ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md ring-1 ring-sidebar-border/20"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:scale-[1.02] hover:shadow-sm"
                }
              `}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/20" />
              )}
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform duration-300 ${
                  isActive
                    ? "text-sidebar-primary-foreground scale-110"
                    : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground group-hover:scale-110"
                }`}
              />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-4 h-4 ml-auto opacity-60 shrink-0" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Fecha a sidebar ao navegar no mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    // Remove cookies e localStorage
    document.cookie =
      "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    localStorage.removeItem("access_token");

    toast.info("Você saiu do sistema.");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* --- Overlay para Mobile --- */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* --- Sidebar --- */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border
          transform transition-transform duration-300 ease-in-out
          ${
            isSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
          flex flex-col
          shadow-xl lg:shadow-none
        `}
      >
        {/* Logo Area */}
        <div className="h-36 flex items-center justify-center px-6 border-b border-sidebar-border shrink-0 relative">
          <img
            src="/logo.png"
            alt="Logo"
            className="h-32 w-auto object-contain"
          />
          <button
            className="absolute right-6 lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4">
          <NavGroup
            title="Estoque & Vendas"
            items={menuItems}
            pathname={pathname}
          />
          <NavGroup
            title="Produção"
            items={productionMenuItems}
            pathname={pathname}
          />
          <NavGroup
            title="Sistema"
            items={configMenuItems}
            pathname={pathname}
          />
        </nav>

        {/* User / Footer */}
        <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/10">
          <div className="flex items-center gap-3 mb-4 px-1">
            <Avatar className="h-9 w-9 border border-sidebar-border">
              <AvatarFallback className="bg-sidebar-primary/10 text-sidebar-primary text-xs font-bold">
                AD
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">Administrador</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                admin@stock.com
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-sidebar-border bg-transparent rounded-xl transition-all duration-300 hover:scale-[1.02]"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do Sistema</span>
          </Button>
        </div>
      </aside>

      {/* --- Main Content Wrapper --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 flex items-center px-4 justify-between border-b border-border bg-background">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className="-ml-2"
          >
            <Menu className="w-6 h-6" />
          </Button>
          <span className="font-semibold">StockFlow</span>
          <div className="w-8" /> {/* Spacer */}
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto p-0">{children}</main>
      </div>
    </div>
  );
}
