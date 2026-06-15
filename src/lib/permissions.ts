export type ChurchRole =
  | "visitor"
  | "member"
  | "cellLeader"
  | "ministryLeader"
  | "supervisor"
  | "networkPastor"
  | "auxPastor"
  | "seniorPastor"
  | "admin";

export type Capability =
  | "view:home"
  | "view:cells"
  | "view:school"
  | "view:members"
  | "view:ministries"
  | "view:admin"
  | "view:pastoral"
  | "view:events"
  | "view:finance"
  | "view:jornada"
  | "view:public"
  | "manage:ownProfile"
  | "manage:cell"
  | "manage:ministry"
  | "manage:members"
  | "manage:approvals"
  | "manage:school"
  | "manage:events"
  | "manage:finance"
  | "manage:pastoral"
  | "manage:seed"
  | "manage:roles";

export type LeadershipAssignment = {
  type: "cell" | "ministry" | "supervision" | "network";
  id: string;
  label?: string;
};

export type UserProfile = {
  id?: string;
  uid?: string;
  email?: string;
  name?: string;
  roles?: Array<string | ChurchRole>;
  isApproved?: boolean;
  tenantId?: string;
  cellId?: string;
  ministryId?: string;
  supervisorId?: string;
  leadership?: LeadershipAssignment[];
  [key: string]: unknown;
};

export type RouteId =
  | "home"
  | "cell"
  | "school"
  | "members"
  | "ministries"
  | "admin"
  | "pastoral"
  | "events"
  | "finance"
  | "jornada"
  | "units"
  | "pastors"
  | "social"
  | "store"
  | "media";

export type RouteConfig = {
  id: RouteId;
  path: string;
  label: string;
  capability: Capability;
  navGroup: "main" | "church" | "growth" | "management" | "public";
  bottom?: boolean;
};

const roleAliases: Record<string, ChurchRole[]> = {
  admin: ["admin"],
  administrador: ["admin"],
  pastor: ["networkPastor"],
  "pastor da sede": ["seniorPastor"],
  "pastor senior": ["seniorPastor"],
  "pastor de rede": ["networkPastor"],
  "pastor auxiliar": ["auxPastor"],
  leader: ["cellLeader"],
  lider: ["cellLeader"],
  cellleader: ["cellLeader"],
  "cell leader": ["cellLeader"],
  "lider de celula": ["cellLeader"],
  "lider celula": ["cellLeader"],
  supervisor: ["supervisor"],
  "supervisor de celulas": ["supervisor"],
  ministryleader: ["ministryLeader"],
  "ministry leader": ["ministryLeader"],
  "lider de ministerio": ["ministryLeader"],
  "lider ministerio": ["ministryLeader"],
  networkpastor: ["networkPastor"],
  "network pastor": ["networkPastor"],
  auxpastor: ["auxPastor"],
  "aux pastor": ["auxPastor"],
  seniorpastor: ["seniorPastor"],
  "senior pastor": ["seniorPastor"],
  volunteer: ["member"],
  voluntario: ["member"],
  membro: ["member"],
  member: ["member"],
  servo: ["member"],
  visitor: ["visitor"],
  visitante: ["visitor"]
};

const capabilitiesByRole: Record<ChurchRole, Capability[]> = {
  visitor: [
    "view:home",
    "view:cells",
    "view:public",
  ],
  member: [
    "view:home",
    "view:cells",
    "view:school",
    "view:ministries",
    "view:events",
    "view:finance",
    "view:jornada",
    "view:public",
    "manage:ownProfile",
  ],
  cellLeader: [
    "view:home",
    "view:cells",
    "view:school",
    "view:members",
    "view:ministries",
    "view:admin",
    "view:events",
    "view:finance",
    "view:jornada",
    "view:public",
    "manage:ownProfile",
    "manage:cell",
    "manage:members",
  ],
  ministryLeader: [
    "view:home",
    "view:cells",
    "view:school",
    "view:members",
    "view:ministries",
    "view:admin",
    "view:events",
    "view:finance",
    "view:jornada",
    "view:public",
    "manage:ownProfile",
    "manage:ministry",
  ],
  supervisor: [
    "view:home",
    "view:cells",
    "view:school",
    "view:members",
    "view:ministries",
    "view:admin",
    "view:pastoral",
    "view:events",
    "view:finance",
    "view:jornada",
    "view:public",
    "manage:ownProfile",
    "manage:cell",
    "manage:members",
    "manage:approvals",
    "manage:events",
  ],
  networkPastor: [
    "view:home",
    "view:cells",
    "view:school",
    "view:members",
    "view:ministries",
    "view:admin",
    "view:pastoral",
    "view:events",
    "view:finance",
    "view:jornada",
    "view:public",
    "manage:ownProfile",
    "manage:cell",
    "manage:ministry",
    "manage:members",
    "manage:approvals",
    "manage:school",
    "manage:events",
    "manage:pastoral",
  ],
  auxPastor: [
    "view:home",
    "view:cells",
    "view:school",
    "view:members",
    "view:ministries",
    "view:admin",
    "view:pastoral",
    "view:events",
    "view:finance",
    "view:jornada",
    "view:public",
    "manage:ownProfile",
    "manage:cell",
    "manage:ministry",
    "manage:members",
    "manage:approvals",
    "manage:school",
    "manage:events",
    "manage:pastoral",
  ],
  seniorPastor: [
    "view:home",
    "view:cells",
    "view:school",
    "view:members",
    "view:ministries",
    "view:admin",
    "view:pastoral",
    "view:events",
    "view:finance",
    "view:jornada",
    "view:public",
    "manage:ownProfile",
    "manage:cell",
    "manage:ministry",
    "manage:members",
    "manage:approvals",
    "manage:school",
    "manage:events",
    "manage:finance",
    "manage:pastoral",
    "manage:roles",
  ],
  admin: [
    "view:home",
    "view:cells",
    "view:school",
    "view:members",
    "view:ministries",
    "view:admin",
    "view:pastoral",
    "view:events",
    "view:finance",
    "view:jornada",
    "view:public",
    "manage:ownProfile",
    "manage:cell",
    "manage:ministry",
    "manage:members",
    "manage:approvals",
    "manage:school",
    "manage:events",
    "manage:finance",
    "manage:pastoral",
    "manage:seed",
    "manage:roles",
  ],
};

