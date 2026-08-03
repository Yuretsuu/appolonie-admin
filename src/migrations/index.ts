import * as migration_20260803_233935_add_categories from './20260803_233935_add_categories';

export const migrations = [
  {
    up: migration_20260803_233935_add_categories.up,
    down: migration_20260803_233935_add_categories.down,
    name: '20260803_233935_add_categories'
  },
];
