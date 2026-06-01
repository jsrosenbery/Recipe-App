import express from 'express';
import { query } from '../db/pool.js';
import { getDefaultUserId } from '../services/defaultUser.js';

export const tagsRouter = express.Router();

tagsRouter.get('/', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM tags ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

tagsRouter.post('/', async (req, res, next) => {
  try {
    const userId = await getDefaultUserId();
    const result = await query(
      `INSERT INTO tags (user_id, name, color)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, name) DO UPDATE SET color = EXCLUDED.color
       RETURNING *`,
      [userId, req.body.name, req.body.color || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

tagsRouter.delete('/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM tags WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
