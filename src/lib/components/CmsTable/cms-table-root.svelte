<script lang="ts">
  import * as Tooltip from "$lib/components/ui/tooltip";
  import type { Field, TableConfig } from "$lib/types.js";
  import { cn } from "$lib/utils.js";
  import type { Snippet } from "svelte";
  import { untrack } from "svelte";
  import {
    setCmsTableContext,
    type CmsTableState,
    type ValidationError,
    type PendingFileUpload,
  } from "./context.js";
  import { fieldStyleDefaults } from "./field-style-defaults.js";

  interface Props {
    config: TableConfig;
    data: any[];
    referenceData?: Record<string, any[]>;
    children: Snippet;
    class?: string;
  }

  let {
    config,
    data,
    referenceData = {},
    children,
    class: className,
  }: Props = $props();

  // Deep clone helper
  function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  // Normalize field data by removing empty string values
  function normalizeFieldData(data: any): any {
    if (!data || typeof data !== "object") return data;

    const normalized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== "") {
        normalized[key] = value;
      }
    }
    return normalized;
  }

  // State management
  let items = $state<any[]>(untrack(() => deepClone(data)));
  let originalItems = $state<any[]>(untrack(() => deepClone(data)));
  let pendingCreates = $state<any[]>([]);
  let pendingDeletes = $state<{ id: string; wasLive: boolean }[]>([]);
  let tempFiles = $state<Map<string, string>>(new Map());
  let pendingFileUploads = $state<PendingFileUpload[]>([]);
  let isSaving = $state(false);
  let validationErrors = $state<string[]>([]);

  // Validation
  function validateItems(): ValidationError[] {
    const errors: ValidationError[] = [];
    const allItems = [...items, ...pendingCreates];

    for (const item of allItems) {
      for (const field of config.fields) {
        if (!field.visible || !field.editable) continue;

        const value = item.fieldData?.[field.schema.slug];
        const fieldName = field.schema.name;

        // Check required
        if (field.required) {
          const isEmpty =
            value === undefined ||
            value === null ||
            value === "" ||
            (Array.isArray(value) && value.length === 0);

          if (isEmpty) {
            errors.push({
              itemId: item.id,
              fieldName,
              message: `${fieldName} is required`,
            });
            continue;
          }
        }

        if (value === undefined || value === null || value === "") continue;

        const validations = field.schema.validations;
        if (!validations) continue;

        // Check maxLength
        if (validations.maxLength && typeof value === "string") {
          if (value.length > validations.maxLength) {
            errors.push({
              itemId: item.id,
              fieldName,
              message: `${fieldName} exceeds max length of ${validations.maxLength}`,
            });
          }
        }

        // Check minLength
        if (validations.minLength && typeof value === "string") {
          if (value.length < validations.minLength) {
            errors.push({
              itemId: item.id,
              fieldName,
              message: `${fieldName} must be at least ${validations.minLength} characters`,
            });
          }
        }

        // Check number range
        if (typeof value === "number") {
          if (
            validations.minimum !== undefined &&
            value < validations.minimum
          ) {
            errors.push({
              itemId: item.id,
              fieldName,
              message: `${fieldName} must be at least ${validations.minimum}`,
            });
          }
          if (
            validations.maximum !== undefined &&
            value > validations.maximum
          ) {
            errors.push({
              itemId: item.id,
              fieldName,
              message: `${fieldName} must be at most ${validations.maximum}`,
            });
          }
        }
      }
    }

    return errors;
  }

  // Sync items when data changes
  $effect(() => {
    const newData = data;
    untrack(() => {
      items = deepClone(newData);
      originalItems = deepClone(newData);
      pendingCreates = [];
      pendingDeletes = [];
      validationErrors = [];
      cleanupPendingFileUploads();
      cleanupTempFiles();
    });
  });

  const flipDurationMs = 300;

  function handleDndConsider(e: CustomEvent<any>) {
    items = e.detail.items;
  }

  function handleDndFinalize(e: CustomEvent<any>) {
    items = e.detail.items;
    if (config.sortField?.schema.type === "Number") {
      const sortSlug = config.sortField.schema.slug;
      items = items.map((item, index) => ({
        ...item,
        fieldData: {
          ...item.fieldData,
          [sortSlug]: index + 1,
        },
      }));
    }
  }

  // Change detection
  function hasChanges(): boolean {
    if (pendingCreates.length > 0 || pendingDeletes.length > 0) return true;

    const currentOrder = items.map((i) => i.id).join(",");
    const originalOrder = originalItems.map((i) => i.id).join(",");
    if (currentOrder !== originalOrder) return true;

    return items.some((item) => {
      const original = originalItems.find((o) => o.id === item.id);
      if (!original) return true;

      const normalizedCurrent = normalizeFieldData(item.fieldData);
      const normalizedOriginal = normalizeFieldData(original.fieldData);
      if (
        JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedOriginal)
      )
        return true;

      if (item.isDraft !== original.isDraft) return true;

      return false;
    });
  }

  function getChangedItems(): Array<{ item: any; wasLive: boolean }> {
    return items
      .filter((item) => {
        const original = originalItems.find((o) => o.id === item.id);
        if (!original) return false;

        const normalizedCurrent = normalizeFieldData(item.fieldData);
        const normalizedOriginal = normalizeFieldData(original.fieldData);
        const fieldDataChanged =
          JSON.stringify(normalizedCurrent) !==
          JSON.stringify(normalizedOriginal);
        const draftChanged = item.isDraft !== original.isDraft;

        return fieldDataChanged || draftChanged;
      })
      .map((item) => {
        const original = originalItems.find((o) => o.id === item.id);
        return {
          item,
          wasLive: original ? !original.isDraft && !original.isArchived : false,
        };
      });
  }

  function getPayload() {
    return {
      updates: getChangedItems(),
      creates: pendingCreates,
      deletes: pendingDeletes,
    };
  }

  function handleCancel() {
    items = deepClone(originalItems);
    pendingCreates = [];
    pendingDeletes = [];
    validationErrors = [];
    cleanupPendingFileUploads();
    cleanupTempFiles();
  }

  function handleSaveComplete() {
    originalItems = deepClone(items);
    pendingCreates = [];
    pendingDeletes = [];
    tempFiles.clear();
    pendingFileUploads = [];
  }

  function handleDeleteItem(item: any) {
    const wasLive = !item.isDraft && !item.isArchived;
    pendingDeletes = [...pendingDeletes, { id: item.id, wasLive }];
    items = items.filter((i) => i.id !== item.id);
  }

  async function cleanupTempFiles() {
    for (const [, filename] of tempFiles.entries()) {
      try {
        const formData = new FormData();
        formData.append("filename", filename);
        await fetch("?/deletePhoto", {
          method: "POST",
          body: formData,
        });
      } catch (err) {
        console.error("Failed to cleanup temp file:", filename, err);
      }
    }
    tempFiles.clear();
  }

  function trackTempFile(itemId: string, filename: string) {
    tempFiles.set(itemId, filename);
  }

  function trackPendingFileUpload(upload: PendingFileUpload) {
    // Remove any existing upload for this field
    pendingFileUploads = pendingFileUploads.filter(
      (u) => !(u.itemId === upload.itemId && u.fieldSlug === upload.fieldSlug)
    );
    pendingFileUploads = [...pendingFileUploads, upload];
  }

  function removePendingFileUpload(itemId: string, fieldSlug: string) {
    const upload = pendingFileUploads.find(
      (u) => u.itemId === itemId && u.fieldSlug === fieldSlug
    );
    if (upload) {
      URL.revokeObjectURL(upload.blobUrl);
    }
    pendingFileUploads = pendingFileUploads.filter(
      (u) => !(u.itemId === itemId && u.fieldSlug === fieldSlug)
    );
  }

  function cleanupPendingFileUploads() {
    for (const upload of pendingFileUploads) {
      URL.revokeObjectURL(upload.blobUrl);
    }
    pendingFileUploads = [];
  }

  async function uploadPendingFiles(): Promise<void> {
    for (const upload of pendingFileUploads) {
      const formData = new FormData();
      formData.append("file", upload.file);
      formData.append("itemName", upload.originalFilename);
      formData.append("originalFilename", upload.originalFilename);

      const response = await fetch("?/uploadFile", {
        method: "POST",
        body: formData,
      });

      const text = await response.text();
      // Parse the SvelteKit action response using deserialize
      const { deserialize } = await import("$app/forms");
      const result = deserialize(text);

      // SvelteKit success responses have type "success" and data contains the returned object
      if (result.type === "success") {
        const data = result.data as {
          success?: boolean;
          file?: {
            url: string;
            alt: string;
            filename: string;
          };
        };

        if (data?.file) {
          // Success - update the item's field value with the real URL
          const fileData = data.file;

          // Update items array (need to reassign to trigger reactivity)
          items = items.map((item) => {
            if (item.id === upload.itemId && item.fieldData) {
              return {
                ...item,
                fieldData: {
                  ...item.fieldData,
                  [upload.fieldSlug]: {
                    url: fileData.url,
                    alt: fileData.alt,
                  },
                },
              };
            }
            return item;
          });

          // Update pendingCreates array
          pendingCreates = pendingCreates.map((item) => {
            if (item.id === upload.itemId && item.fieldData) {
              return {
                ...item,
                fieldData: {
                  ...item.fieldData,
                  [upload.fieldSlug]: {
                    url: fileData.url,
                    alt: fileData.alt,
                  },
                },
              };
            }
            return item;
          });

          // Revoke the blob URL
          URL.revokeObjectURL(upload.blobUrl);
        } else {
          throw new Error(
            `Failed to upload ${upload.originalFilename}: No file data in response`
          );
        }
      } else if (result.type === "failure") {
        const errorMsg =
          (result.data as { error?: string })?.error || "Failed to upload file";
        throw new Error(
          `Failed to upload ${upload.originalFilename}: ${errorMsg}`
        );
      } else {
        throw new Error(
          `Failed to upload ${upload.originalFilename}: Unexpected response type ${result.type}`
        );
      }
    }
    pendingFileUploads = [];
  }

  function handleAddItem() {
    const fieldData: Record<string, any> = {};
    for (const field of config.fields) {
      if (field.schema.defaultValue !== undefined) {
        fieldData[field.schema.slug] = field.schema.defaultValue;
      } else if (field.schema.type === "Switch") {
        fieldData[field.schema.slug] = false;
      } else if (field.schema.type === "Number") {
        fieldData[field.schema.slug] = 0;
      } else if (field.schema.type === "MultiReference") {
        fieldData[field.schema.slug] = [];
      } else {
        fieldData[field.schema.slug] = "";
      }
    }

    if (config.sortField?.schema.type === "Number") {
      const sortSlug = config.sortField.schema.slug;
      const allItems = [...items, ...pendingCreates];
      const maxSort = allItems.reduce((max, item) => {
        const val = item.fieldData?.[sortSlug] ?? 0;
        return Math.max(max, typeof val === "number" ? val : 0);
      }, 0);
      fieldData[sortSlug] = maxSort + 1;
    }

    const newItem = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      fieldData,
      isDraft: config.draftEnabled,
      isArchived: config.draftEnabled,
      _isNew: true,
    };

    pendingCreates = [...pendingCreates, newItem];
  }

  function getCellStyle(field: Field) {
    const width =
      field.styles?.width ??
      (fieldStyleDefaults[field.schema.type].width as number);
    const align =
      field.styles?.align ??
      (fieldStyleDefaults[field.schema.type].align as string);
    return `min-width: ${width}px; width: ${width}px; text-align: ${align};`;
  }

  function setValidationErrors(errors: string[]) {
    validationErrors = errors;
  }

  function setIsSaving(saving: boolean) {
    isSaving = saving;
  }

  // Derived values
  let displayItems = $derived([...items, ...pendingCreates]);
  let isDragEnabled = $derived(config.sortField?.schema.type === "Number");
  let hasActionsColumn = $derived(
    config.draftEnabled || config.createDeleteEnabled
  );

  // Create context state - using getters to make it reactive
  const contextState: CmsTableState = {
    get config() {
      return config;
    },
    get referenceData() {
      return referenceData;
    },
    get items() {
      return items;
    },
    get originalItems() {
      return originalItems;
    },
    get pendingCreates() {
      return pendingCreates;
    },
    get pendingDeletes() {
      return pendingDeletes;
    },
    get tempFiles() {
      return tempFiles;
    },
    get pendingFileUploads() {
      return pendingFileUploads;
    },
    get isSaving() {
      return isSaving;
    },
    get validationErrors() {
      return validationErrors;
    },
    get displayItems() {
      return displayItems;
    },
    get isDragEnabled() {
      return isDragEnabled;
    },
    get hasActionsColumn() {
      return hasActionsColumn;
    },
    hasChanges,
    getPayload,
    handleCancel,
    handleSaveComplete,
    handleDeleteItem,
    handleAddItem,
    trackTempFile,
    trackPendingFileUpload,
    removePendingFileUpload,
    uploadPendingFiles,
    validateItems,
    setValidationErrors,
    setIsSaving,
    handleDndConsider,
    handleDndFinalize,
    getCellStyle,
  };

  // Set context immediately (works in SSR)
  setCmsTableContext(contextState);
</script>

<Tooltip.Provider>
  <div class={cn("max-w-full space-y-4", className)}>
    {@render children()}
  </div>
</Tooltip.Provider>
