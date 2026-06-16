import { Connector } from '@google-cloud/cloud-sql-connector';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

async function run() {
  const connector = new Connector();
  const clientOpts = await connector.getOptions({
    instanceConnectionName: 'gen-lang-client-0529830528:us-east1:gen-lang-client-0529830528-instance',
    ipType: 'PUBLIC',
  });

  console.log('Connecting to Cloud SQL...');
  const pool = new Pool({
    ...clientOpts,
    user: 'postgres',
    password: 'CoroadoBI#2026@Pass',
    database: 'postgres',
    max: 1
  });

  try {
    const schemaPath = path.resolve(process.cwd(), 'docs/sql-bi/coroado_finance_indicators_model.sql');
    console.log(`Reading schema from ${schemaPath}`);
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema...');
    await pool.query(sql);
    console.log('Schema executed successfully!');
  } catch (err) {
    console.error('Error executing schema:', err);
  } finally {
    await pool.end();
    connector.close();
  }
}

run().catch(console.error);
