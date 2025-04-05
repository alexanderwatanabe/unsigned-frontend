import { neon } from '@neondatabase/serverless';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Use environment variable for database connection
const connectionString: string = process.env.DATABASE_URL as string;
const sql = neon(connectionString);

export const POST: RequestHandler = async () => {
  try {
    // Drop the existing tables if they exist
    await sql`DROP TABLE IF EXISTS composition_items CASCADE`;
    await sql`DROP TABLE IF EXISTS compositions CASCADE`;
    
    // Create a single compositions table with positions stored as JSON
    await sql`
      CREATE TABLE IF NOT EXISTS compositions (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(100) UNIQUE NOT NULL,
        positions JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    
    return json({
      success: true,
      message: 'Schema created successfully'
    });
  } catch (error) {
    console.error('Schema creation error:', error);
    return json({
      success: false,
      error: 'Failed to create schema',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}; 