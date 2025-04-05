import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  // Create a safe version of the environment to return
  const safeEnv = {
    // List of environment variables we're looking for
    DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
    POSTGRES_URL: process.env.POSTGRES_URL ? 'Set' : 'Not set',
    POSTGRES_DATABASE: process.env.POSTGRES_DATABASE ? 'Set' : 'Not set',
    NODE_ENV: process.env.NODE_ENV,
    // Add any other relevant env vars
  };
  
  return json({
    env: safeEnv,
    nodeVersion: process.version,
  });
}; 