const fs = require('fs');

const blueprintPath = 'firebase-blueprint.json';
const bp = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));

bp.entities.VisitorLead = {
  "title": "VisitorLead",
  "description": "Visitor Lead for pastoral care",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "phone": { "type": "string" },
    "neighborhood": { "type": "string" },
    "dateVisited": { "type": "string" },
    "source": { "type": "string" },
    "status": { "type": "string" },
    "assignedCellId": { "type": "string" },
    "notes": { "type": "string" },
    "tenantId": { "type": "string" },
    "createdAt": { "type": "number" },
    "updatedAt": { "type": "number" }
  },
  "required": ["name", "phone", "neighborhood", "dateVisited", "source", "status", "tenantId", "createdAt", "updatedAt"]
};

bp.entities.PrayerRequest = {
  "title": "PrayerRequest",
  "description": "Prayer requests from users",
  "type": "object",
  "properties": {
    "authorName": { "type": "string" },
    "date": { "type": "string" },
    "reason": { "type": "string" },
    "details": { "type": "string" },
    "isPrivate": { "type": "boolean" },
    "status": { "type": "string" },
    "tenantId": { "type": "string" },
    "createdAt": { "type": "number" },
    "updatedAt": { "type": "number" }
  },
  "required": ["authorName", "date", "reason", "details", "isPrivate", "status", "tenantId", "createdAt", "updatedAt"]
};

bp.entities.RiskAlert = {
  "title": "RiskAlert",
  "description": "Alerts for members at risk",
  "type": "object",
  "properties": {
    "memberId": { "type": "string" },
    "memberName": { "type": "string" },
    "weeksAbsent": { "type": "number" },
    "lastCellDate": { "type": "string" },
    "riskLevel": { "type": "string" },
    "tenantId": { "type": "string" },
    "createdAt": { "type": "number" },
    "updatedAt": { "type": "number" }
  },
  "required": ["memberId", "memberName", "weeksAbsent", "lastCellDate", "riskLevel", "tenantId", "createdAt", "updatedAt"]
};

bp.firestore["/visitor_leads/{leadId}"] = {
  "schema": { "$ref": "#/entities/VisitorLead" },
  "description": "Visitor Leads"
};

bp.firestore["/prayer_requests/{requestId}"] = {
  "schema": { "$ref": "#/entities/PrayerRequest" },
  "description": "Prayer Requests"
};

bp.firestore["/risk_alerts/{alertId}"] = {
  "schema": { "$ref": "#/entities/RiskAlert" },
  "description": "Risk Alerts"
};

fs.writeFileSync(blueprintPath, JSON.stringify(bp, null, 2));
