const fs = require('fs');

const rulesPath = 'firestore.rules';
const content = fs.readFileSync(rulesPath, 'utf8');

// We need to add validation functions for Ministry, Scale, Briefing, MinistryEvent
const validationFns = `
    function isValidMinistry(data) {
      return data.keys().hasAll(['name', 'description', 'leaderId', 'leaderName', 'icon', 'tenantId', 'createdAt', 'updatedAt']) &&
             data.name is string && data.name.size() <= 200 &&
             data.description is string && data.description.size() <= 2000 &&
             data.leaderId is string && data.leaderId.size() <= 128 &&
             data.leaderName is string && data.leaderName.size() <= 200 &&
             data.icon is string && data.icon.size() <= 50 &&
             data.tenantId is string && data.tenantId.size() <= 128 &&
             data.createdAt is timestamp &&
             data.updatedAt is timestamp;
    }

    function isValidScale(data) {
      return data.keys().hasAll(['ministryId', 'eventName', 'date', 'time', 'assignments', 'tenantId', 'createdAt', 'updatedAt']) &&
             data.ministryId is string && data.ministryId.size() <= 128 &&
             data.eventName is string && data.eventName.size() <= 200 &&
             data.date is string && data.date.size() <= 50 &&
             data.time is string && data.time.size() <= 50 &&
             data.assignments is list && data.assignments.size() <= 200 &&
             data.tenantId is string && data.tenantId.size() <= 128 &&
             data.createdAt is timestamp &&
             data.updatedAt is timestamp;
    }

    function isValidBriefing(data) {
      return data.keys().hasAll(['ministryId', 'requesterMinistry', 'title', 'description', 'deadline', 'status', 'tenantId', 'createdAt', 'updatedAt']) &&
             data.ministryId is string && data.ministryId.size() <= 128 &&
             data.requesterMinistry is string && data.requesterMinistry.size() <= 200 &&
             data.title is string && data.title.size() <= 200 &&
             data.description is string && data.description.size() <= 2000 &&
             data.deadline is string && data.deadline.size() <= 50 &&
             data.status is string && data.status.size() <= 50 &&
             data.tenantId is string && data.tenantId.size() <= 128 &&
             data.createdAt is timestamp &&
             data.updatedAt is timestamp;
    }

    function isValidMinistryEvent(data) {
      return data.keys().hasAll(['ministryId', 'title', 'date', 'type', 'tenantId', 'createdAt', 'updatedAt']) &&
             data.ministryId is string && data.ministryId.size() <= 128 &&
             data.title is string && data.title.size() <= 200 &&
             data.date is string && data.date.size() <= 50 &&
             data.type is string && data.type.size() <= 50 &&
             data.tenantId is string && data.tenantId.size() <= 128 &&
             data.createdAt is timestamp &&
             data.updatedAt is timestamp;
    }

`;

const rulesBlocks = `
    match /ministries/{ministryId} {
      allow get, list: if isSignedIn() && resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;

      allow create: if isSignedIn() && isValidId(ministryId) && isValidMinistry(incoming()) &&
                       incoming().tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId &&
                       incoming().createdAt == request.time &&
                       incoming().updatedAt == request.time &&
                       isAdmin();

      allow update: if isSignedIn() && isValidId(ministryId) && isValidMinistry(incoming()) && (
        isAdmin() ||
        (
          existing().tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId &&
          existing().leaderId == request.auth.uid &&
          incoming().tenantId == existing().tenantId &&
          incoming().createdAt == existing().createdAt &&
          incoming().diff(existing()).affectedKeys().hasOnly(['name', 'description', 'leaderId', 'leaderName', 'icon', 'updatedAt']) &&
          incoming().updatedAt == request.time
        )
      );

      allow delete: if isAdmin();
    }

    match /scales/{scaleId} {
      allow get, list: if isSignedIn() && resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;

      allow create: if isSignedIn() && isValidId(scaleId) && isValidScale(incoming()) &&
                       incoming().tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId &&
                       incoming().createdAt == request.time &&
                       incoming().updatedAt == request.time &&
                       (isAdmin() || get(/databases/$(database)/documents/ministries/$(incoming().ministryId)).data.leaderId == request.auth.uid);

      allow update: if isSignedIn() && isValidId(scaleId) && isValidScale(incoming()) &&
                       incoming().tenantId == existing().tenantId &&
                       incoming().createdAt == existing().createdAt &&
                       incoming().diff(existing()).affectedKeys().hasOnly(['eventName', 'date', 'time', 'assignments', 'setlist', 'notes', 'updatedAt']) &&
                       incoming().updatedAt == request.time;

      allow delete: if isAdmin() || (isSignedIn() && get(/databases/$(database)/documents/ministries/$(existing().ministryId)).data.leaderId == request.auth.uid);
    }

    match /briefings/{briefingId} {
      allow get, list: if isSignedIn() && resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;

      allow create: if isSignedIn() && isValidId(briefingId) && isValidBriefing(incoming()) &&
                       incoming().tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId &&
                       incoming().createdAt == request.time &&
                       incoming().updatedAt == request.time;

      allow update: if isSignedIn() && isValidId(briefingId) && isValidBriefing(incoming()) &&
                       incoming().tenantId == existing().tenantId &&
                       incoming().createdAt == existing().createdAt &&
                       incoming().diff(existing()).affectedKeys().hasOnly(['title', 'description', 'deadline', 'status', 'assigneeId', 'updatedAt']) &&
                       incoming().updatedAt == request.time;

      allow delete: if isAdmin();
    }

    match /ministry_events/{eventId} {
      allow get, list: if isSignedIn() && resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;

      allow create: if isSignedIn() && isValidId(eventId) && isValidMinistryEvent(incoming()) &&
                       incoming().tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId &&
                       incoming().createdAt == request.time &&
                       incoming().updatedAt == request.time &&
                       (isAdmin() || get(/databases/$(database)/documents/ministries/$(incoming().ministryId)).data.leaderId == request.auth.uid);

      allow update: if isSignedIn() && isValidId(eventId) && isValidMinistryEvent(incoming()) &&
                       incoming().tenantId == existing().tenantId &&
                       incoming().createdAt == existing().createdAt &&
                       incoming().diff(existing()).affectedKeys().hasOnly(['title', 'date', 'type', 'updatedAt']) &&
                       incoming().updatedAt == request.time &&
                       (isAdmin() || get(/databases/$(database)/documents/ministries/$(existing().ministryId)).data.leaderId == request.auth.uid);

      allow delete: if isAdmin() || (isSignedIn() && get(/databases/$(database)/documents/ministries/$(existing().ministryId)).data.leaderId == request.auth.uid);
    }
`;

let parts = content.split('// Entities Validations');
let newContent = parts[0] + '// Entities Validations\n' + validationFns + parts[1];

let lastBraceIdx = newContent.lastIndexOf('  }\n}');
newContent = newContent.slice(0, lastBraceIdx) + rulesBlocks + '\n' + newContent.slice(lastBraceIdx);

fs.writeFileSync(rulesPath, newContent);
