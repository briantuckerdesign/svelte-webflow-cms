/**
 * Webflow CMS API service using official webflow-api package
 */

import { WebflowClient } from 'webflow-api';

export type { CollectionItem } from 'webflow-api/api';

/**
 * Create a Webflow client instance
 * @param token - Webflow API access token
 */
export function createWebflowClient(token: string): WebflowClient {
	return new WebflowClient({ accessToken: token });
}
