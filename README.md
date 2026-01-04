# svelte-webflow-cms

A config-driven CMS table editor for managing Webflow collections with SvelteKit.

## Features

- **Config-driven**: Define your table structure with a simple configuration object
- **Change Tracking**: Tracks all modifications and only enables save when changes exist
- **Batched Operations**: Nothing is sent to Webflow until explicit "Save changes" click
- **Drag & Drop Sorting**: Reorder items with automatic sort field updates
- **Direct Webflow Upload**: Images and files upload directly to Webflow assets (no intermediate storage needed)
- **Hosting Agnostic**: Works with any hosting platform (Cloudflare, Vercel, Netlify, etc.)
- **Field Validation**: Required fields, length constraints, and numeric ranges with error feedback

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
@source "../node_modules/svelte-webflow-cms";
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
  assetFolderId: "optional-folder-id", // Optional: organize uploads in a Webflow folder
  createDeleteEnabled: true,
  draftEnabled: true,
  fields: [
    {
      visible: true,
      editable: true,
      required: true,
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
    {
      visible: true,
      editable: true,
      schema: {
        name: "Resume",
        slug: "resume",
        type: "File",
        fileSettings: { maxSizeBytes: 10 * 1024 * 1024 }, // 10MB max
      },
    },
  ],
};
```

### 2. Set up page server

```typescript
// src/routes/members/+page.server.ts
import { createCmsActions, loadCmsItems } from "svelte-webflow-cms/server";
import { config } from "./config";

export async function load({ platform }) {
  const token = platform?.env?.WEBFLOW_TOKEN;
  if (!token) return { items: [], error: "Token not found" };

  const { items, error } = await loadCmsItems(token, config);
  return { items, error };
}

