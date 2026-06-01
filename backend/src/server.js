import { app } from './app.js';
import { config } from './config.js';

app.listen(config.port, () => {
  console.log(`Recipe Planner API listening on port ${config.port}`);
});
