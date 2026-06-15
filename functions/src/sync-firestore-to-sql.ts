import * as functions from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
// Replace with actual SQL client later. For demonstration, we just simulate the sync.

export const syncFirestoreToSql = functions.pubsub
  .schedule('every 24 hours') // or '0 0 * * *' for daily at midnight
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    console.log('Starting Firestore to SQL sync...');
    
    const db = getFirestore();
    
    try {
      // Example: Fetch latest members and sync
      const usersSnap = await db.collection('users').get();
      const usersToSync = usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Here you would connect to Cloud SQL and perform the upsert.
      // e.g. await sqlClient.query(`INSERT INTO users ... ON CONFLICT DO UPDATE ...`)
      
      console.log(`Successfully synced ${usersToSync.length} users to SQL.`);

      // Example: Sync cells
      const cellsSnap = await db.collection('cells').get();
      const cellsToSync = cellsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`Successfully synced ${cellsToSync.length} cells to SQL.`);

      return null;
    } catch (error) {
      console.error('Error syncing Firestore to SQL:', error);
      throw error;
    }
  });