export const actions = createCmsActions(config, {
  getToken: (_, platform) => platform?.env?.WEBFLOW_TOKEN ?? null,
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

<CmsTable.Root {config} data={data.items}>
  <CmsTable.Toolbar />
  <CmsTable.SaveBar />
  <CmsTable.Table>
    <CmsTable.Header />
    <CmsTable.Body />
  </CmsTable.Table>
</CmsTable.Root>
```

## Composable API

The CmsTable components follow a composable pattern (similar to shadcn-svelte), allowing you to customize and extend the table easily.

### Basic Usage

```svelte
<script>
  import { CmsTable } from 'svelte-webflow-cms';
</script>

<CmsTable.Root {config} data={data.items} referenceData={data.referenceData}>
  <CmsTable.Toolbar />
  <CmsTable.SaveBar />
  <CmsTable.Table>
    <CmsTable.Header />
    <CmsTable.Body />
  </CmsTable.Table>
</CmsTable.Root>
```

### Available Components

| Component          | Description                                    |
| ------------------ | ---------------------------------------------- |
| `CmsTable.Root`    | Root wrapper - provides context and state      |
| `CmsTable.Toolbar` | Title and add button                           |
| `CmsTable.SaveBar` | Save/cancel controls with validation display   |
| `CmsTable.Table`   | Table container                                |
| `CmsTable.Header`  | Table header row with field names              |
| `CmsTable.Body`    | Table body with drag-and-drop support          |
| `CmsTable.Row`     | Individual row (used in custom row templates)  |
| `CmsTable.Actions` | Actions column (live toggle and delete button) |
| `CmsTable.Cell`    | Field cell with input (used in custom rows)    |

### Customization Examples

#### Custom Toolbar with Badge

```svelte
<CmsTable.Root {config} data={data.items}>
  <CmsTable.Toolbar>
    {#snippet afterTitle()}
      <Badge variant="secondary">{data.items.length} items</Badge>
    {/snippet}
  </CmsTable.Toolbar>
  <CmsTable.SaveBar />
  <CmsTable.Table>
    <CmsTable.Header />
    <CmsTable.Body />
  </CmsTable.Table>
</CmsTable.Root>
```

#### Custom Actions Placement

```svelte
<CmsTable.Root {config} data={data.items}>
  <div class="flex items-center justify-between">
    <CmsTable.Toolbar showAddButton={false} />
    <div class="flex gap-2">
      <Button onclick={handleExport}>Export</Button>
      <CmsTable.SaveBar />
    </div>
  </div>
  <CmsTable.Table>
    <CmsTable.Header />
    <CmsTable.Body />
  </CmsTable.Table>
</CmsTable.Root>
```

#### Custom Column in Header

```svelte
<CmsTable.Table>
  <CmsTable.Header>
    {#snippet afterColumns()}
      <Table.Head>Custom Column</Table.Head>
    {/snippet}
  </CmsTable.Header>
  <CmsTable.Body />
</CmsTable.Table>
```

#### Custom Row Template

```svelte
<CmsTable.Body>
  {#snippet row({ item, index, isNew })}
    <CmsTable.Row {item} {index} {isNew}>
      {#snippet afterColumns()}
        <Table.Cell>
          <Badge>{item.status}</Badge>
        </Table.Cell>
      {/snippet}
    </CmsTable.Row>
  {/snippet}
</CmsTable.Body>
```

#### Styling with Classes

All components accept a `class` prop for custom styling:

```svelte
<CmsTable.Root {config} data={data.items} class="max-w-7xl mx-auto">
  <CmsTable.Toolbar class="bg-gray-50 p-4 rounded-t-lg" />
  <CmsTable.SaveBar class="justify-start px-4" />
  <CmsTable.Table class="border-2 shadow-lg">
    <CmsTable.Header class="bg-blue-50" />
    <CmsTable.Body class="text-sm" />
  </CmsTable.Table>
</CmsTable.Root>
```

## Image & File Uploads

Images and files are uploaded directly to Webflow's asset storage using their Assets API. No intermediate storage (R2, S3, etc.) is required.

### How it works

1. **Images**: Client-side compression and cropping based on `imageSettings`, then uploaded to Webflow
2. **Files**: Validated for type and size, then uploaded to Webflow on save
3. The returned Webflow asset URL is used in the CMS item

### Image Configuration

```typescript
{
  schema: {
    name: "Photo",
    slug: "photo",
    type: "Image",
    imageSettings: {
      width: 400,   // Target width in pixels
      height: 400,  // Target height in pixels
    },
  },
}
```

### File Configuration

```typescript
{
  schema: {
    name: "Document",
    slug: "document",
    type: "File",
    fileSettings: {
      maxSizeBytes: 10 * 1024 * 1024,  // 10MB max file size
    },
  },
}
```

### Allowed File Types

The following file types are supported for file uploads:

| Category      | Extensions                         |
| ------------- | ---------------------------------- |
| Images        | PNG, JPEG/JPG, GIF, BMP, SVG, WebP |
| Documents     | PDF, DOC/DOCX, TXT                 |
| Spreadsheets  | XLS/XLSX, CSV, ODS                 |
| Presentations | PPT/PPTX, ODP                      |
| Other         | ODT                                |

### Configuration

Optionally specify an `assetFolderId` in your config to organize uploads:

```typescript
const config: TableConfig = {
  siteId: "your-site-id",
  collectionId: "your-collection-id",
  assetFolderId: "your-folder-id", // Optional
  // ...
};
```

To find your folder ID, use the Webflow API or check the URL when viewing a folder in the Webflow dashboard.

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

| Type             | Input Component     | Notes                                   |
| ---------------- | ------------------- | --------------------------------------- |
| `PlainText`      | TextInput           | Supports maxLength/minLength validation |
| `RichText`       | TextInput           | Supports maxLength/minLength validation |
| `Link`           | LinkInput           | URL input                               |
| `Email`          | EmailInput          | Email input                             |
| `Phone`          | PhoneInput          | Phone input                             |
| `Number`         | NumberInput         | Numeric input with range validation     |
| `Switch`         | SwitchInput         | Boolean toggle                          |
| `Option`         | OptionInput         | Dropdown select                         |
| `Color`          | ColorInput          | Color picker                            |
| `DateTime`       | DateInput           | Calendar picker with date selection     |
| `Image`          | ImageInput          | Image upload with processing            |
| `File`           | FileInput           | File upload with type/size validation   |
| `Reference`      | ReferenceInput      | Single collection reference             |
| `MultiReference` | MultiReferenceInput | Multiple collection refs                |

## Field Configuration Options

### Field

```typescript
interface Field {
  visible: boolean; // Show in table
  editable?: boolean; // Allow editing
  required?: boolean; // Field is required
  styles?: FieldStyles; // Custom styling
  schema: FieldSchema; // Field schema
}
```

### Field Validations

```typescript
interface Validations {
  minLength?: number; // Minimum string length
  maxLength?: number; // Maximum string length
  min?: number; // Minimum numeric value
  max?: number; // Maximum numeric value
}
```

### Sort Field

Sort fields now support `DateTime` type in addition to `Number`:

```typescript
interface SortField extends Field {
  direction?: "asc" | "desc"; // Sort direction
  schema: SortFieldSchema;
}

interface SortFieldSchema extends FieldSchema {
  type: "Number" | "DateTime"; // Number or DateTime
}
```

## API Reference

### Components

**CmsTable Components:**

- `CmsTable.Root` - Root wrapper that provides context and state management
- `CmsTable.Toolbar` - Title and add button with customizable slots
- `CmsTable.SaveBar` - Save/cancel controls with validation error display
- `CmsTable.Table` - Table container with styling
- `CmsTable.Header` - Table header row with field names and tooltips
- `CmsTable.Body` - Table body with drag-and-drop support
- `CmsTable.Row` - Individual row component (for custom row templates)
- `CmsTable.Actions` - Actions column with live toggle and delete button
- `CmsTable.Cell` - Field cell with appropriate input component

**Input Components** (can be used independently):

- `TextInput` - Plain text and rich text input
- `NumberInput` - Numeric input with validation
- `LinkInput` - URL input
- `EmailInput` - Email input
- `PhoneInput` - Phone input
- `ColorInput` - Color picker
- `SwitchInput` - Boolean toggle
- `OptionInput` - Dropdown select
- `DateInput` - Calendar date picker
- `ImageInput` - Image upload with compression
- `FileInput` - File upload with type/size validation
- `ReferenceInput` - Single collection reference selector
- `MultiReferenceInput` - Multiple collection reference selector

### Server Functions

- `createCmsActions(config, options)` - Create all CMS actions
- `loadCmsItems(token, config)` - Load items from Webflow
- `loadReferenceData(token, config)` - Load referenced collection data
- `createWebflowClient(token)` - Create Webflow API client

### Types

- `TableConfig` - Table configuration
- `Field` - Field configuration
- `ImageSettings` - Image upload settings (width, height)
- `FileSettings` - File upload settings (maxSizeBytes)
- `TokenGetter` - Token retrieval function type

## License

MIT
