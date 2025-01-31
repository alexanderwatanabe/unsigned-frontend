import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url, fetch }) => {
    const page = Number(url.searchParams.get('page')) || 1;
    const limit = Number(url.searchParams.get('limit')) || 25;
    const idSearch = url.searchParams.get('idSearch') || '';
    const filters = url.searchParams.getAll('filters');

    const queryParams = new URLSearchParams();
    queryParams.set('page', page.toString());
    queryParams.set('limit', limit.toString());
    
    if (idSearch) {
        queryParams.set('idSearch', idSearch);
    }
    
    filters.forEach(filter => {
        queryParams.append('filters', filter);
    });

    const itemsResponse = await fetch(`/api/items?${queryParams}`);
    const itemsData = await itemsResponse.json();

    const metadataResponse = await fetch('/api/metadata');
    const metadata = await metadataResponse.json();

    return {
        items: itemsData.items,
        total: itemsData.total,
        metadata
    };
}; 