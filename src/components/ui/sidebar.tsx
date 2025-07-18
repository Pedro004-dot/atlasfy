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
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/theme-toggle';

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
    icon: BarChart3,
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      // Remover token do localStorage
      localStorage.removeItem('auth-token');
      // Redirecionar para login
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
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
          <h1 className="atlas-heading text-xl font-bold text-sidebar-foreground">Atlas</h1>
        )}
        <div className="flex items-center gap-2">
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