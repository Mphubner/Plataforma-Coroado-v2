import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

async function run() {
  const instanceConnectionName = process.env.CLOUD_SQL_INSTANCE_CONNECTION_NAME || 'gen-lang-client-0529830528:us-east1:gen-lang-client-0529830528-instance';
  const user = process.env.CLOUD_SQL_USER || process.env.DB_USER || 'postgres';
  const password = process.env.CLOUD_SQL_PASSWORD || process.env.DB_PASSWORD;
  const database = process.env.CLOUD_SQL_DATABASE || process.env.DB_NAME || 'postgres';

  if (!password) {
    throw new Error('CLOUD_SQL_PASSWORD ou DB_PASSWORD deve estar configurado no ambiente.');
  }

  const connector = new Connector();
  const clientOpts = await connector.getOptions({
    instanceConnectionName,
    ipType: IpAddressTypes.PUBLIC,
  });

  console.log('Connecting to Cloud SQL...');
  const pool = new Pool({
    ...clientOpts,
    user,
    password,
    database,
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
