import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDb() {
  console.log('[db] URI loaded:', Boolean(config.mongoUri));
  console.log(
    '[db] URI scheme:',
    config.mongoUri?.split('://')[0] || 'missing'
  );

  await mongoose.connect(config.mongoUri);

  console.log('[db] MongoDB connected');
}