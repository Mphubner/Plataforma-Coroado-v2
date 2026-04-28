const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

const targetStr = "incoming().diff(existing()).affectedKeys().hasOnly(['name', 'phone', 'birthdate', 'updatedAt'])";
const replaceStr = "incoming().diff(existing()).affectedKeys().hasOnly(['name', 'phone', 'birthdate', 'address', 'lat', 'lng', 'supervisorId', 'updatedAt'])";

rules = rules.split(targetStr).join(replaceStr);
fs.writeFileSync('firestore.rules', rules);
