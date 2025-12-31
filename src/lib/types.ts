import type { FieldType } from "webflow-api/api";

export interface TableConfig {
  /** Page title */
  pageTitle?: string;
  /** Page URL */
  pageUrl?: string;
  /** How to refer to the item singularly */
  itemSingular: string;
  /** How to refer to the item plural */
  itemPlural: string;
  /** Webflow ID of the site */
  siteId: string;
  /** Webflow ID of the collection */
  collectionId: string;
  /** Can users create/delete items? */
  createDeleteEnabled: boolean;
  /** Can users toggle drafts? */
  draftEnabled: boolean;
  /** Sort field (if provided, drag sorting is enabled) */
  sortField?: SortField;
  /** All fields, visible and hidden */
  fields: Field[];
}

export interface Field {
  /** Show field to user? */
  visible: boolean;
  /** Allow user to edit field? */
  editable?: boolean;
  /** Required */
  required?: boolean;
  /** Styles for field */
  styles?: FieldStyles;
  /** Schema of field */
  schema: FieldSchema;
}

export interface FieldSchema {
  /** Name of field */
  name: string;
  /** Slug of field, webflow uses this instead of field ID */
  slug: string;
  /** Type of field */
  type: FieldType;
  /** Validations for field */
  validations?: any;
  /** Whether validations should be displayed on user inputs */
  displayValidations?: boolean;
  /** Default value for field. If provided when hidden, this value will always be passed. */
  defaultValue?: any;
  /** Image settings */
  imageSettings?: ImageSettings;
}

export interface SortField extends Field {
  direction?: "asc" | "desc";
  schema: SortFieldSchema;
}

export interface SortFieldSchema extends FieldSchema {
  /** Sort field must be a number */
  type: "Number" | "DateTime";
}

export interface ImageSettings {
  width: number;
  height: number;
}

export interface FieldStyles {
  /** Min-width in px */
  width?: number;
  align?: "left" | "center" | "right";
}

export type FieldStyleDefaults = {
  [key in FieldType]: FieldStyles;
};

/**
 * Result from an upload operation
 */
export interface UploadResult {
  url: string;
  filename: string;
}

/**
 * Provider interface for file uploads.
 * Implement this to use your own storage backend (S3, R2, GCS, local filesystem, etc.)
 */
export interface UploadProvider {
  /**
   * Upload a file to storage
   * @param file - The file blob to upload
   * @param filename - The filename to use (already includes prefix and unique identifiers)
   * @param contentType - MIME type of the file
   * @returns The public URL and filename
   */
  upload(
    file: Blob,
    filename: string,
    contentType: string
  ): Promise<UploadResult>;

  /**
   * Delete a file from storage
   * @param filename - The filename to delete
   */
  delete(filename: string): Promise<void>;
}

/**
 * Factory function to create an upload provider at request time.
 * This is needed because platform/env is only available during request handling.
 */
export type UploadProviderFactory = (
  request: Request,
  platform?: any
) => UploadProvider | null;

/**
 * Token getter function type - allows flexible token retrieval
 */
export type TokenGetter = (
  request: Request,
  platform?: any
) => string | null | Promise<string | null>;
