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
  
  // Start with the full metadata set or ID-filtered set
  filteredItems = idSearch 
    ? metadata.filter((item, index) => {
        const paddedIndex = index.toString().padStart(5, '0');
        return paddedIndex.includes(idSearch);
      })
    : ids
    ? ids.split(',').map(id => metadata[parseInt(id)]).filter(Boolean)
    : metadata;
  
  // Group filters by their row index
  const filterRows = new Map<number, Record<string, string>>();
  filters.forEach(filter => {
    const [fullProperty, value] = filter.split(':');
    const [property, rowIndex] = fullProperty.split('_');
    const row = parseInt(rowIndex);
    
    if (!filterRows.has(row)) {
      filterRows.set(row, {});
    }
    
    // remove the 's' from the end of the property name (e.g., 'colors' -> 'color')
    const baseProperty = property.slice(0, -1);
    filterRows.get(row)![baseProperty] = value;
  });

  // Filter items that match ALL filter rows
  if (filterRows.size > 0) {
    filteredItems = filteredItems.filter(item => {
      // Each filter row must match at least one layer in the item
      return Array.from(filterRows.values()).every(filterRow => {
        // Check each layer of the item
        const numLayers = item.properties.colors.length;
        return Array.from({ length: numLayers }, (_, layerIndex) => {
          // Check if this layer matches all properties in the filter row
          return Object.entries(filterRow).every(([property, value]) => {
            const propertyArray = item.properties[`${property}s` as keyof typeof item.properties];
            return propertyArray[layerIndex] === value;
          });
        }).some(matches => matches); // At least one layer must match all properties
      });
    });
  }

  // Calculate total before pagination
  const total = filteredItems.length;

  // Apply pagination
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '16');
  const start = (page - 1) * limit;
  
  // Only return the items for the requested page
  const items = filteredItems.slice(start, Math.min(start + limit, filteredItems.length));

  return json({
    items,
    total,
    page,
    limit,
    hasMore: start + limit < total
  });
}; 