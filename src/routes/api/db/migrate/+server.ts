import { neon } from '@neondatabase/serverless';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as dotenv from 'dotenv';
import { env } from '$env/dynamic/private';

// Load environment variables from .env file
dotenv.config();

const connectionString = "postgres://neondb_owner:npg_GoYmh8Iknz0f@ep-delicate-shadow-a2mhoq1s-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require"
const sql = connectionString ? neon(connectionString) : null;

export const GET: RequestHandler = async () => {
  console.log('Running database migration...');
  console.log('Connection string available:', !!connectionString);
  console.log('SQL client available:', !!sql);

  if (!connectionString || !sql) {
    console.error('POSTGRES_URL environment variable is not set');
    return json({
      success: false,
      error: 'Database connection not available'
    }, { status: 500 });
  }

  try {
    // Check existing tables
    console.log('Checking existing tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
    
    console.log('Current tables:', tables);
    const tableNames = tables.map((t: any) => t.table_name);
    
    // Start a transaction for all schema changes
    await sql`BEGIN`;
    
    try {
      // Create compositions table if it doesn't exist
      if (!tableNames.includes('compositions')) {
        console.log('Creating compositions table...');
        await sql`
          CREATE TABLE compositions (
            id SERIAL PRIMARY KEY,
            transaction_id TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `;
        console.log('Compositions table created successfully');
      } else {
        console.log('Compositions table already exists');
        
        // Check if positions column exists and needs to be migrated
        const columns = await sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'compositions';
        `;
        
        const columnNames = columns.map((c: any) => c.column_name);
        console.log('Composition table columns:', columnNames);
        
        if (columnNames.includes('positions')) {
          console.log('Found old positions column, preparing for migration...');
        }
      }
      
      // Create positions table if it doesn't exist
      if (!tableNames.includes('positions')) {
        console.log('Creating positions table...');
        await sql`
          CREATE TABLE positions (
            id SERIAL PRIMARY KEY,
            composition_id INTEGER NOT NULL REFERENCES compositions(id) ON DELETE CASCADE,
            unsig_index INTEGER NOT NULL,
            row INTEGER NOT NULL,
            column INTEGER NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `;
        console.log('Positions table created successfully');
        
        // Create index for faster lookups
        await sql`
          CREATE INDEX idx_positions_composition_id ON positions(composition_id);
        `;
        console.log('Positions index created successfully');
      } else {
        console.log('Positions table already exists');
      }
      
      // Check if we need to migrate data from JSON column to separate table
      const oldCompositions = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'compositions' AND column_name = 'positions';
      `;
      
      if (oldCompositions.length > 0) {
        console.log('Migrating data from JSON positions to separate table...');
        
        // Get all compositions with positions as JSON
        const comps = await sql`
          SELECT id, transaction_id, positions 
          FROM compositions 
          WHERE positions IS NOT NULL;
        `;
        
        if (comps.length > 0) {
          console.log(`Found ${comps.length} compositions to migrate`);
          
          for (const comp of comps) {
            if (comp.positions && Array.isArray(comp.positions)) {
              for (const pos of comp.positions) {
                // Insert each position into the new table
                await sql`
                  INSERT INTO positions (composition_id, unsig_index, row, column)
                  VALUES (
                    ${comp.id}, 
                    ${pos.unsigIndex || pos.unsig_index || 0}, 
                    ${pos.row || 0}, 
                    ${pos.column || 0}
                  );
                `;
              }
              console.log(`Migrated positions for composition ${comp.id}`);
            }
          }
          
          console.log('Migration complete, removing old positions column...');
          await sql`ALTER TABLE compositions DROP COLUMN IF EXISTS positions;`;
        } else {
          console.log('No compositions to migrate, removing positions column...');
          await sql`ALTER TABLE compositions DROP COLUMN IF EXISTS positions;`;
        }
      }
      
      // Commit all schema changes
      await sql`COMMIT`;
      console.log('Migration completed successfully');
      
      // Return success
      return json({
        success: true,
        message: 'Database migration completed successfully',
        tables: await sql`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public';
        `
      });
    } catch (migrationError) {
      // Rollback on error
      await sql`ROLLBACK`;
      console.error('Migration error:', migrationError);
      
      return json({
        success: false,
        error: 'Migration failed',
        details: String(migrationError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Database connection error:', error);
    return json({
      success: false,
      error: 'Failed to connect to database',
      details: String(error)
    }, { status: 500 });
  }
}; 