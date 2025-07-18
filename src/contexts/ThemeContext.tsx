'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark'); // Default to dark
  const [mounted, setMounted] = useState(false);

  // Check for saved theme preference or default to dark mode
  useEffect(() => {
    const savedTheme = localStorage.getItem('atlas-theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setThemeState(savedTheme);
    } else {
      // Default to dark mode following the design system
      setThemeState('dark');
      localStorage.setItem('atlas-theme', 'dark');
    }
    setMounted(true);
  }, []);

  // Apply theme to document when it changes
  useEffect(() => {
    if (mounted) {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      localStorage.setItem('atlas-theme', theme);
      console.log('🎨 Theme applied:', theme, 'Classes:', root.classList.toString());
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setThemeState(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      console.log('🔄 Theme toggle:', prevTheme, '→', newTheme);
      return newTheme;
    });
  };

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <div className="bg-background">{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}