import { neon } from '@neondatabase/serverless';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { POSTGRES_URL } from '$env/static/private';

const connectionString: string = "postgres://neondb_owner:npg_GoYmh8Iknz0f@ep-delicate-shadow-a2mhoq1s-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(connectionString);

export const GET: RequestHandler = async () => {
  try {
    // Query to get all tables in the current database
    const tables = await sql`
      SELECT 
        table_name, 
        table_schema,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
      FROM 
        information_schema.tables t
      WHERE 
        table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY 
        table_schema, table_name
    `;
    
    return json({
      success: true,
      tables
    });
  } catch (error) {
    console.error('Database query error:', error);
    return json({
      success: false,
      error: 'Failed to fetch database tables',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}; 