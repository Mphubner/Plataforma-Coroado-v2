const fs = require('fs');

const bpPath = 'firebase-blueprint.json';
const bp = JSON.parse(fs.readFileSync(bpPath, 'utf8'));

// 1. Update Task properties
bp.entities.Task.properties.dueDate = { type: "string" };
bp.entities.Task.properties.startDate = { type: "string" };
bp.entities.Task.properties.completedAt = { type: "string" };

// 2. Add TaskUpdate entity
bp.entities.TaskUpdate = {
  title: "TaskUpdate",
  description: "Comment or update on a task",
  type: "object",
  properties: {
    taskId: { type: "string" },
    content: { type: "string" },
    authorName: { type: "string" },
    date: { type: "string" },
    tenantId: { type: "string" },
    createdAt: { type: "number" }
  },
  required: ["taskId", "content", "authorName", "date", "tenantId", "createdAt"]
};

bp.firestore["/task_updates/{updateId}"] = {
  schema: { $ref: "#/entities/TaskUpdate" },
  description: "Updates and comments for kanban tasks"
};

fs.writeFileSync(bpPath, JSON.stringify(bp, null, 2));

const rulesPath = 'firestore.rules';
let rulesContent = fs.readFileSync(rulesPath, 'utf8');

// Update validation fn for Task
const oldTaskVal = `data.keys().hasAll(['title', 'tag', 'assigneeId', 'status', 'tenantId', 'createdBy', 'createdAt', 'updatedAt']) &&`;
const newTaskVal = `data.keys().hasAll(['title', 'tag', 'status', 'tenantId', 'createdBy', 'createdAt', 'updatedAt']) &&`;

// We just replace the strict hasOnly in Task update block to allow new fields.
// Wait, replacing the whole rule is safer. Let's just do a RegExp replace for Task update rules.

const taskUpdateObjRegex = /incoming\(\)\.diff\(existing\(\)\)\.affectedKeys\(\)\.hasOnly\(\[(.*?)\]\)/g;

rulesContent = rulesContent.replace(taskUpdateObjRegex, (match, p1) => {
  if (p1.includes("'status'") && p1.includes("'description'")) {
     return `incoming().diff(existing()).affectedKeys().hasOnly(['title', 'tag', 'status', 'description', 'assignedTo', 'assigneeId', 'dueDate', 'startDate', 'completedAt', 'updatedAt'])`;
  }
  return match;
});

const taskUpdateRuleBlock = `
    match /task_updates/{updateId} {
      allow get, list: if isSignedIn() && resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;
      allow create: if isSignedIn() && isValidId(updateId) &&
                       incoming().keys().hasAll(['taskId', 'content', 'authorName', 'date', 'tenantId', 'createdAt']) &&
                       incoming().content is string && incoming().authorName is string &&
                       incoming().taskId is string && incoming().date is string &&
                       incoming().tenantId is string && incoming().createdAt is timestamp &&
                       incoming().tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;
      allow update: if false;
      allow delete: if isAdmin();
    }
`;

if (!rulesContent.includes('match /task_updates/')) {
    let lastBraceIdx = rulesContent.lastIndexOf('  }\n}');
    rulesContent = rulesContent.slice(0, lastBraceIdx) + taskUpdateRuleBlock + '\n' + rulesContent.slice(lastBraceIdx);
}

fs.writeFileSync(rulesPath, rulesContent);
