const fs = require('fs');

const bpPath = 'firebase-blueprint.json';
const bp = JSON.parse(fs.readFileSync(bpPath, 'utf8'));

bp.entities.StrategicGoal = {
  title: "StrategicGoal",
  description: "Strategic pillar goal for the platform",
  type: "object",
  properties: {
    title: { type: "string" },
    pillar: { type: "string" }, 
    description: { type: "string" },
    targetText: { type: "string" },
    period: { type: "string" },
    progress: { type: "number" },
    color: { type: "string" },
    tenantId: { type: "string" },
    createdAt: { type: "number" },
    updatedAt: { type: "number" }
  },
  required: ["title", "pillar", "description", "targetText", "period", "progress", "color", "tenantId", "createdAt", "updatedAt"]
};

bp.firestore["/strategic_goals/{goalId}"] = {
  schema: { $ref: "#/entities/StrategicGoal" },
  description: "Strategic goals"
};

fs.writeFileSync(bpPath, JSON.stringify(bp, null, 2));

const rulesPath = 'firestore.rules';
let rulesContent = fs.readFileSync(rulesPath, 'utf8');

const validationFn = `
    function isValidStrategicGoal(data) {
      return data.keys().hasAll(['title', 'pillar', 'description', 'targetText', 'period', 'progress', 'color', 'tenantId', 'createdAt', 'updatedAt']) &&
             data.title is string && data.pillar is string &&
             data.description is string && data.targetText is string &&
             data.period is string && data.progress is number && data.color is string &&
             data.tenantId is string && data.createdAt is timestamp && data.updatedAt is timestamp;
    }
`;

const ruleBlock = `
    match /strategic_goals/{goalId} {
      allow get, list: if isSignedIn() && resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;

      allow create: if isSignedIn() && isValidId(goalId) && isValidStrategicGoal(incoming()) &&
                       incoming().tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId &&
                       incoming().createdAt == request.time &&
                       incoming().updatedAt == request.time &&
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin', 'pastor']);

      allow update: if isSignedIn() && isValidId(goalId) && isValidStrategicGoal(incoming()) &&
                       incoming().tenantId == existing().tenantId &&
                       incoming().createdAt == existing().createdAt &&
                       incoming().diff(existing()).affectedKeys().hasOnly(['title', 'pillar', 'description', 'targetText', 'period', 'progress', 'color', 'updatedAt']) &&
                       incoming().updatedAt == request.time &&
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin', 'pastor']);

      allow delete: if isAdmin();
    }
`;

let parts = rulesContent.split('// Entities Validations');
let newContent = parts[0] + '// Entities Validations\n' + validationFn + parts[1];

let lastBraceIdx = newContent.lastIndexOf('  }\n}');
newContent = newContent.slice(0, lastBraceIdx) + ruleBlock + '\n' + newContent.slice(lastBraceIdx);

fs.writeFileSync(rulesPath, newContent);
