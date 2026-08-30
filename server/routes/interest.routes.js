import { Router } from 'express';
import { Interest } from '../models/Interest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { INTEREST_CATEGORY_ORDER } from '../utils/interestSeedData.js';

export const interestRoutes = Router();

/** GET /api/interests, the full active list, grouped for the selector UI. */
interestRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const interests = await Interest.find({ isActive: true }).sort({ name: 1 }).lean();

    const byCategory = new Map();
    for (const interest of interests) {
      const key = interest.category || 'Other';
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key).push(interest);
    }

    const order = [...INTEREST_CATEGORY_ORDER, 'Other'];
    const categories = [...byCategory.entries()]
      .sort((a, b) => {
        const ai = order.indexOf(a[0]);
        const bi = order.indexOf(b[0]);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      })
      .map(([name, items]) => ({ name, interests: items }));

    res.json({ interests, categories });
  })
);
