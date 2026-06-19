import * as admin from 'firebase-admin';

// Initialize Firebase Admin (assuming default credentials or service account is set)
admin.initializeApp();
const db = admin.firestore();

async function migrateAddresses() {
  console.log("Starting address migration...");
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();

  let migratedCount = 0;
  const batchSize = 100;
  let batch = db.batch();
  let currentBatchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Only migrate if we have a flat 'address' and no 'street' or 'city'
    if (data.address && !data.street && !data.city) {
      console.log(`Migrating address for user: ${data.name || doc.id} (${data.address})`);
      
      const flatAddress = data.address as string;
      const parts = flatAddress.split('-').map(s => s.trim());
      
      let street = '';
      let neighborhood = '';
      let city = '';

      if (parts.length >= 3) {
        street = parts[0];
        neighborhood = parts[1];
        city = parts[2];
      } else if (parts.length === 2) {
        street = parts[0];
        city = parts[1];
      } else {
        street = flatAddress;
      }

      batch.update(doc.ref, {
        street: street || "",
        neighborhood: neighborhood || "",
        city: city || "",
      });

      currentBatchCount++;
      migratedCount++;

      if (currentBatchCount >= batchSize) {
        await batch.commit();
        console.log(`Committed batch of ${currentBatchCount} updates`);
        batch = db.batch();
        currentBatchCount = 0;
      }
    }
  }

  if (currentBatchCount > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${currentBatchCount} updates`);
  }

  console.log(`Migration complete. Migrated ${migratedCount} users.`);
}

migrateAddresses().catch(console.error);
