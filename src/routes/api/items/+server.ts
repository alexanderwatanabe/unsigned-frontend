import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { UnsigMetadata } from '$lib/types';
import { getUnsigMetadata } from '$lib/unsigs';

export const GET: RequestHandler = async ({ url }) => {
  const metadata = getUnsigMetadata();
  
  // Check if specific IDs are requested
  const ids = url.searchParams.get('ids');
  const idSearch = url.searchParams.get('idSearch');
  
  let filteredItems = metadata;
  
  // Handle ID search if present
  if (idSearch) {
    filteredItems = metadata.filter((item, index) => {
      const paddedIndex = index.toString().padStart(5, '0');
      return paddedIndex.includes(idSearch);
    });
  }
  // Handle specific IDs if requested
  else if (ids) {
    const requestedIds = ids.split(',').map(id => parseInt(id));
    filteredItems = requestedIds.map(id => metadata[id]).filter(Boolean);
    return json({
      items: filteredItems,
      total: filteredItems.length
    });
  }
  
  // Apply property filters
  const filters = url.searchParams.getAll('filters');
  const filterGroups = filters.reduce((acc, filter) => {
    const [property, value] = filter.split(':');
    if (!acc[property]) {
      acc[property] = new Set();
    }
    acc[property].add(value);
    return acc;
  }, {} as Record<string, Set<string>>);
  
  Object.entries(filterGroups).forEach(([property, values]) => {
    filteredItems = filteredItems.filter(item => {
      return Array.from(values).some(value => 
        item.properties[property as keyof typeof item.properties]?.includes(value)
      );
    });
  });

  // Apply pagination after all filters
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '16');
  const start = (page - 1) * limit;
  const items = filteredItems.slice(start, start + limit);

  return json({
    items,
    total: filteredItems.length
  });
}; 