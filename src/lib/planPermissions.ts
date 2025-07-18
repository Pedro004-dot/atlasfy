// src/lib/planPermissions.ts
export const PLAN_LIMITS = {
    free: { maxEmpresas: 1 },
    pro: { maxEmpresas: 1 },
    enterprise: { maxEmpresas: 3 },
  };
  
  export function getPlanKey(plano_id: string): keyof typeof PLAN_LIMITS {
    if (plano_id === "9e2b7953-f0ec-46dd-9cb1-6ba94c1c5fc5") return "free";
    if (plano_id === "558f89c6-a4dc-45ba-aa3c-effcf3a84e1a") return "pro";
    if (plano_id === "e81d7dba-92b1-4f09-bd96-961344403059") return "enterprise";
    return "free";
  }
  
  export function canCreateEmpresa(plano_id: string, empresasAtuais: number): boolean {
    const planKey = getPlanKey(plano_id);
    return empresasAtuais < PLAN_LIMITS[planKey].maxEmpresas;
  }