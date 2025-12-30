import type { UploadProvider, UploadResult } from '../../types.js';

/**
 * R2Bucket interface - matches Cloudflare Workers R2 API
 * Users on Cloudflare can use platform.env.BUCKET_NAME directly
 */
interface R2Bucket {
	put(
		key: string,
		value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
		options?: { httpMetadata?: { contentType?: string } }
	): Promise<unknown>;
	delete(key: string): Promise<void>;
}

/**
 * Creates an upload provider for Cloudflare R2 storage
 *
 * @example
 * // In your +page.server.ts
 * import { createR2UploadProvider } from 'svelte-webflow-cms/providers/r2';
 * import { createCmsActions } from 'svelte-webflow-cms/server';
 *
 * export const actions = createCmsActions(config, {
 *   getToken: (_, platform) => platform?.env?.WEBFLOW_TOKEN,
 *   getUploadProvider: (_, platform) => platform?.env?.TEMP_IMAGES
 *     ? createR2UploadProvider(platform.env.TEMP_IMAGES, 'https://cdn.example.com')
 *     : null
 * });
 *
 * @param bucket - R2 bucket instance from platform.env
 * @param publicUrlBase - Base URL for public access (e.g., 'https://cdn.example.com')
 */
export function createR2UploadProvider(bucket: R2Bucket, publicUrlBase: string): UploadProvider {
	// Ensure no trailing slash
	const baseUrl = publicUrlBase.replace(/\/$/, '');

	return {
		async upload(file: Blob, filename: string, contentType: string): Promise<UploadResult> {
			await bucket.put(filename, file, {
				httpMetadata: { contentType }
			});

			return {
				url: `${baseUrl}/${filename}`,
				filename
			};
		},

		async delete(filename: string): Promise<void> {
			await bucket.delete(filename);
		}
	};
}
