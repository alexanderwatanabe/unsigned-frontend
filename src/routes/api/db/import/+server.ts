import { neon } from '@neondatabase/serverless';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Get database connection string from environment with fallback for build time
const connectionString = process.env.DATABASE_URL || '';
// Only initialize neon if we have a connection string
const sql = connectionString ? neon(connectionString) : null;

// Parse transaction metadata to extract positions
function parseMetadata(metadataArray: any[]): { positions: any[] } {
  try {
    // Extract metadata string (second element in the array)
    const metadataStr = metadataArray[1];
    
    // Parse the metadata JSON string
    const parsedMetadata = JSON.parse(metadataStr);
    
    // Navigate to the positions list
    const positionsList = parsedMetadata.map.find((item: any) => 
      item.k.string === "arrangement"
    )?.v.map.find((item: any) => 
      item.k.string === "positions"
    )?.v.list;
    
    if (!positionsList) {
      throw new Error('Positions not found in metadata');
    }
    
    // Transform positions to our API format
    const positions = positionsList.map((posItem: any) => {
      const posMap = posItem.map;
      const id = posMap.find((item: any) => item.k.string === "id")?.v.int;
      const row = posMap.find((item: any) => item.k.string === "row")?.v.int;
      const col = posMap.find((item: any) => item.k.string === "col")?.v.int;
      
      return {
        unsigIndex: id,
        row,
        column: col
      };
    });
    
    return { positions };
  } catch (error) {
    console.error('Error parsing metadata:', error);
    throw new Error('Failed to parse metadata: ' + (error instanceof Error ? error.message : String(error)));
  }
}

// POST: Import a composition with transaction ID and metadata
export const POST: RequestHandler = async ({ request }) => {
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
    const data = await request.json();
    
    // Validate required fields
    if (!data.transactionId) {
      return json({ 
        success: false, 
        error: 'Missing transaction ID' 
      }, { status: 400 });
    }
    
    if (!data.metadata || !Array.isArray(data.metadata)) {
      return json({ 
        success: false, 
        error: 'Missing or invalid metadata' 
      }, { status: 400 });
    }
    
    // Parse metadata to extract positions
    const { positions } = parseMetadata(data.metadata);
    
    if (!positions || positions.length === 0) {
      return json({ 
        success: false, 
        error: 'No positions found in metadata' 
      }, { status: 400 });
    }
    
    console.log('Parsed positions:', positions);
    
    // Store the composition in the database
    try {
      const result = await sql!`
        INSERT INTO compositions (transaction_id, positions)
        VALUES (${data.transactionId}, ${JSON.stringify(positions)})
        RETURNING id
      `;
      
      return json({
        success: true,
        compositionId: result[0].id,
        message: 'Composition imported successfully'
      });
    } catch (error) {
      console.error('Database error:', error);
      return json({ 
        success: false, 
        error: 'Database error: ' + (error instanceof Error ? error.message : String(error))
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Import error:', error);
    return json({
      success: false,
      error: 'Import failed: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}; 