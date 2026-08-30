import { connectDB, disconnectDB } from '../config/db.js';
import { seedInterests } from '../utils/seedInterests.js';

await connectDB();
await seedInterests();
await disconnectDB();
process.exit(0);
