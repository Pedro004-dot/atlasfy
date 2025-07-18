# Regras do Agente Claude Code - Design System

## 🎨 Paleta de Cores (OKLCH)

### Cores Principais (Light Mode)
```css
--background: oklch(1 0 0);
--foreground: oklch(0.1450 0 0);
--primary: oklch(0.6388 0.2475 31.1976);
--primary-foreground: oklch(0.9710 0.0130 17.3800);
--secondary: oklch(0.9702 0 0);
--secondary-foreground: oklch(0.2050 0 0);
--muted: oklch(0.9700 0 0);
--muted-foreground: oklch(0.5560 0 0);
--accent: oklch(0.9700 0 0);
--accent-foreground: oklch(0.2050 0 0);
--destructive: oklch(0.5770 0.2450 27.3250);
--destructive-foreground: oklch(1 0 0);
--border: oklch(0.9220 0 0);
--input: oklch(0.9220 0 0);
--ring: oklch(0.7080 0 0);
```

### Cores Principais (Dark Mode)
```css
--background: oklch(0.1450 0 0);
--foreground: oklch(0.9850 0 0);
--primary: oklch(0.6388 0.2475 31.1976);
--primary-foreground: oklch(1.0000 0 0);
--secondary: oklch(0.4891 0 0);
--secondary-foreground: oklch(0.9850 0 0);
--muted: oklch(0.2690 0 0);
--muted-foreground: oklch(0.7080 0 0);
--accent: oklch(0.3710 0 0);
--accent-foreground: oklch(0.9850 0 0);
--destructive: oklch(0.7040 0.1910 22.2160);
--destructive-foreground: oklch(0.9850 0 0);
--border: oklch(0.2750 0 0);
--input: oklch(0.3250 0 0);
--ring: oklch(0.5560 0 0);
```

### Cores de Gráficos (Light Mode)
```css
--chart-1: oklch(0.8080 0.1140 19.5710);
--chart-2: oklch(0.7040 0.1910 22.2160);
--chart-3: oklch(0.6370 0.2370 25.3310);
--chart-4: oklch(0.5770 0.2450 27.3250);
--chart-5: oklch(0.5050 0.2130 27.5180);
```

### Cores de Gráficos (Dark Mode)
```css
--chart-1: oklch(0.8100 0.1000 252);
--chart-2: oklch(0.6200 0.1900 260);
--chart-3: oklch(0.5500 0.2200 263);
--chart-4: oklch(0.4900 0.2200 264);
--chart-5: oklch(0.4200 0.1800 266);
```

## 🔤 Tipografia

### Fonte Padrão
- **Todas as fontes**: Inter, sans-serif
- **Font Sans**: Inter, sans-serif
- **Font Serif**: Inter, sans-serif
- **Font Mono**: Inter, sans-serif

### Espaçamento de Letras
- **Tracking Normal**: 0.025em
- **Tracking Tighter**: -0.025em
- **Tracking Tight**: 0em
- **Tracking Wide**: 0.05em
- **Tracking Wider**: 0.075em
- **Tracking Widest**: 0.125em

## 📏 Espacamento e Dimensões

### Radius
- **Radius Base**: 0.625rem
- **Radius SM**: calc(0.625rem - 4px)
- **Radius MD**: calc(0.625rem - 2px)
- **Radius LG**: 0.625rem
- **Radius XL**: calc(0.625rem + 4px)

### Spacing Base
- **Spacing Unit**: 0.25rem

### Sombras
```css
--shadow-2xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
--shadow-xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
--shadow-sm: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
--shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
--shadow-md: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10);
--shadow-lg: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10);
--shadow-xl: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10);
--shadow-2xl: 0 1px 3px 0px hsl(0 0% 0% / 0.25);
```

## 🎛️ Sidebar (Específico)

### Light Mode
```css
--sidebar: oklch(0.9850 0 0);
--sidebar-foreground: oklch(0.1450 0 0);
--sidebar-primary: oklch(0.2050 0 0);
--sidebar-primary-foreground: oklch(0.9850 0 0);
--sidebar-accent: oklch(0.9700 0 0);
--sidebar-accent-foreground: oklch(0.2050 0 0);
--sidebar-border: oklch(0.9220 0 0);
--sidebar-ring: oklch(0.7080 0 0);
```

### Dark Mode
```css
--sidebar: oklch(0.2050 0 0);
--sidebar-foreground: oklch(0.9850 0 0);
--sidebar-primary: oklch(0.4880 0.2430 264.3760);
--sidebar-primary-foreground: oklch(0.9850 0 0);
--sidebar-accent: oklch(0.2690 0 0);
--sidebar-accent-foreground: oklch(0.9850 0 0);
--sidebar-border: oklch(0.2750 0 0);
--sidebar-ring: oklch(0.4390 0 0);
```

## 📋 Regras Obrigatórias

### ✅ SEMPRE FAZER:
1. **Usar exclusivamente ShadCN/UI** para componentes
2. **Aplicar as cores OKLCH** definidas neste documento
3. **Usar Inter como fonte padrão** em todas as aplicações
4. **Implementar suporte completo** para light/dark mode
5. **Seguir o radius de 0.625rem** para bordas arredondadas
6. **Usar as sombras predefinidas** para elevação
7. **Aplicar tracking normal (0.025em)** como padrão
8. **Utilizar as variáveis CSS** definidas no sistema

### ❌ NUNCA FAZER:
1. **Não usar outras bibliotecas** de componentes além do ShadCN/UI
2. **Não modificar as cores OKLCH** sem autorização
3. **Não usar outras fontes** além da Inter
4. **Não criar componentes customizados** quando existir equivalente no ShadCN/UI
5. **Não ignorar o sistema de dark mode**
6. **Não usar valores hardcoded** para cores, spacing ou typography

### 🔧 Configuração Técnica:
- **Framework**: Next.js com TypeScript
- **Styling**: Tailwind CSS + ShadCN/UI
- **Cores**: Sistema OKLCH (mais preciso que HSL)
- **Responsividade**: Mobile-first approach
- **Acessibilidade**: Seguir padrões WCAG

### 📦 Componentes Prioritários:
Sempre priorizar o uso dos componentes ShadCN/UI na seguinte ordem:
1. Button, Input, Label
2. Card, Dialog, Sheet
3. Table, Form, Select
4. Alert, Badge, Avatar
5. Sidebar, Navigation, Breadcrumb

### 🎯 Checklist de Qualidade:
- [ ] Todas as cores usam as variáveis CSS definidas
- [ ] Fonte Inter aplicada em todos os elementos
- [ ] Dark mode funcional e testado
- [ ] Componentes ShadCN/UI utilizados
- [ ] Responsividade implementada
- [ ] Acessibilidade considerada
- [ ] Shadows e radius seguem o padrão
- [ ] Letter-spacing aplicado corretamente

---

**Lembrete**: Este é um sistema de design rígido. Qualquer desvio deve ser justificado e aprovado. A consistência visual é fundamental para a experiência do usuário.