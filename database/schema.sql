CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  display_name TEXT NOT NULL DEFAULT 'Home Cook',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_url TEXT,
  image_url TEXT,
  servings TEXT,
  prep_time TEXT,
  cook_time TEXT,
  total_time TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE recipes ALTER COLUMN servings TYPE TEXT USING servings::TEXT;

CREATE TABLE IF NOT EXISTS recipe_tags (
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);

CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  raw_text TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  name TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instructions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nutrition_estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  meal_plan_id UUID,
  scope TEXT NOT NULL DEFAULT 'recipe',
  calories NUMERIC,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  saturated_fat_g NUMERIC,
  fiber_g NUMERIC,
  sugar_g NUMERIC,
  sodium_mg NUMERIC,
  source TEXT NOT NULL DEFAULT 'placeholder',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

CREATE TABLE IF NOT EXISTS meal_plan_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  meal_type TEXT NOT NULL,
  servings NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE meal_plan_items DROP CONSTRAINT IF EXISTS meal_plan_items_meal_type_check;
ALTER TABLE meal_plan_items ADD CONSTRAINT meal_plan_items_meal_type_check CHECK (meal_type IN ('main', 'side_1', 'side_2'));
DELETE FROM meal_plan_items WHERE meal_type NOT IN ('main', 'side_1', 'side_2');

CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopping_list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  raw_text TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  is_manual BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_recipe_id ON ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_instructions_recipe_id ON instructions(recipe_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_plan_id ON meal_plan_items(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list_id ON shopping_list_items(shopping_list_id);
