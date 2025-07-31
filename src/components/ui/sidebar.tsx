"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Building2, 
  Users, 
  BarChart3, 
  Menu, 
  X,
  LogOut,
  TrendingUp,
  PieChart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: Home,
  },
  {
    href: '/dashboard/empresa',
    label: 'Empresa',
    icon: Building2,
  },
  {
    href: '/dashboard/clientes',
    label: 'Clientes',
    icon: Users,
  },
  {
    href: '/dashboard/analise',
    label: 'Análise',
    icon: TrendingUp,
  },
  {
    href: '/dashboard/analysis',
    label: 'Métricas',
    icon: PieChart,
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuth();

  // Debug: verificar se o componente está renderizando
  console.log('Sidebar render - isCollapsed:', isCollapsed);

  const handleLogout = async () => {
    try {
      // Chama API de logout para limpar cookies do servidor
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Erro ao chamar API de logout:', error);
    }
    
    // Sempre remove localStorage e redireciona, mesmo se API falhar
    logout();
  };

  return (
    <div 
      className={cn(
        "relative flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
      style={{
        fontFamily: 'var(--font-sans)',
        letterSpacing: 'var(--tracking-normal)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-sidebar-border">
        {!isCollapsed && (
          <div className="flex flex-col items-start min-w-0">
            <h1 
              className="text-3xl font-bold leading-tight"
            style={{
              fontFamily: 'Montserrat, Inter, sans-serif',
              display: 'block',
              width: 'fit-content',
              background: 'linear-gradient(135deg, #ff3333 0%, #ffffff 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundSize: '200% 200%',
              animation: 'gradient-shift 3s ease-in-out infinite'
            }}
          >
            Atlas
          </h1>
          <p 
            className="text-xs font-medium opacity-80 leading-tight"
            style={{
              fontFamily: 'Montserrat, Inter, sans-serif',
              color: 'hsl(var(--sidebar-foreground))'
            }}
          >
            Bora vender!
          </p>
          </div>
        )}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isCollapsed && <ThemeToggle />}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-sidebar-accent transition-colors"
            style={{ borderRadius: 'var(--radius-sm)' }}
            aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {isCollapsed ? (
              <Menu className="h-5 w-5 text-sidebar-foreground" />
            ) : (
              <X className="h-5 w-5 text-sidebar-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center px-3 py-2 text-sm font-medium transition-colors atlas-text",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              style={{ 
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-sans)',
                letterSpacing: 'var(--tracking-normal)'
              }}
            >
              <item.icon
                className={cn(
                  "flex-shrink-0 h-5 w-5",
                  isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground",
                  isCollapsed ? "mr-0" : "mr-3"
                )}
              />
              {!isCollapsed && (
                <span className="truncate atlas-text">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className={cn(
            "group flex items-center w-full px-3 py-2 text-sm font-medium transition-colors atlas-text",
            "text-destructive hover:bg-destructive/10 hover:text-destructive"
          )}
          style={{ 
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-sans)',
            letterSpacing: 'var(--tracking-normal)'
          }}
        >
          <LogOut
            className={cn(
              "flex-shrink-0 h-5 w-5 text-destructive",
              isCollapsed ? "mr-0" : "mr-3"
            )}
          />
          {!isCollapsed && (
            <span className="truncate atlas-text">Sair</span>
          )}
        </button>
      </div>
    </div>
  );
}