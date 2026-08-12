import * as migration_20260803_233935_add_categories from './20260803_233935_add_categories';
import * as migration_20260812_204819_image_categories from './20260812_204819_image_categories';

export const migrations = [
  {
    up: migration_20260803_233935_add_categories.up,
    down: migration_20260803_233935_add_categories.down,
    name: '20260803_233935_add_categories',
  },
  {
    up: migration_20260812_204819_image_categories.up,
    down: migration_20260812_204819_image_categories.down,
    name: '20260812_204819_image_categories'
  },
];
