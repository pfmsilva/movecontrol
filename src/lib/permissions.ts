import type { Role } from "@prisma/client";

/** ADMIN: controlo total da aplicação. */
export function canManageUsers(role: Role | undefined): boolean {
  return role === "ADMIN";
}

/** ADMIN e CONTROLLER podem criar/editar/apagar equipamentos. */
export function canManageEquipment(role: Role | undefined): boolean {
  return role === "ADMIN" || role === "CONTROLLER";
}

/** ADMIN e CONTROLLER podem criar/editar/apagar checkpoints. */
export function canManageCheckpoints(role: Role | undefined): boolean {
  return role === "ADMIN" || role === "CONTROLLER";
}

/** VALIDATOR só pode assumir os checkpoints que lhe estão associados. */
export function isRestrictedValidator(role: Role | undefined): boolean {
  return role === "VALIDATOR";
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  CONTROLLER: "Controlador Total",
  VALIDATOR: "Validador",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: "Controlo total da aplicação, incluindo gestão de utilizadores.",
  CONTROLLER: "Vê tudo exceto utilizadores; cria/apaga equipamentos e checkpoints; faz scans em qualquer checkpoint.",
  VALIDATOR: "Só pode efetuar scans nos checkpoints que lhe estão associados.",
};
