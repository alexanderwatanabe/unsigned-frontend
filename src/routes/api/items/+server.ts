import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { UnsigMetadata } from '$lib/types';
import { getUnsigMetadata } from '$lib/unsigs';

export const GET: RequestHandler = async ({ url }) => {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '16');
  const filters = url.searchParams.getAll('filters');

  const metadata = getUnsigMetadata();
  
  // Group filters by property
  const filterGroups = filters.reduce((acc, filter) => {
    const [property, value] = filter.split(':');
    if (!acc[property]) {
      acc[property] = new Set();
    }
    acc[property].add(value);
    return acc;
  }, {} as Record<string, Set<string>>);
  
  // Apply filters
  let filteredItems = metadata;
  Object.entries(filterGroups).forEach(([property, values]) => {
    filteredItems = filteredItems.filter(item => {
      return Array.from(values).some(value => 
        item.properties[property].includes(value)
      );
    });
  });

  const start = (page - 1) * limit;
  const items = filteredItems.slice(start, start + limit);

  return json({
    items,
    total: filteredItems.length
  });
}; 