# svelte-webflow-cms

A config-driven CMS table editor for managing Webflow collections with SvelteKit.

## Features

- **Config-driven**: Define your table structure with a simple configuration object
- **Change Tracking**: Tracks all modifications and only enables save when changes exist
- **Batched Operations**: Nothing is sent to Webflow until explicit "Save changes" click
- **Drag & Drop Sorting**: Reorder items with automatic sort field updates
- **Image Handling**: Client-side compression/cropping with pluggable storage backends
- **Hosting Agnostic**: Works with any hosting platform (Cloudflare, Vercel, Netlify, etc.)

## Installation

```bash
bun add svelte-webflow-cms
# or
npm install svelte-webflow-cms
```

## Requirements

- SvelteKit 2.x
- Svelte 5.x
- Tailwind CSS v4
- bits-ui ^2.0.0

## Tailwind CSS Configuration

This library uses Tailwind CSS classes for styling. You must configure Tailwind to scan this package's files so the necessary CSS is generated.

### Tailwind v4

Add a `@source` directive in your CSS file:

```css
@import "tailwindcss";
@source "svelte-webflow-cms";
```

## Quick Start

### 1. Create a config file

```typescript
// src/routes/members/config.ts
import type { TableConfig } from "svelte-webflow-cms";

export const config: TableConfig = {
  pageTitle: "Team Members",
  itemSingular: "Member",
  itemPlural: "Members",
  siteId: "your-site-id",
  collectionId: "your-collection-id",
  createDeleteEnabled: true,
  draftEnabled: true,
  fields: [
    {
      visible: true,
      editable: true,
      schema: {
        name: "Name",
        slug: "name",
        type: "PlainText",
        validations: { maxLength: 100 },
      },
    },
    {
      visible: true,
      editable: true,
      schema: {
        name: "Photo",
        slug: "photo",
        type: "Image",
        imageSettings: { width: 400, height: 400 },
      },
    },
  ],
};
```

### 2. Set up page server

```typescript
// src/routes/members/+page.server.ts
import { createCmsActions, loadCmsItems } from "svelte-webflow-cms/server";
import { createR2UploadProvider } from "svelte-webflow-cms/providers/r2";
import { config } from "./config";

export async function load({ platform }) {
  const token = platform?.env?.WEBFLOW_TOKEN;
  if (!token) return { items: [], error: "Token not found" };

  const { items, error } = await loadCmsItems(token, config);
  return { items, error };
}

export const actions = createCmsActions(config, {
  getToken: (_, platform) => platform?.env?.WEBFLOW_TOKEN ?? null,
  getUploadProvider: (_, platform) =>
    platform?.env?.TEMP_IMAGES
      ? createR2UploadProvider(
          platform.env.TEMP_IMAGES,
          "https://cdn.example.com"
        )
      : null,
  bucketPrefix: "members",
});
```

### 3. Create page component

```svelte
<!-- src/routes/members/+page.svelte -->
<script lang="ts">
  import { CmsTable } from 'svelte-webflow-cms';
  import { config } from './config';

  let { data } = $props();
</script>

<CmsTable {config} data={data.items} />
```

## Upload Providers

The library supports pluggable storage backends. Implement the `UploadProvider` interface for your storage:

```typescript
interface UploadProvider {
  upload(
    file: Blob,
    filename: string,
    contentType: string
  ): Promise<{ url: string; filename: string }>;
  delete(filename: string): Promise<void>;
}
```

### Built-in: Cloudflare R2

```typescript
import { createR2UploadProvider } from "svelte-webflow-cms/providers/r2";

getUploadProvider: (_, platform) =>
  createR2UploadProvider(platform.env.BUCKET, "https://cdn.example.com");
```

### Custom Provider Example (S3)

```typescript
export function createS3UploadProvider(
  client,
  bucket,
  baseUrl
): UploadProvider {
  return {
    async upload(file, filename, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: filename,
          Body: Buffer.from(await file.arrayBuffer()),
          ContentType: contentType,
        })
      );
      return { url: `${baseUrl}/${filename}`, filename };
    },
    async delete(filename) {
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: filename })
      );
    },
  };
}
```

## Token Configuration

The `getToken` function receives the request and platform at runtime:

```typescript
// Cloudflare Pages
getToken: (_, platform) => platform?.env?.WEBFLOW_TOKEN ?? null;

// Node.js
getToken: () => process.env.WEBFLOW_TOKEN ?? null;

// SvelteKit $env
import { env } from "$env/dynamic/private";
getToken: () => env.WEBFLOW_TOKEN ?? null;
```

## Supported Field Types

| Type             | Input Component     | Notes                         |
| ---------------- | ------------------- | ----------------------------- |
| `PlainText`      | TextInput           | Supports maxLength validation |
| `RichText`       | TextInput           | Supports maxLength validation |
| `Link`           | LinkInput           | URL input                     |
| `Email`          | EmailInput          | Email input                   |
| `Phone`          | PhoneInput          | Phone input                   |
| `Number`         | NumberInput         | Numeric input                 |
| `Switch`         | SwitchInput         | Boolean toggle                |
| `Option`         | OptionInput         | Dropdown select               |
| `Color`          | ColorInput          | Color picker                  |
| `Image`          | ImageInput          | Image upload with processing  |
| `Reference`      | ReferenceInput      | Single collection reference   |
| `MultiReference` | MultiReferenceInput | Multiple collection refs      |

## API Reference

### Components

- `CmsTable` - Main table component
- `CmsRow` - Row renderer
- `CmsCell` - Cell renderer
- `CreateItemModal` - Modal for creating new items

### Server Functions

- `createCmsActions(config, options)` - Create all CMS actions
- `loadCmsItems(token, config)` - Load items from Webflow
- `loadReferenceData(token, config)` - Load referenced collection data
- `createWebflowClient(token)` - Create Webflow API client

### Types

- `TableConfig` - Table configuration
- `Field` - Field configuration
- `UploadProvider` - Upload provider interface
- `UploadProviderFactory` - Factory for creating providers
- `TokenGetter` - Token retrieval function type

## License

MIT
