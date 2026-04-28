const fs = require('fs');

const rulesPath = 'firestore.rules';
const content = fs.readFileSync(rulesPath, 'utf8');

const validationFns = `
    function isValidKpiTarget(data) {
      return data.keys().hasAll(['name', 'period', 'targetValue', 'unit', 'tenantId', 'createdAt', 'updatedAt']) &&
             data.name is string && data.period is string &&
             data.targetValue is number && data.unit is string &&
             data.tenantId is string && data.createdAt is timestamp && data.updatedAt is timestamp;
    }

    function isValidKpiEntry(data) {
      return data.keys().hasAll(['kpiName', 'date', 'actualValue', 'tenantId', 'createdAt', 'updatedAt']) &&
             data.kpiName is string && data.date is string &&
             data.actualValue is number && data.tenantId is string &&
             data.createdAt is timestamp && data.updatedAt is timestamp;
    }

    function isValidServiceReport(data) {
      return data.keys().hasAll(['serviceName', 'date', 'attendanceActual', 'visitorsActual', 'tenantId', 'createdAt', 'updatedAt']) &&
             data.serviceName is string && data.date is string &&
             data.attendanceActual is number && data.visitorsActual is number &&
             data.tenantId is string && data.createdAt is timestamp && data.updatedAt is timestamp;
    }

    function isValidFinancialReport(data) {
      return data.keys().hasAll(['title', 'date', 'amount', 'tenantId', 'createdAt', 'updatedAt']) &&
             data.title is string && data.date is string &&
             data.amount is number && data.tenantId is string &&
             data.createdAt is timestamp && data.updatedAt is timestamp;
    }
`;

const rulesBlocks = `
    match /kpi_targets/{targetId} {
      allow get, list: if isSignedIn() && resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;

      allow create: if isSignedIn() && isValidId(targetId) && isValidKpiTarget(incoming()) &&
                       incoming().tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId &&
                       incoming().createdAt == request.time &&
                       incoming().updatedAt == request.time &&
                       isAdmin();

      allow update: if isSignedIn() && isValidId(targetId) && isValidKpiTarget(incoming()) &&
                       incoming().tenantId == existing().tenantId &&
                       incoming().createdAt == existing().createdAt &&
                       incoming().diff(existing()).affectedKeys().hasOnly(['name', 'period', 'targetValue', 'unit', 'updatedAt']) &&
                       incoming().updatedAt == request.time &&
                       isAdmin();

      allow delete: if isAdmin();
    }

    match /kpi_entries/{entryId} {
      allow get, list: if isSignedIn() && resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;

      allow create: if isSignedIn() && isValidId(entryId) && isValidKpiEntry(incoming()) &&
                       incoming().tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId &&
                       incoming().createdAt == request.time &&
                       incoming().updatedAt == request.time &&
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin', 'pastor']);

      allow update: if isSignedIn() && isValidId(entryId) && isValidKpiEntry(incoming()) &&
                       incoming().tenantId == existing().tenantId &&
                       incoming().createdAt == existing().createdAt &&
                       incoming().diff(existing()).affectedKeys().hasOnly(['actualValue', 'targetValue', 'notes', 'updatedAt']) &&
                       incoming().updatedAt == request.time &&
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin', 'pastor']);

      allow delete: if isAdmin();
    }

    match /service_reports/{reportId} {
      allow get, list: if isSignedIn() && resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;

      allow create: if isSignedIn() && isValidId(reportId) && isValidServiceReport(incoming()) &&
                       incoming().tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId &&
                       incoming().createdAt == request.time &&
                       incoming().updatedAt == request.time &&
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin', 'pastor']);

      allow update: if isSignedIn() && isValidId(reportId) && isValidServiceReport(incoming()) &&
                       incoming().tenantId == existing().tenantId &&
                       incoming().createdAt == existing().createdAt &&
                       incoming().diff(existing()).affectedKeys().hasOnly(['attendanceActual', 'attendanceTarget', 'visitorsActual', 'visitorsTarget', 'updatedAt']) &&
                       incoming().updatedAt == request.time &&
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin', 'pastor']);

      allow delete: if isAdmin();
    }

    match /financial_reports/{reportId} {
      allow get, list: if isSignedIn() && resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;

      allow create: if isSignedIn() && isValidId(reportId) && isValidFinancialReport(incoming()) &&
                       incoming().tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId &&
                       incoming().createdAt == request.time &&
                       incoming().updatedAt == request.time &&
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin', 'pastor']);

      allow update: if isSignedIn() && isValidId(reportId) && isValidFinancialReport(incoming()) &&
                       incoming().tenantId == existing().tenantId &&
                       incoming().createdAt == existing().createdAt &&
                       incoming().diff(existing()).affectedKeys().hasOnly(['amount', 'target', 'updatedAt']) &&
                       incoming().updatedAt == request.time &&
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin', 'pastor']);

      allow delete: if isAdmin();
    }
`;

let parts = content.split('// Entities Validations');
let newContent = parts[0] + '// Entities Validations\n' + validationFns + parts[1];

let lastBraceIdx = newContent.lastIndexOf('  }\n}');
newContent = newContent.slice(0, lastBraceIdx) + rulesBlocks + '\n' + newContent.slice(lastBraceIdx);

// Note: we should also fix Task validation to allow description and assignedTo
newContent = newContent.replace(
  "data.keys().hasAll(['title', 'tag', 'status', 'tenantId', 'createdBy', 'createdAt', 'updatedAt']) &&",
  "data.keys().hasAll(['title', 'tag', 'status', 'tenantId', 'createdBy', 'createdAt', 'updatedAt']) &&"
);

fs.writeFileSync(rulesPath, newContent);
