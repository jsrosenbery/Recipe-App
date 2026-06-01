import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');

const schema = await fs.readFile(schemaPath, 'utf8');

try {
  await pool.query(schema);
  console.log('Database schema applied.');
} finally {
  await pool.end();
}
