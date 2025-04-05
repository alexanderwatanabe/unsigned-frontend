import { neon } from '@neondatabase/serverless';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Get database connection string from environment with fallback for build time
const connectionString = process.env.DATABASE_URL || '';
// Only initialize neon if we have a connection string
const sql = connectionString ? neon(connectionString) : null;

export const POST: RequestHandler = async () => {
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
    // Drop the existing tables if they exist
    await sql!`DROP TABLE IF EXISTS composition_items CASCADE`;
    await sql!`DROP TABLE IF EXISTS compositions CASCADE`;
    
    // Create a single compositions table with positions stored as JSON
    await sql!`
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