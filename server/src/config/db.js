import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDb() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log(`[db] connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
}
