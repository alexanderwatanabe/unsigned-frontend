import { neon } from '@neondatabase/serverless';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Get database connection string from environment
// This approach works both with SvelteKit's $env modules and with process.env for Vercel
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
}
const sql = neon(connectionString!); // Non-null assertion

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

// POST: Store a new composition
export const POST: RequestHandler = async ({ request }) => {
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
      const result = await sql`
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
  try {
    const transactionId = url.searchParams.get('transactionId');
    
    if (transactionId) {
      // Get a specific composition
      const composition = await sql`
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
      const compositions = await sql`
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
        compositions: compositions.map(c => ({
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