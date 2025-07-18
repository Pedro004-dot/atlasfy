export default function AnalisePage() {
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Análise</h1>
        <p className="text-muted-foreground mt-1">
          Relatórios e análises detalhadas das suas vendas
        </p>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            <svg
              className="mx-auto h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Página em Desenvolvimento
          </h3>
          <p className="text-sm text-muted-foreground">
            A página de análise será implementada em breve
          </p>
        </div>
      </div>
    </div>
  );
}