import { neon } from '@neondatabase/serverless';
import type { PageServerLoad } from './$types';

const connectionString: string = process.env.DATABASE_URL as string;
const sql = neon(connectionString);

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