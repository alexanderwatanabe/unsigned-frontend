import { neon } from '@neondatabase/serverless';
import type { PageServerLoad } from './$types';

// Get database connection string from environment
// This approach works both with SvelteKit's $env modules and with process.env for Vercel
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
}
const sql = neon(connectionString!); // Non-null assertion

export const load: PageServerLoad = async () => {
    try {
        const response = await sql`SELECT version()`;
        const { version } = response[0];
        return {
            success: true,
            version,
        };
    } catch (error) {
        console.error('Database connection error:', error);
        return {
            success: false,
            error: 'Failed to connect to database',
            message: error instanceof Error ? error.message : String(error)
        };
    }
}; 