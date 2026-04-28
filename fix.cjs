const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

const targetStr2 = 'allow list: if isSignedIn() && resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;';
const replaceStr2 = 'allow list: if isSignedIn() && (isAdmin() || (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId));';

rules = rules.split(targetStr2).join(replaceStr2);

fs.writeFileSync('firestore.rules', rules);
