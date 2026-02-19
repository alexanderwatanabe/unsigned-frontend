import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, params }) => {
  const response = await fetch(`/api/db/compositions?transactionId=${params.txid}`);
  const data = await response.json();

  if (!data.success) {
    throw error(404, 'composition not found');
  }

  return {
    composition: data.composition
  };
};
