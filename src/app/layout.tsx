import type { Metadata } from 'next'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'
import { UserProvider } from '@/contexts/UserContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

export const metadata: Metadata = {
  title: 'Atlas Auth - Sistema de Autenticação',
  description: 'Sistema completo de autenticação para SaaS com verificação de email, reset de senha e período de teste gratuito',
  keywords: 'autenticação, SaaS, login, cadastro, verificação email, reset senha, Next.js',
  authors: [{ name: 'Atlas Auth' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-background text-foreground transition-colors duration-300">
        <ThemeProvider>
          <UserProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}