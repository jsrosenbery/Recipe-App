import { query } from '../db/pool.js';

export async function ensureDefaultUser() {
  const result = await query(
    `INSERT INTO users (email, display_name)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING *`,
    ['owner@example.local', 'Home Cook']
  );
  return result.rows[0];
}

export async function getDefaultUserId() {
  const user = await ensureDefaultUser();
  return user.id;
}
