import { neon } from '@neondatabase/serverless';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DATABASE_URL } from '$env/static/private';

// Get database connection string from environment with fallback for build time
const connectionString = DATABASE_URL;
// Only initialize neon if we have a connection string
const sql = neon(connectionString);

export const GET: RequestHandler = async () => {
  // Return early if no connection string is available (during build)
  if (!connectionString || !sql) {
    console.warn('DATABASE_URL environment variable is not set');
    return json({
      success: false,
      error: 'Database connection not configured',
      message: 'DATABASE_URL environment variable is not set'
    }, { status: 500 });
  }

  try {
    const response = await sql`SELECT version()`;
    const { version } = response[0];
    
    return json({
      success: true,
      version
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return json({
      success: false,
      error: 'Failed to connect to database',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}; 