export const appRoutes: RouteConfig[] = [
  { id: "home", path: "/", label: "Inicio", capability: "view:public", navGroup: "main", bottom: true },
  { id: "cell", path: "/celulas", label: "Celulas", capability: "view:public", navGroup: "church", bottom: true },
  { id: "school", path: "/escola", label: "Escola IDE", capability: "view:school", navGroup: "growth", bottom: true },
  { id: "members", path: "/membros", label: "Membros", capability: "view:members", navGroup: "church" },
  { id: "ministries", path: "/ministerios", label: "Ministerios", capability: "view:public", navGroup: "church" },
  { id: "events", path: "/eventos", label: "Eventos", capability: "view:public", navGroup: "main" },
  { id: "finance", path: "/financeiro", label: "Contribuicoes", capability: "view:finance", navGroup: "growth", bottom: true },
  { id: "jornada", path: "/jornada", label: "A Jornada", capability: "view:jornada", navGroup: "growth", bottom: true },
  { id: "admin", path: "/gestao", label: "Gestao", capability: "view:admin", navGroup: "management", bottom: true },
  { id: "pastoral", path: "/cuidado-pastoral", label: "Cuidado Pastoral", capability: "view:pastoral", navGroup: "management" },
  { id: "units", path: "/unidades", label: "Unidades", capability: "view:public", navGroup: "public" },
  { id: "pastors", path: "/pastores", label: "Pastores", capability: "view:public", navGroup: "public" },
  { id: "social", path: "/social", label: "Social", capability: "view:public", navGroup: "public" },
  { id: "store", path: "/loja", label: "Loja", capability: "view:public", navGroup: "public" },
  { id: "media", path: "/midia", label: "Midia", capability: "view:public", navGroup: "public" },
];

export const routeById = Object.fromEntries(appRoutes.map((route) => [route.id, route])) as Record<RouteId, RouteConfig>;

function normalizeRoleKey(role: string): string {
  return role
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function normalizeRoles(rawRoles?: Array<string | ChurchRole>): ChurchRole[] {
  const normalized = new Set<ChurchRole>();

  for (const role of rawRoles || []) {
    const aliases = roleAliases[normalizeRoleKey(String(role))] || [];
    for (const alias of aliases) normalized.add(alias);
  }

  if (normalized.size === 0) normalized.add("member");
  return Array.from(normalized);
}

export function roleLabel(user?: UserProfile | null): string {
  const roles = normalizeRoles(user?.roles);
  if (roles.includes("admin")) return "Administrador";
  if (roles.includes("seniorPastor")) return "Pastor Senior";
  if (roles.includes("networkPastor")) return "Pastor de Rede";
  if (roles.includes("auxPastor")) return "Pastor Auxiliar";

  const labels = [];
  if (roles.includes("supervisor")) labels.push("Supervisor");
  if (roles.includes("cellLeader")) labels.push("Lider de Celula");
  if (roles.includes("ministryLeader")) labels.push("Lider de Ministerio");

  return labels.length > 0 ? labels.join(" + ") : "Membro";
}

export function hasRole(user: UserProfile | null | undefined, role: ChurchRole): boolean {
  return normalizeRoles(user?.roles).includes(role);
}

export function can(user: UserProfile | null | undefined, capability: Capability, resource?: { tenantId?: string | null }): boolean {
  if (capability === "view:public") return true;
  if (!user || user.isApproved === false) return false;
  if (resource?.tenantId && user.tenantId && resource.tenantId !== user.tenantId) return false;

  const roles = normalizeRoles(user.roles);
  if (roles.includes("admin")) return true;
  return roles.some((role) => capabilitiesByRole[role].includes(capability));
}

export function visibleRoutes(user: UserProfile | null | undefined): RouteConfig[] {
  return appRoutes.filter((route) => can(user, route.capability));
}

export function pathForRoute(routeId: RouteId): string {
  return routeById[routeId]?.path || "/";
}

export function routeForPath(pathname: string): RouteConfig {
  return appRoutes.find((route) => route.path === pathname) || routeById.home;
}

export function getHomeSections(user: UserProfile | null | undefined): RouteId[] {
  const sections: RouteId[] = ["events", "cell", "school", "finance"];
  if (can(user, "manage:cell")) sections.unshift("members");
  if (can(user, "manage:ministry")) sections.unshift("ministries");
  if (can(user, "view:pastoral")) sections.unshift("pastoral");
  if (can(user, "view:admin")) sections.unshift("admin");
  return Array.from(new Set(sections));
}

export function assertTenantAccess(user: UserProfile | null | undefined, doc: { tenantId?: string | null }): boolean {
  return Boolean(user?.tenantId && doc.tenantId && user.tenantId === doc.tenantId);
}
