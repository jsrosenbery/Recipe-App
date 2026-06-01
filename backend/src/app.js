import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import { recipesRouter } from './routes/recipes.js';
import { mealPlansRouter } from './routes/mealPlans.js';
import { shoppingListsRouter } from './routes/shoppingLists.js';
import { tagsRouter } from './routes/tags.js';
import { nutritionRouter } from './routes/nutrition.js';

export const app = express();

app.use(helmet());
app.use(cors({
  origin: config.frontendOrigin.split(',').map((origin) => origin.trim()),
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'recipe-planner-api' });
});

app.use('/api/recipes', recipesRouter);
app.use('/api/meal-plans', mealPlansRouter);
app.use('/api/shopping-lists', shoppingListsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/nutrition', nutritionRouter);

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    error: error.message || 'Unexpected server error'
  });
});
