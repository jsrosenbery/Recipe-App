import express from 'express';
import {
  addShoppingListItem,
  deleteShoppingListItem,
  generateShoppingList,
  getLatestShoppingList,
  getShoppingList,
  updateShoppingListItem
} from '../services/shoppingLists.js';

export const shoppingListsRouter = express.Router();

shoppingListsRouter.get('/week/:weekStart', async (req, res, next) => {
  try {
    const list = await getLatestShoppingList(req.params.weekStart);
    res.json(list || { items: [] });
  } catch (error) {
    next(error);
  }
});

shoppingListsRouter.post('/week/:weekStart/generate', async (req, res, next) => {
  try {
    res.status(201).json(await generateShoppingList(req.params.weekStart));
  } catch (error) {
    next(error);
  }
});

shoppingListsRouter.get('/:id', async (req, res, next) => {
  try {
    const list = await getShoppingList(req.params.id);
    if (!list) return res.status(404).json({ error: 'Shopping list not found' });
    res.json(list);
  } catch (error) {
    next(error);
  }
});

shoppingListsRouter.post('/:id/items', async (req, res, next) => {
  try {
    res.status(201).json(await addShoppingListItem(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
});

shoppingListsRouter.patch('/items/:itemId', async (req, res, next) => {
  try {
    const item = await updateShoppingListItem(req.params.itemId, req.body);
    if (!item) return res.status(404).json({ error: 'Shopping list item not found' });
    res.json(item);
  } catch (error) {
    next(error);
  }
});

shoppingListsRouter.delete('/items/:itemId', async (req, res, next) => {
  try {
    const deleted = await deleteShoppingListItem(req.params.itemId);
    if (!deleted) return res.status(404).json({ error: 'Shopping list item not found' });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
