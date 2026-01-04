import type { UploadProvider, UploadResult } from "$lib/types.js";
import { createWebflowClient } from "./webflow.js";

/**
 * Options for creating a Webflow upload provider
 */
export interface WebflowUploadProviderOptions {
  /** Webflow API token */
  token: string;
  /** Webflow site ID */
  siteId: string;
  /** Optional folder ID to upload assets to */
  folderId?: string;
}

/**
 * Computes SHA-256 hash of a file using Web Crypto API (works in Cloudflare Workers)
 * @param file - The file blob to hash
 * @returns Hex string of the SHA-256 hash
 */
async function computeFileHash(file: Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Creates an upload provider that uploads directly to Webflow's asset storage.
 * This eliminates the need for intermediate storage (R2, S3, etc.)
 *
 * Uses the Webflow Assets API to:
 * 1. Initialize an upload with the file hash
 * 2. Get pre-signed S3 upload credentials
 * 3. Upload directly to Webflow's S3 bucket
 *
 * @example
 * // In your +page.server.ts
 * import { createWebflowUploadProvider } from 'svelte-webflow-cms/server';
 * import { createCmsActions } from 'svelte-webflow-cms/server';
 *
 * export const actions = createCmsActions(config, {
 *   getToken: (_, platform) => platform?.env?.WEBFLOW_TOKEN,
 *   getUploadProvider: (_, platform) => createWebflowUploadProvider({
 *     token: platform?.env?.WEBFLOW_TOKEN,
 *     siteId: 'your-site-id',
 *     folderId: 'optional-folder-id'
 *   })
 * });
 *
 * @param options - Configuration options
 */
export function createWebflowUploadProvider(
  options: WebflowUploadProviderOptions
): UploadProvider {
  const { token, siteId, folderId } = options;
  const client = createWebflowClient(token);

  return {
    async upload(
      file: Blob,
      filename: string,
      contentType: string
    ): Promise<UploadResult> {
      // Step 1: Compute file hash
      const fileHash = await computeFileHash(file);

      // Step 2: Initialize upload with Webflow to get S3 credentials
      const uploadInit = await client.assets.create(siteId, {
        fileName: filename,
        fileHash: fileHash,
        ...(folderId && { parentFolder: folderId }),
      });

      const { uploadUrl, uploadDetails } = uploadInit;

      if (!uploadUrl || !uploadDetails) {
        throw new Error("Webflow did not return upload credentials");
      }

      // Step 3: Build FormData with S3 upload fields
      const form = new FormData();

      // Append all required S3 fields from Webflow's response
      // Using type assertion since Webflow SDK types may not include all fields
      const details = uploadDetails as Record<string, string>;

      form.append("acl", details.acl);
      form.append("bucket", details.bucket);
      form.append("X-Amz-Algorithm", details.xAmzAlgorithm);
      form.append("X-Amz-Credential", details.xAmzCredential);
      form.append("X-Amz-Date", details.xAmzDate);
      form.append("key", details.key);
      form.append("Policy", details.policy);
      form.append("X-Amz-Signature", details.xAmzSignature);
      form.append("success_action_status", details.successActionStatus);
      form.append("Content-Type", details.contentType || contentType);
      form.append("Cache-Control", details.cacheControl || "max-age=31536000");

      // Append the file last (required by S3)
      form.append("file", file, filename);

      // Step 4: Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        body: form,
      });

      if (uploadResponse.status !== 201) {
        const errorText = await uploadResponse.text();
        throw new Error(
          `Failed to upload to Webflow S3: ${uploadResponse.status} - ${errorText}`
        );
      }

      // Construct the asset URL from the S3 key
      const assetUrl = `https://assets.website-files.com/${details.key}`;

      return {
        url: assetUrl,
        filename: filename,
      };
    },

    async delete(_filename: string): Promise<void> {
      // Webflow assets are managed through the Webflow dashboard
      // Direct deletion via this provider is not supported
      // Assets uploaded to Webflow are permanent until deleted via Webflow API/dashboard
    },
  };
}

/**
 * Factory function type for creating Webflow upload provider at request time
 */
export type WebflowUploadProviderFactory = (
  request: Request,
  platform?: any
) => UploadProvider | null;

/**
 * Creates a factory function for the Webflow upload provider.
 * Useful when you need to dynamically get config from platform.env
 *
 * @example
 * import { createWebflowUploadProviderFactory } from 'svelte-webflow-cms/server';
 *
 * const SITE_ID = 'your-site-id';
 *
 * export const actions = createCmsActions(config, {
 *   getToken: (_, platform) => platform?.env?.WEBFLOW_TOKEN,
 *   getUploadProvider: createWebflowUploadProviderFactory({
 *     getToken: (_, platform) => platform?.env?.WEBFLOW_TOKEN,
 *     siteId: SITE_ID,
 *     folderId: 'optional-folder-id'
 *   })
 * });
 */
export function createWebflowUploadProviderFactory(options: {
  getToken: (request: Request, platform?: any) => string | null;
  siteId: string;
  folderId?: string;
}): WebflowUploadProviderFactory {
  return (request: Request, platform?: any) => {
    const token = options.getToken(request, platform);
    if (!token) return null;

    return createWebflowUploadProvider({
      token,
      siteId: options.siteId,
      folderId: options.folderId,
    });
  };
}
