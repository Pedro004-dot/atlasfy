import type { Metadata, Viewport } from 'next'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'
import { UserProvider } from '@/contexts/UserContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

export const metadata: Metadata = {
  title: {
    default: 'Atlas - Inteligência em Vendas WhatsApp',
    template: '%s | Atlas'
  },
  description: 'Plataforma completa de automação e inteligência para vendas no WhatsApp. Aumente suas conversões, automatize atendimentos e organize seu negócio com IA.',
  keywords: [
    'WhatsApp Business',
    'automação vendas',
    'inteligência artificial',
    'chatbot WhatsApp',
    'CRM WhatsApp',
    'vendas automatizadas',
    'gestão clientes',
    'dashboard vendas',
    'métricas WhatsApp',
    'conversão vendas'
  ],
  authors: [{ name: 'Atlas', url: 'https://atlas-platform.com' }],
  creator: 'Atlas Platform',
  publisher: 'Atlas',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: '/',
    title: 'Atlas - Inteligência em Vendas WhatsApp',
    description: 'Plataforma completa de automação e inteligência para vendas no WhatsApp. Aumente suas conversões, automatize atendimentos e organize seu negócio com IA.',
    siteName: 'Atlas',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Atlas - Inteligência em Vendas WhatsApp',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Atlas - Inteligência em Vendas WhatsApp',
    description: 'Plataforma completa de automação e inteligência para vendas no WhatsApp.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' }
  ],
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