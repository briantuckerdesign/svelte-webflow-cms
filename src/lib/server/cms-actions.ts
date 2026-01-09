import { fail } from "@sveltejs/kit";
import type { TableConfig, TokenGetter } from "../types.js";
import { ALLOWED_FILE_TYPES, ALLOWED_FILE_EXTENSIONS } from "../types.js";
import { createWebflowClient } from "./webflow.js";
import { createWebflowUploadProvider } from "./webflow-upload-provider.js";

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
export function createSaveAllAction(
  config: TableConfig,
  getToken: TokenGetter
) {
  return async ({ request, platform }: { request: Request; platform: any }) => {
    const token = await getToken(request, platform);

    if (!token) return fail(500, { error: "WEBFLOW_TOKEN not configured" });

    const client = createWebflowClient(token);

    const formData = await request.formData();
    const payloadJson = formData.get("payload") as string;

    if (!payloadJson) return fail(400, { error: "No payload provided" });

    try {
      const { updates, creates, deletes }: SaveAllPayload =
        JSON.parse(payloadJson);

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
        if (
          config.sortField &&
          item.fieldData?.[config.sortField.schema.slug] !== undefined
        ) {
          fieldData[config.sortField.schema.slug] =
            item.fieldData[config.sortField.schema.slug];
        }

        const updateData = {
          fieldData,
          isDraft: item.isDraft,
        };

        if (wasLive) {
          const response = await client.collections.items.updateItemLive(
            config.collectionId,
            item.id,
            updateData
          );
        } else {
          const response = await client.collections.items.updateItem(
            config.collectionId,
            item.id,
            updateData
          );
        }

        // Publish if transitioning from draft to live
        if (!wasLive && !item.isDraft) {
          const response = await client.collections.items.publishItem(
            config.collectionId,
            {
              itemIds: [item.id],
            }
          );
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
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
        }

        const itemData = {
          fieldData,
          isDraft: item.isDraft,
        };

        try {
          const newItem = item.isDraft
            ? await client.collections.items.createItem(
                config.collectionId,
                itemData as any
              )
            : await client.collections.items.createItemLive(
                config.collectionId,
                itemData as any
              );

          if (!item.isDraft) {
            const response = await client.collections.items.publishItem(
              config.collectionId,
              {
                itemIds: [newItem.id as string],
              }
            );
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "";
          // Retry with random suffix if slug collision
          if (
            errorMessage.includes("validation_error") ||
            errorMessage.includes("slug")
          ) {
            const randomSuffix = Math.random().toString(36).substring(2, 6);
            const retrySlug = `${fieldData.slug}-${randomSuffix}`;
            itemData.fieldData.slug = retrySlug;

            const newItem = item.isDraft
              ? await client.collections.items.createItem(
                  config.collectionId,
                  itemData as any
                )
              : await client.collections.items.createItemLive(
                  config.collectionId,
                  itemData as any
                );

            if (!item.isDraft) {
              const response = await client.collections.items.publishItem(
                config.collectionId,
                {
                  itemIds: [newItem.id as string],
                }
              );
            }
          } else {
            throw err;
          }
        }
      }

      // Handle deletes
      for (const { id, wasLive } of deletes) {
        if (wasLive) {
          const response = await client.collections.items.deleteItemLive(
            config.collectionId,
            id
          );
        }
        const response = await client.collections.items.deleteItem(
          config.collectionId,
          id
        );
      }

      return { success: true };
    } catch (err) {
      return fail(500, {
        error: `Failed to save: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    }
  };
}

/**
 * Creates uploadPhoto action for image uploads directly to Webflow
 * @param config - Table configuration (provides siteId and assetFolderId)
 * @param getToken - Function to retrieve the Webflow API token
 */
export function createUploadPhotoAction(
  config: TableConfig,
  getToken: TokenGetter
) {
  return async ({ request, platform }: { request: Request; platform: any }) => {
    const token = await getToken(request, platform);
    if (!token) return fail(500, { error: "WEBFLOW_TOKEN not configured" });

    const provider = createWebflowUploadProvider({
      token,
      siteId: config.siteId,
      folderId: config.assetFolderId,
    });

    const formData = await request.formData();
    const imageBlob = formData.get("photo") as Blob;
    const itemName = formData.get("memberName") as string;

    if (!imageBlob) return fail(400, { error: "No file provided" });

    try {
      // Generate unique filename
      const filename = `${config.itemSingular.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;

      // Upload directly to Webflow
      const result = await provider.upload(imageBlob, filename, "image/webp");

      return {
        success: true,
        image: {
          url: result.url,
          alt: itemName || "Image",
          filename: result.filename,
        },
      };
    } catch (err) {
      return fail(500, {
        error: `Failed to upload image: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    }
  };
}

/**
 * Creates deletePhoto action
 * Note: Webflow assets cannot be deleted via this provider - they must be managed through Webflow
 */
export function createDeletePhotoAction() {
  return async ({ request }: { request: Request }) => {
    const formData = await request.formData();
    const filename = formData.get("filename") as string;

    if (!filename) return fail(400, { error: "No filename provided" });

    // Webflow assets are permanent and managed through Webflow dashboard
    // This action is kept for API compatibility but is a no-op
    return { success: true };
  };
}

/**
 * Creates uploadFile action for file uploads directly to Webflow
 * Validates file type and size before uploading
 * @param config - Table configuration (provides siteId and assetFolderId)
 * @param getToken - Function to retrieve the Webflow API token
 * @param maxSizeBytes - Maximum file size in bytes (default: 10MB)
 */
export function createUploadFileAction(
  config: TableConfig,
  getToken: TokenGetter,
  maxSizeBytes: number = 10 * 1024 * 1024
) {
  return async ({ request, platform }: { request: Request; platform: any }) => {
    const token = await getToken(request, platform);
    if (!token) return fail(500, { error: "WEBFLOW_TOKEN not configured" });

    const provider = createWebflowUploadProvider({
      token,
      siteId: config.siteId,
      folderId: config.assetFolderId,
    });

    const formData = await request.formData();
    const fileBlob = formData.get("file") as Blob;
    const itemName = formData.get("itemName") as string;
    const originalFilename = formData.get("originalFilename") as string;

    if (!fileBlob) return fail(400, { error: "No file provided" });

    // Validate file size
    if (fileBlob.size > maxSizeBytes) {
      const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(1);
      return fail(400, {
        error: `File is too large. Maximum size: ${maxSizeMB}MB`,
      });
    }

    // Validate file type
    const fileType = fileBlob.type;
    const fileExtension = originalFilename
      ? `.${originalFilename.split(".").pop()?.toLowerCase()}`
      : "";

    const isValidMime = ALLOWED_FILE_TYPES.includes(
      fileType as (typeof ALLOWED_FILE_TYPES)[number]
    );
    const isValidExtension = ALLOWED_FILE_EXTENSIONS.includes(
      fileExtension as (typeof ALLOWED_FILE_EXTENSIONS)[number]
    );

    if (!isValidMime && !isValidExtension) {
      return fail(400, {
        error: `File type not allowed. Allowed types: ${ALLOWED_FILE_EXTENSIONS.join(", ")}`,
      });
    }

    try {
      // Preserve original extension
      const extension =
        originalFilename?.split(".").pop()?.toLowerCase() || "bin";
      const filename = `${config.itemSingular.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

      // Upload directly to Webflow
      const result = await provider.upload(
        fileBlob,
        filename,
        fileType || "application/octet-stream"
      );

      return {
        success: true,
        file: {
          url: result.url,
          alt: originalFilename || itemName || "File",
          filename: result.filename,
        },
      };
    } catch (err) {
      return fail(500, {
        error: `Failed to upload file: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    }
  };
}

interface CmsActionsOptions {
  /** Function to retrieve the Webflow API token */
  getToken: TokenGetter;
  /** Maximum file size in bytes for file uploads (default: 10MB) */
  maxFileSizeBytes?: number;
}

/**
 * Creates all CMS actions for a route
 * Returns an object that can be spread into the actions export
 *
 * @example
 * export const actions = createCmsActions(config, {
 *   getToken: (_, platform) => platform?.env?.WEBFLOW_TOKEN
 * });
 *
 * @example
 * // With environment variable token (Node.js)
 * export const actions = createCmsActions(config, {
 *   getToken: () => process.env.WEBFLOW_TOKEN ?? null
 * });
 */
export function createCmsActions(
  config: TableConfig,
  options: CmsActionsOptions
) {
  const { getToken, maxFileSizeBytes } = options;

  return {
    saveAll: createSaveAllAction(config, getToken),
    uploadPhoto: createUploadPhotoAction(config, getToken),
    uploadFile: createUploadFileAction(config, getToken, maxFileSizeBytes),
    deletePhoto: createDeletePhotoAction(),
  };
}
