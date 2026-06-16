import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = initializeApp();
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || 'ai-studio-534c2e7e-8664-4b76-95e3-faf31fc1628b');

async function run() {
  const actions = await db.collection('action_plans').get();
  const batch = db.batch();
  let count = 0;
  
  actions.docs.forEach(d => {
    const data = d.data();
    // Normalize into 'tasks' schema
    const newRef = db.collection('tasks').doc();
    batch.set(newRef, {
      title: data.action_title || data.title || '',
      description: data.strategy_detail || data.description || '',
      tag: data.group_department || data.root_problem || data.tag || 'Geral',
      assigneeId: data.assignee_name || data.assigneeId || 'Nao atribuido',
      status: data.status || 'todo',
      dueDate: data.due_date || data.dueDate || '',
      tenantId: data.tenantId || '',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    batch.delete(d.ref); // remove old
    count++;
  });

  if (count > 0) {
    await batch.commit();
  }
  console.log(`Migrated ${count} action_plans to tasks.`);
}
run().catch(console.error);
