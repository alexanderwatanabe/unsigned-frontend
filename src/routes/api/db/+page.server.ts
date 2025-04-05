import { neon } from '@neondatabase/serverless';
import type { PageServerLoad } from './$types';

import { POSTGRES_URL } from '$env/static/private';

// Get database connection string from environment with fallback for build time
const connectionString = POSTGRES_URL;
// Only initialize neon if we have a connection string
const sql = neon(connectionString);

export const load: PageServerLoad = async () => {
    // Return early if no connection string is available (during build)
    if (!connectionString || !sql) {
        console.warn('POSTGRES_URL environment variable is not set');
        return {
            success: false,
            error: 'Database connection not configured',
            message: 'POSTGRES_URL environment variable is not set'
        };
    }
    
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