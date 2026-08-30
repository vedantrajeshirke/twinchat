import { Interest } from '../models/Interest.js';
import { INTEREST_SEED } from './interestSeedData.js';

/** Upserts the starter list. Safe to run repeatedly; never deletes custom rows. */
export async function seedInterests({ quiet = false } = {}) {
  const ops = INTEREST_SEED.map(({ name, category }) => ({
    updateOne: {
      filter: { name },
      update: { $setOnInsert: { name, category, isActive: true } },
      upsert: true,
    },
  }));

  const result = await Interest.bulkWrite(ops, { ordered: false });
  const inserted = result.upsertedCount ?? 0;
  if (!quiet) {
    console.log(`✔ Interests seeded: ${inserted} new, ${INTEREST_SEED.length - inserted} existing`);
  }
  return inserted;
}
