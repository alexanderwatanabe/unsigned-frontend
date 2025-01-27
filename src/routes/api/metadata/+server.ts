import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUnsigMetadata } from '$lib/unsigs';

export const GET: RequestHandler = async () => {
  const metadata = getUnsigMetadata();
  return json(metadata);
}; 