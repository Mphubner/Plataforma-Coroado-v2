const fs = require('fs');

let rules = fs.readFileSync('firestore.rules', 'utf8');

// 1. Add events rule block before ministries
const eventsBlock = `    match /events/{eventId} {
      allow get, list: if true;
      allow create, update, delete: if isSignedIn() && isAdmin();
    }
`;

if (!rules.includes('match /events/{eventId}')) {
   rules = rules.replace('match /ministries/{ministryId} {', eventsBlock + '\n    match /ministries/{ministryId} {');
}

// 2. Make ministries public for read
rules = rules.replace(
  'match /ministries/{ministryId} {\n      allow get, list: if isSignedIn() && (isAdmin() || (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId));',
  'match /ministries/{ministryId} {\n      allow get, list: if true;'
);

fs.writeFileSync('firestore.rules', rules);
