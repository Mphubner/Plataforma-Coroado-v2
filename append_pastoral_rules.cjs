const fs = require('fs');

const rulesPath = 'firestore.rules';
const content = fs.readFileSync(rulesPath, 'utf8');

const validationFns = `
    function isValidVisitorLead(data) {
      return data.keys().hasAll(['name', 'phone', 'neighborhood', 'dateVisited', 'source', 'status', 'tenantId', 'createdAt', 'updatedAt']) &&
             data.name is string && data.name.size() <= 200 &&
             data.phone is string && data.phone.size() <= 50 &&
             data.neighborhood is string && data.neighborhood.size() <= 200 &&
             data.dateVisited is string && data.dateVisited.size() <= 50 &&
             data.source is string && data.source.size() <= 200 &&
             data.status is string && data.status.size() <= 50 &&
             data.tenantId is string && data.tenantId.size() <= 128 &&
             data.createdAt is timestamp &&
             data.updatedAt is timestamp;
    }

    function isValidPrayerRequest(data) {
      return data.keys().hasAll(['authorName', 'date', 'reason', 'details', 'isPrivate', 'status', 'tenantId', 'createdAt', 'updatedAt']) &&
             data.authorName is string && data.authorName.size() <= 200 &&
             data.date is string && data.date.size() <= 50 &&
             data.reason is string && data.reason.size() <= 200 &&
             data.details is string && data.details.size() <= 2000 &&
             data.isPrivate is bool &&
             data.status is string && data.status.size() <= 50 &&
             data.tenantId is string && data.tenantId.size() <= 128 &&
             data.createdAt is timestamp &&
             data.updatedAt is timestamp;
    }

    function isValidRiskAlert(data) {
      return data.keys().hasAll(['memberId', 'memberName', 'weeksAbsent', 'lastCellDate', 'riskLevel', 'tenantId', 'createdAt', 'updatedAt']) &&
             data.memberId is string && data.memberId.size() <= 128 &&
             data.memberName is string && data.memberName.size() <= 200 &&
             data.weeksAbsent is number &&
             data.lastCellDate is string && data.lastCellDate.size() <= 50 &&
             data.riskLevel is string && data.riskLevel.size() <= 50 &&
             data.tenantId is string && data.tenantId.size() <= 128 &&
             data.createdAt is timestamp &&
             data.updatedAt is timestamp;
    }
`;

const rulesBlocks = `
    match /visitor_leads/{leadId} {
      allow get, list: if isSignedIn() && resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;

      allow create: if isSignedIn() && isValidId(leadId) && isValidVisitorLead(incoming()) &&
                       incoming().tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId &&
                       incoming().createdAt == request.time &&
                       incoming().updatedAt == request.time;

      allow update: if isSignedIn() && isValidId(leadId) && isValidVisitorLead(incoming()) &&
                       incoming().tenantId == existing().tenantId &&
                       incoming().createdAt == existing().createdAt &&
                       incoming().diff(existing()).affectedKeys().hasOnly(['name', 'phone', 'neighborhood', 'dateVisited', 'source', 'status', 'assignedCellId', 'notes', 'updatedAt']) &&
                       incoming().updatedAt == request.time;

      allow delete: if isAdmin() || (isSignedIn() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['pastor']));
    }

    match /prayer_requests/{requestId} {
      allow get, list: if isSignedIn() && resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId &&
                         (!resource.data.isPrivate || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin', 'pastor']));

      allow create: if isSignedIn() && isValidId(requestId) && isValidPrayerRequest(incoming()) &&
                       incoming().tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId &&
                       incoming().createdAt == request.time &&
                       incoming().updatedAt == request.time;

      allow update: if isSignedIn() && isValidId(requestId) && isValidPrayerRequest(incoming()) &&
                       incoming().tenantId == existing().tenantId &&
                       incoming().createdAt == existing().createdAt &&
                       incoming().diff(existing()).affectedKeys().hasOnly(['status', 'updatedAt']) &&
                       incoming().updatedAt == request.time;

      allow delete: if isAdmin() || (isSignedIn() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['pastor']));
    }

    match /risk_alerts/{alertId} {
      allow get, list: if isSignedIn() && resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin', 'pastor', 'leader']);

      allow create: if isSignedIn() && isValidId(alertId) && isValidRiskAlert(incoming()) &&
                       incoming().tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId &&
                       incoming().createdAt == request.time &&
                       incoming().updatedAt == request.time;

      allow update: if isSignedIn() && isValidId(alertId) && isValidRiskAlert(incoming()) &&
                       incoming().tenantId == existing().tenantId &&
                       incoming().createdAt == existing().createdAt &&
                       incoming().diff(existing()).affectedKeys().hasOnly(['weeksAbsent', 'lastCellDate', 'riskLevel', 'updatedAt']) &&
                       incoming().updatedAt == request.time;

      allow delete: if isAdmin() || (isSignedIn() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['pastor']));
    }
`;

let parts = content.split('// Entities Validations');
let newContent = parts[0] + '// Entities Validations\n' + validationFns + parts[1];

let lastBraceIdx = newContent.lastIndexOf('  }\n}');
newContent = newContent.slice(0, lastBraceIdx) + rulesBlocks + '\n' + newContent.slice(lastBraceIdx);

fs.writeFileSync(rulesPath, newContent);
