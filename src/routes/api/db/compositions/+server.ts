import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Get database connection string from environment with fallback for build time
const connectionString = "postgres://neondb_owner:npg_GoYmh8Iknz0f@ep-delicate-shadow-a2mhoq1s-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";
// Only initialize neon if we have a connection string
const sql = neon(connectionString);

// Type definitions for our composition data
type GridPosition = {
  unsigIndex: number;
  row: number;
  column: number;
};

type CompositionData = {
  transactionId: string;
  positions: GridPosition[];
};

type Composition = {
  id: number;
  transaction_id: string;
  positions: GridPosition[];
  created_at: string;
};

// POST: Store a new composition
export const POST: RequestHandler = async ({ request }) => {
  // Return early if no connection string is available (during build)
  if (!connectionString || !sql) {
    console.warn('POSTGRES_URL environment variable is not set');
    return json({
      success: false,
      error: 'Database connection not configured',
      message: 'POSTGRES_URL environment variable is not set'
    }, { status: 500 });
  }

  try {
    const data: CompositionData = await request.json();
    
    // Validate required fields
    if (!data.transactionId) {
      return json({ 
        success: false, 
        error: 'Missing transaction ID' 
      }, { status: 400 });
    }
    
    if (!data.positions || !Array.isArray(data.positions) || data.positions.length === 0) {
      return json({ 
        success: false, 
        error: 'Missing or invalid positions data' 
      }, { status: 400 });
    }
    
    // Store the composition with positions as JSON
    try {
      // We've already checked that sql is not null above
      const result = await sql!`
        INSERT INTO compositions (transaction_id, positions)
        VALUES (${data.transactionId}, ${JSON.stringify(data.positions)})
        RETURNING id
      `;
      
      const compositionId = result[0].id;
      
      return json({
        success: true,
        compositionId,
        message: 'Composition saved successfully'
      });
    } catch (error) {
      throw error; // Re-throw to be caught by outer try/catch
    }
  } catch (error) {
    console.error('Error saving composition:', error);
    return json({
      success: false,
      error: 'Failed to save composition',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
};

// GET: Retrieve all compositions or a specific one by ID
export const GET: RequestHandler = async ({ url }) => {
  // Return early if no connection string is available (during build)
  if (!connectionString || !sql) {
    console.warn('POSTGRES_URL environment variable is not set');
    return json({
      success: false,
      error: 'Database connection not configured',
      message: 'POSTGRES_URL environment variable is not set'
    }, { status: 500 });
  }

  try {
    const transactionId = url.searchParams.get('transactionId');
    
    if (transactionId) {
      // Get a specific composition
      // We've already checked that sql is not null above
      const composition = await sql!`
        SELECT 
          id, 
          transaction_id, 
          positions,
          created_at
        FROM 
          compositions
        WHERE 
          transaction_id = ${transactionId}
      `;
      
      if (composition.length === 0) {
        return json({
          success: false,
          error: 'Composition not found'
        }, { status: 404 });
      }
      
      return json({
        success: true,
        composition: {
          id: composition[0].id,
          transactionId: composition[0].transaction_id,
          createdAt: composition[0].created_at,
          positions: composition[0].positions
        }
      });
    } else {
      // Get all compositions
      // We've already checked that sql is not null above
      const compositions = await sql!`
        SELECT 
          id, 
          transaction_id, 
          positions,
          created_at
        FROM 
          compositions
        ORDER BY 
          created_at DESC
      `;
      
      return json({
        success: true,
        compositions: compositions.map((c: any) => ({
          id: c.id,
          transactionId: c.transaction_id,
          positions: c.positions,
          createdAt: c.created_at
        }))
      });
    }
  } catch (error) {
    console.error('Error retrieving compositions:', error);
    return json({
      success: false,
      error: 'Failed to retrieve compositions',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}; 