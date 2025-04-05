import { neon } from '@neondatabase/serverless';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Get database connection string from environment
// This approach works both with SvelteKit's $env modules and with process.env for Vercel
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
}
const sql = neon(connectionString!);

export const GET: RequestHandler = async () => {
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