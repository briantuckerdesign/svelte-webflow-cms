import { fail } from '@sveltejs/kit';
import type { TableConfig, UploadProvider, UploadProviderFactory, TokenGetter } from '../types.js';
import { createWebflowClient } from './webflow.js';

interface UpdatePayload {
	item: any;
	wasLive: boolean;
}

interface CreatePayload {
	fieldData: Record<string, any>;
	isDraft: boolean;
	isArchived: boolean;
}

interface DeletePayload {
	id: string;
	wasLive: boolean;
}

interface SaveAllPayload {
	updates: UpdatePayload[];
	creates: CreatePayload[];
	deletes: DeletePayload[];
}

/**
 * Creates a generic saveAll action for CMS collections
 * Handles updates, creates, and deletes with proper wasLive/isDraft handling
 *
 * @param config - Table configuration
 * @param getToken - Function to retrieve the Webflow API token
 */
export function createSaveAllAction(config: TableConfig, getToken: TokenGetter) {
	return async ({ request, platform }: { request: Request; platform: any }) => {
		const token = await getToken(request, platform);

		if (!token) return fail(500, { error: 'WEBFLOW_TOKEN not configured' });

		const client = createWebflowClient(token);

		const formData = await request.formData();
		const payloadJson = formData.get('payload') as string;

		if (!payloadJson) return fail(400, { error: 'No payload provided' });

		try {
			const { updates, creates, deletes }: SaveAllPayload = JSON.parse(payloadJson);

			// Handle updates
			for (const { item, wasLive } of updates) {
				// Build fieldData from item, excluding system fields
				const fieldData: Record<string, any> = {};
				for (const field of config.fields) {
					const slug = field.schema.slug;
					if (item.fieldData && item.fieldData[slug] !== undefined) {
						fieldData[slug] = item.fieldData[slug];
					}
				}

				// Include sort field if configured
				if (config.sortField && item.fieldData?.[config.sortField.schema.slug] !== undefined) {
					fieldData[config.sortField.schema.slug] = item.fieldData[config.sortField.schema.slug];
				}

				const updateData = {
					fieldData,
					isDraft: item.isDraft
				};

				if (wasLive) {
					const response = await client.collections.items.updateItemLive(
						config.collectionId,
						item.id,
						updateData
					);
					console.log('updateItemLive', response);
				} else {
					const response = await client.collections.items.updateItem(
						config.collectionId,
						item.id,
						updateData
					);
					console.log('updateItem', response);
				}

				// Publish if transitioning from draft to live
				if (!wasLive && !item.isDraft) {
					const response = await client.collections.items.publishItem(config.collectionId, {
						itemIds: [item.id]
					});
					console.log('publishItem', response);
				}
			}

			// Handle creates
			for (const item of creates) {
				// Build fieldData, applying defaults for hidden fields
				const fieldData: Record<string, any> = { ...item.fieldData };

				// Apply default values for hidden fields
				for (const field of config.fields) {
					if (!field.visible && field.schema.defaultValue !== undefined) {
						fieldData[field.schema.slug] = field.schema.defaultValue;
					}
				}

				// Ensure slug is generated if not provided
				if (!fieldData.slug && fieldData.name) {
					fieldData.slug = fieldData.name
						.toLowerCase()
						.replace(/[^a-z0-9]+/g, '-')
						.replace(/(^-|-$)/g, '');
				}

				const itemData = {
					fieldData,
					isDraft: item.isDraft
				};

				try {
					const newItem = item.isDraft
						? await client.collections.items.createItem(config.collectionId, itemData as any)
						: await client.collections.items.createItemLive(config.collectionId, itemData as any);

					console.log('createItem', newItem);

					if (!item.isDraft) {
						const response = await client.collections.items.publishItem(config.collectionId, {
							itemIds: [newItem.id as string]
						});

						console.log('publishItem', response);
					}
				} catch (err) {
					const errorMessage = err instanceof Error ? err.message : '';
					// Retry with random suffix if slug collision
					if (errorMessage.includes('validation_error') || errorMessage.includes('slug')) {
						const randomSuffix = Math.random().toString(36).substring(2, 6);
						const retrySlug = `${fieldData.slug}-${randomSuffix}`;
						itemData.fieldData.slug = retrySlug;

						const newItem = item.isDraft
							? await client.collections.items.createItem(config.collectionId, itemData as any)
							: await client.collections.items.createItemLive(config.collectionId, itemData as any);

						console.log('createItem', newItem);

						if (!item.isDraft) {
							const response = await client.collections.items.publishItem(config.collectionId, {
								itemIds: [newItem.id as string]
							});

							console.log('publishItem', response);
						}
					} else {
						throw err;
					}
				}
			}

			// Handle deletes
			for (const { id, wasLive } of deletes) {
				if (wasLive) {
					const response = await client.collections.items.deleteItemLive(config.collectionId, id);
					console.log('deleteItemLive', response);
				}
				const response = await client.collections.items.deleteItem(config.collectionId, id);
				console.log('deleteItem', response);
			}

			return { success: true };
		} catch (err) {
			return fail(500, {
				error: `Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`
			});
		}
	};
}

