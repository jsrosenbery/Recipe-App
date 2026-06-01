# Recipe Planner

A full-stack personal recipe planning app built for:

- Frontend: React + Vite, deployed on Vercel
- Backend: Express.js API, deployed on Render
- Database: Render PostgreSQL
- Source control: GitHub

The backend owns recipe URL importing, database access, shopping list generation, and the future nutrition API integration. The frontend only calls the API and never stores database credentials or API keys.

## Features

- Save recipes manually or by importing a recipe URL.
- Parse JSON-LD recipe metadata when available.
- Edit imported recipes before saving.
- Store ingredients, instructions, tags, notes, images, times, servings, and nutrition estimates.
- Plan breakfast, lunch, dinner, and snack meals across a week.
- Generate grocery lists from the weekly plan.
- Group shopping list items by grocery category.
- Combine simple duplicate quantities such as `1 onion + 2 onions`.
- Check off, add, edit, remove, and print shopping list items.
- View weekly nutrition totals from saved recipe estimates.

## Project Structure

```txt
.
|-- backend/          Express API for Render
|-- database/         PostgreSQL schema
|-- frontend/         React app for Vercel
|-- package.json      Workspace scripts
`-- README.md
```

## Local Setup

Install dependencies:

```bash
npm install
```

Create backend environment file:

```bash
cp backend/.env.example backend/.env
```

Create frontend environment file:

```bash
cp frontend/.env.example frontend/.env
```

Run PostgreSQL locally, then update `backend/.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/recipe_planner
FRONTEND_ORIGIN=http://localhost:5173
```

Apply the database schema:

```bash
npm run migrate
```

Start both apps:

```bash
npm run dev
```

The frontend runs at `http://localhost:5173`.
The backend runs at `http://localhost:4000`.

## API Overview

Health:

- `GET /health`

Recipes:

- `GET /api/recipes`
- `POST /api/recipes`
- `GET /api/recipes/:id`
- `PUT /api/recipes/:id`
- `DELETE /api/recipes/:id`
- `POST /api/recipes/import`

Meal plans:

- `GET /api/meal-plans/:weekStart`
- `POST /api/meal-plans/:weekStart/items`
- `PUT /api/meal-plans/:weekStart/items`
- `DELETE /api/meal-plans/items/:itemId`

Shopping lists:

- `GET /api/shopping-lists/week/:weekStart`
- `POST /api/shopping-lists/week/:weekStart/generate`
- `GET /api/shopping-lists/:id`
- `POST /api/shopping-lists/:id/items`
- `PATCH /api/shopping-lists/items/:itemId`
- `DELETE /api/shopping-lists/items/:itemId`

Tags:

- `GET /api/tags`
- `POST /api/tags`
- `DELETE /api/tags/:id`

Nutrition:

- `GET /api/nutrition/week/:weekStart`

## Database

The schema is in `database/schema.sql` and includes users, recipes, ingredients, instructions, meal plans, shopping lists, nutrition estimates, and tags.

The app creates a default single user for now. The schema is ready for real authentication later.

## Render Deployment

1. Create a PostgreSQL database in Render.
2. Create a Render Web Service from this GitHub repository.
3. Set the root directory to `backend`.
4. Use these commands:

```bash
Build Command: npm install
Start Command: npm run start
```

5. Add environment variables:

```env
NODE_ENV=production
DATABASE_URL=<Render PostgreSQL internal connection string>
FRONTEND_ORIGIN=https://your-vercel-app.vercel.app
NUTRITION_API_KEY=
```

6. Run the migration once from a Render shell:

```bash
npm run migrate
```

## Vercel Deployment

1. Import the GitHub repository into Vercel.
2. Set the root directory to `frontend`.
3. Use the default Vite settings:

```bash
Build Command: npm run build
Output Directory: dist
```

4. Add the frontend environment variable:

```env
VITE_API_BASE_URL=https://your-render-api.onrender.com
```

## Nutrition Integration Notes

Recipe pages sometimes expose nutrition through JSON-LD. When present, the importer maps it into `nutrition_estimates`.

When nutrition is missing, the app stores a placeholder structure with nullable fields. A future nutrition service can be added behind `backend/src/services/nutrition.js` without changing frontend credentials or database ownership.

## Recipe Import Notes

`POST /api/recipes/import` fetches the submitted URL server-side and looks for JSON-LD recipe schema. If schema metadata is missing, the backend returns a fallback draft with the page title and Open Graph image when available. The frontend always lets you edit the draft before saving.
