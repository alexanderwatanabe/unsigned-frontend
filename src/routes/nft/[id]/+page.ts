import type { PageLoad } from '@sveltejs/kit';
import { unsigs } from '$lib/unsigs';

export const load = (({ params }) => {
    const unsig = unsigs[params.id];
    
    return {
        id: params.id,
        unsig
    };
}) satisfies PageLoad; 