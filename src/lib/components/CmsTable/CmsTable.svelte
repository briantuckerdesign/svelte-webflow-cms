<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import * as Table from "$lib/components/ui/table";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import type { Field, TableConfig } from "$lib/types.js";
  import { bytesToMb } from "$lib/utils";
  import { CircleAlert, InfoIcon, Plus } from "@lucide/svelte";
  import { untrack } from "svelte";
  import { dndzone, type DndEvent } from "svelte-dnd-action";
  import { flip } from "svelte/animate";
  import CmsRow from "./CmsRow.svelte";
  import TableTitle from "./TableTitle.svelte";
  import { fieldStyleDefaults } from "./field-style-defaults";
  import SaveChanges from "./save-changes.svelte";

  interface Props {
    config: TableConfig;
    data: any[]; // CollectionItem[]
    referenceData?: Record<string, any[]>;
  }

  let { config, data, referenceData = {} }: Props = $props();

  // Deep clone helper
  function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  // Normalize field data by removing empty string values
  // This ensures that fields with "" are treated the same as missing fields
  function normalizeFieldData(data: any): any {
    if (!data || typeof data !== "object") return data;

    const normalized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip empty strings - treat them as if the field doesn't exist
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
  let isSaving = $state(false);
  let validationErrors = $state<string[]>([]);

  // Validation
  interface ValidationError {
    itemId: string;
    fieldName: string;
    message: string;
  }

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
            continue; // Skip other validations if empty
          }
        }

        // Skip validation checks if value is empty and not required
        if (value === undefined || value === null || value === "") continue;

        const validations = field.schema.validations;
        if (!validations) continue;

        // Check maxLength (for text fields)
        if (validations.maxLength && typeof value === "string") {
          if (value.length > validations.maxLength) {
            errors.push({
              itemId: item.id,
              fieldName,
              message: `${fieldName} exceeds max length of ${validations.maxLength}`,
            });
          }
        }

        // Check minLength (for text fields)
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

  // Sync items when data changes (e.g. navigation)
  $effect(() => {
    items = deepClone(data);
    originalItems = deepClone(data);
    pendingCreates = [];
    pendingDeletes = [];
    validationErrors = [];
    cleanupTempFiles();
  });

  const flipDurationMs = 300;

  function handleDndConsider(e: CustomEvent<DndEvent<any>>) {
    items = e.detail.items;
  }

  function handleDndFinalize(e: CustomEvent<DndEvent<any>>) {
    items = e.detail.items;
    // Update sort field values to reflect new order (only for Number sort fields)
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

    // Check if order changed (compare item IDs in order)
    const currentOrder = items.map((i) => i.id).join(",");
    const originalOrder = originalItems.map((i) => i.id).join(",");
    if (currentOrder !== originalOrder) return true;

    // Check if any existing item has changed
    return items.some((item) => {
      const original = originalItems.find((o) => o.id === item.id);
      if (!original) return true;

      // Compare fieldData using normalized comparison
      const normalizedCurrent = normalizeFieldData(item.fieldData);
      const normalizedOriginal = normalizeFieldData(original.fieldData);
      if (
        JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedOriginal)
      )
        return true;

      // Compare isDraft
      if (item.isDraft !== original.isDraft) return true;

      return false;
    });
  }

  // Get items that have changed for the update payload
  function getChangedItems(): Array<{ item: any; wasLive: boolean }> {
    const itemsToReturn = items
      .filter((item) => {
        const original = originalItems.find((o) => o.id === item.id);
        if (!original) return false; // New items handled separately

        // Compare fieldData using normalized comparison
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

    return itemsToReturn;
  }

  // Build payload for saveAll action
  function getPayload() {
    return {
      updates: getChangedItems(),
      creates: pendingCreates,
      deletes: pendingDeletes,
    };
  }

  // Cancel all pending changes
  function handleCancel() {
    items = deepClone(originalItems);
    pendingCreates = [];
    pendingDeletes = [];
    validationErrors = [];
    cleanupTempFiles();
  }

  // Called after successful save
  function handleSaveComplete() {
    originalItems = deepClone(items);
    pendingCreates = [];
    pendingDeletes = [];
    tempFiles.clear();
  }

  // Handle item deletion (marks for deletion, doesn't delete immediately)
  function handleDeleteItem(item: any) {
    const wasLive = !item.isDraft && !item.isArchived;
    pendingDeletes = [...pendingDeletes, { id: item.id, wasLive }];
    items = items.filter((i) => i.id !== item.id);
  }

  // Cleanup temp files on cancel
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

  // Track temp file for an item (for image uploads)
  function trackTempFile(itemId: string, filename: string) {
    tempFiles.set(itemId, filename);
  }

  // Items to display (excluding deleted)
  let displayItems = $derived([...items, ...pendingCreates]);

  // Drag-and-drop is only enabled for Number sort fields (not DateTime)
  let isDragEnabled = $derived(config.sortField?.schema.type === "Number");

  // Create a new empty item and add to pending creates
  function handleAddItem() {
    const fieldData: Record<string, any> = {};
    // Initialize with defaults
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

    // Set sort field to place new item at the end (only for Number sort fields)
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
      isDraft: config.draftEnabled, // If drafts disabled, create as live
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
    const style = `
		min-width: ${width}px; 
		width: ${width}px; 
		text-align: ${align}; 
		`;
    return style;
  }
</script>

<Tooltip.Provider>
  <div class="max-w-full space-y-4">
    <div class="flex items-center justify-between gap-4">
      {#if config.pageTitle}
        <TableTitle title={config.pageTitle} href={config.pageUrl} />
      {/if}
      <div class="flex justify-end gap-4">
        {#if config.createDeleteEnabled}
          <div class="text-sm">
            <Button variant="outline" onclick={handleAddItem}>
              <Plus class="h-4 w-4" />
              Add {config.itemSingular}
            </Button>
          </div>
        {/if}
        <form
          method="POST"
          action="?/saveAll"
          use:enhance={({ cancel }) => {
            if (!hasChanges()) {
              cancel();
              return;
            }

            // Validate before saving
            const errors = validateItems();
            if (errors.length > 0) {
              validationErrors = errors.map((e) => e.message);
              cancel();
              return;
            }
            validationErrors = [];

            isSaving = true;
            return async ({ result, update }) => {
              isSaving = false;
              if (result.type === "success") {
                handleSaveComplete();
              } else if (result.type === "failure") {
                const errorMsg =
                  (result.data as { error?: string })?.error ||
                  "An error occurred while saving";
                validationErrors = [errorMsg];
              }
              await update();
            };
          }}
        >
          <input
            type="hidden"
            name="payload"
            value={JSON.stringify(getPayload())}
          />
          <SaveChanges {hasChanges} {isSaving} {handleCancel} />
        </form>
        {#if validationErrors.length > 0}
          <div
            class="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            <CircleAlert class="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p class="font-medium">Please fix the following errors:</p>
              <ul class="mt-1 list-inside list-disc">
                {#each validationErrors as error}
                  <li>{error}</li>
                {/each}
              </ul>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <div class="overflow-x-hidden rounded-md border">
      <Table.Root>
        <Table.Header>
          <Table.Row class="hover:bg-transparent">
            {#if isDragEnabled}
              <Table.Head class="w-10 px-2 py-2"></Table.Head>
            {:else}
              <Table.Head class="w-1 p-0"></Table.Head>
            {/if}
            {#each config.fields as field}
              {#if field.visible}
                <Table.Head
                  class="{field.editable ? 'px-2' : 'px-4'} py-2"
                  style={getCellStyle(field)}
                >
                  <div style="display: flex; align-items: center;">
                    {field.schema.name}
                    {#if (field.schema.displayValidations && field.schema.validations && field.schema.type === "PlainText") || field.schema.type === "RichText"}
                      <Tooltip.Root>
                        <Tooltip.Trigger
                          class="ml-2 {buttonVariants({
                            variant: 'ghost',
                            size: 'icon-sm',
                          })}"
                        >
                          <InfoIcon color="gray" />
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          {field.schema.validations.maxLength
                            ? `Max length: ${field.schema.validations.maxLength} characters`
                            : ""}
                          {field.schema.validations.minLengt1h
                            ? `Min length: ${field.schema.validations.minLength} characters`
                            : ""}
                          {field.schema.validations.maxFileSize
                            ? `Max file size: ${bytesToMb(field.schema.validations.maxFileSize)} MB`
                            : ""}
                        </Tooltip.Content>
                      </Tooltip.Root>
                    {/if}
                  </div>
                </Table.Head>
              {/if}
            {/each}
            <Table.Head
              class="sticky right-0 px-8"
              style="padding-left: 3rem; background: linear-gradient(90deg, transparent 0%, white 20%);"
            >
              <!--actions-->
            </Table.Head>
          </Table.Row>
        </Table.Header>
        <tbody
          use:dndzone={{
            items,
            flipDurationMs,
            dragDisabled: !isDragEnabled,
          }}
          onconsider={handleDndConsider}
          onfinalize={handleDndFinalize}
          class="[&_tr:last-child]:border-0"
        >
          {#each items as item, i (item.id)}
            <tr
              animate:flip={{ duration: flipDurationMs }}
              class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
            >
              <CmsRow
                bind:item={items[i]}
                {config}
                {referenceData}
                {isDragEnabled}
                onDelete={handleDeleteItem}
                onTempFile={trackTempFile}
              />
            </tr>
          {/each}
          <!-- Pending creates (shown with visual indicator) -->
          {#each pendingCreates as item, i (item.id)}
            <tr
              class="border-b bg-green-50/50 transition-colors hover:bg-green-100/50"
            >
              <CmsRow
                bind:item={pendingCreates[i]}
                {config}
                {referenceData}
                {isDragEnabled}
                onDelete={() => {
                  pendingCreates = pendingCreates.filter((_, idx) => idx !== i);
                }}
                onTempFile={trackTempFile}
              />
            </tr>
          {/each}
        </tbody>
      </Table.Root>
    </div>
  </div>
</Tooltip.Provider>
