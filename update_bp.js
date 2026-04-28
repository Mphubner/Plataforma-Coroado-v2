const fs = require('fs');
const bp = JSON.parse(fs.readFileSync('firebase-blueprint.json', 'utf8'));

bp.entities.KpiTarget = {
  title: "KpiTarget",
  description: "Target for a specific KPI or pillar",
  type: "object",
  properties: {
    name: { type: "string" },
    period: { type: "string" }, // e.g., "2026", "2026 Q1"
    targetValue: { type: "number" },
    unit: { type: "string" }, // e.g., "pessoas", "R$"
    tenantId: { type: "string" },
    createdAt: { type: "number" },
    updatedAt: { type: "number" }
  },
  required: ["name", "period", "targetValue", "unit", "tenantId", "createdAt", "updatedAt"]
};

bp.entities.KpiEntry = {
  title: "KpiEntry",
  description: "Actual value entry for a KPI",
  type: "object",
  properties: {
    kpiName: { type: "string" }, // linked to KpiTarget name conceptually
    date: { type: "string" }, // e.g., "2023-10-15"
    actualValue: { type: "number" },
    targetValue: { type: "number" }, // Snapshot of the target at that time
    notes: { type: "string" },
    tenantId: { type: "string" },
    createdAt: { type: "number" },
    updatedAt: { type: "number" }
  },
  required: ["kpiName", "date", "actualValue", "tenantId", "createdAt", "updatedAt"]
};

bp.entities.ServiceReport = {
  title: "ServiceReport",
  description: "Attendance report for a service/culto",
  type: "object",
  properties: {
    serviceName: { type: "string" }, // e.g., "10h Sede"
    date: { type: "string" },
    attendanceActual: { type: "number" },
    attendanceTarget: { type: "number" },
    visitorsActual: { type: "number" },
    visitorsTarget: { type: "number" },
    tenantId: { type: "string" },
    createdAt: { type: "number" },
    updatedAt: { type: "number" }
  },
  required: ["serviceName", "date", "attendanceActual", "visitorsActual", "tenantId", "createdAt", "updatedAt"]
};

bp.entities.FinancialReport = {
  title: "FinancialReport",
  description: "Financial tithe/offering log",
  type: "object",
  properties: {
    title: { type: "string" }, 
    date: { type: "string" },
    amount: { type: "number" },
    target: { type: "number" },
    tenantId: { type: "string" },
    createdAt: { type: "number" },
    updatedAt: { type: "number" }
  },
  required: ["title", "date", "amount", "tenantId", "createdAt", "updatedAt"]
};

// Also update Task to add description
bp.entities.Task.properties.description = { type: "string" };
bp.entities.Task.properties.assignedTo = { type: "string" };

bp.firestore["/kpi_targets/{targetId}"] = {
  schema: { $ref: "#/entities/KpiTarget" },
  description: "KPI targets"
};
bp.firestore["/kpi_entries/{entryId}"] = {
  schema: { $ref: "#/entities/KpiEntry" },
  description: "KPI actual entries"
};
bp.firestore["/service_reports/{reportId}"] = {
  schema: { $ref: "#/entities/ServiceReport" },
  description: "Service attendance reports"
};
bp.firestore["/financial_reports/{reportId}"] = {
  schema: { $ref: "#/entities/FinancialReport" },
  description: "Financial entries reports"
};

fs.writeFileSync('firebase-blueprint.json', JSON.stringify(bp, null, 2));