/**
 * Creates uploadPhoto action for image uploads
 * @param getProvider - Factory function to create upload provider at request time
 * @param bucketPrefix - Prefix for uploaded filenames
 */
export function createUploadPhotoAction(getProvider: UploadProviderFactory, bucketPrefix: string = 'cms-item') {
	return async ({ request, platform }: { request: Request; platform: any }) => {
		const provider = getProvider(request, platform);
		if (!provider) return fail(500, { error: 'Upload provider not configured' });

		const formData = await request.formData();
		const imageBlob = formData.get('photo') as Blob;
		const itemName = formData.get('memberName') as string;

		if (!imageBlob) return fail(400, { error: 'No file provided' });

		try {
			// Generate unique filename
			const filename = `${bucketPrefix}-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;

			// Upload using the provided storage backend
			const result = await provider.upload(imageBlob, filename, 'image/webp');

			return {
				success: true,
				image: {
					url: result.url,
					alt: itemName || 'Image',
					filename: result.filename
				}
			};
		} catch (err) {
			return fail(500, {
				error: `Failed to upload image: ${err instanceof Error ? err.message : 'Unknown error'}`
			});
		}
	};
}

/**
 * Creates deletePhoto action for cleaning up temp images
 * @param getProvider - Factory function to create upload provider at request time
 */
export function createDeletePhotoAction(getProvider: UploadProviderFactory) {
	return async ({ request, platform }: { request: Request; platform: any }) => {
		const provider = getProvider(request, platform);
		if (!provider) return fail(500, { error: 'Upload provider not configured' });

		const formData = await request.formData();
		const filename = formData.get('filename') as string;

		if (!filename) return fail(400, { error: 'No filename provided' });

		try {
			await provider.delete(filename);
			return { success: true };
		} catch (err) {
			return fail(500, {
				error: `Failed to delete image: ${err instanceof Error ? err.message : 'Unknown error'}`
			});
		}
	};
}

interface CmsActionsOptions {
	/** Function to retrieve the Webflow API token */
	getToken: TokenGetter;
	/** Factory to create upload provider at request time. If not provided, upload actions return errors. */
	getUploadProvider?: UploadProviderFactory;
	/** Prefix for uploaded filenames */
	bucketPrefix?: string;
}

/**
 * Creates all CMS actions for a route
 * Returns an object that can be spread into the actions export
 *
 * @example
 * // With Cloudflare R2 upload provider
 * import { createR2UploadProvider } from 'svelte-webflow-cms/providers/r2';
 *
 * export const actions = createCmsActions(config, {
 *   getToken: (_, platform) => platform?.env?.WEBFLOW_TOKEN,
 *   getUploadProvider: (_, platform) => platform?.env?.TEMP_IMAGES
 *     ? createR2UploadProvider(platform.env.TEMP_IMAGES, 'https://cdn.example.com')
 *     : null,
 *   bucketPrefix: 'my-prefix'
 * });
 *
 * @example
 * // With environment variable token (Node.js)
 * export const actions = createCmsActions(config, {
 *   getToken: () => process.env.WEBFLOW_TOKEN ?? null
 * });
 */
export function createCmsActions(config: TableConfig, options: CmsActionsOptions) {
	const { getToken, getUploadProvider, bucketPrefix = 'cms-item' } = options;

	// Default factory returns null (no upload support)
	const providerFactory: UploadProviderFactory = getUploadProvider ?? (() => null);

	return {
		saveAll: createSaveAllAction(config, getToken),
		uploadPhoto: createUploadPhotoAction(providerFactory, bucketPrefix),
		deletePhoto: createDeletePhotoAction(providerFactory)
	};
}
