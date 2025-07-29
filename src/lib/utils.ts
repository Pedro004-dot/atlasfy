import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getDaysUntilExpiration(endDate: Date | string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function isTrialExpired(endDate: Date | string): boolean {
  return getDaysUntilExpiration(endDate) <= 0;
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{2})(\d{4,5})(\d{4})$/);
  
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  
  return phone;
}

// Formatar telefone para exibição no formato (XX) XXXXX-XXXX
export function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}

// Converter telefone para formato internacional: 55DDNÚMERO (sem o 9 adicional)
export function formatPhoneForDatabase(value: string): string {
  const digits = value.replace(/\D/g, '');
  
  // Se já tem código do país (55), retorna como está (12 dígitos)
  if (digits.startsWith('55') && digits.length === 12) {
    return digits;
  }
  
  // Se não tem código do país, adiciona 55 (10 dígitos locais)
  if (digits.length === 10) {
    return `55${digits}`;
  }
  
  // Se tem 11 dígitos (com o 9 adicional), remove o 9 e adiciona 55
  if (digits.length === 11 && digits.substring(2, 3) === '9') {
    const ddd = digits.substring(0, 2);
    const number = digits.substring(3);
    return `55${ddd}${number}`;
  }
  
  return digits;
}

// Converter do formato banco (55DDNÚMERO) para exibição (DD) NNNNN-NNNN
export function formatPhoneFromDatabase(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  
  // Se tem código do país (55), remove para exibição (12 dígitos)
  if (digits.startsWith('55') && digits.length === 12) {
    const withoutCountryCode = digits.substring(2);
    return formatPhoneDisplay(withoutCountryCode);
  }
  
  return formatPhoneDisplay(digits);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}