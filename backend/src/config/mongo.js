import mongoose from 'mongoose';
import { config } from './env.js';

let connected = false;

export async function connectMongo() {
  if (connected) return;
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongo.uri);
  connected = true;
  console.log('[mongo] connected:', config.mongo.uri.replace(/\/\/[^@]+@/, '//***@'));
}

// Khi driver gặp lỗi, app không chết im lặng.
mongoose.connection.on('error', (err) => console.error('[mongo] error:', err.message));
mongoose.connection.on('disconnected', () => { connected = false; });
