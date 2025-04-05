import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  try {
    // Pre-fetch composition data from our API
    const response = await fetch('/api/db/compositions');
    const data = await response.json();
    
    if (data.success) {
      return {
        compositions: data.compositions,
        error: null
      };
    } else {
      return {
        compositions: [],
        error: data.message || 'Failed to load compositions'
      };
    }
  } catch (error) {
    console.error('Error loading compositions:', error);
    return {
      compositions: [],
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}; 