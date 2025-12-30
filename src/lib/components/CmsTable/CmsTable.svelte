<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import * as Table from "$lib/components/ui/table";
  import type { Field, TableConfig } from "$lib/types.js";
  import { InfoIcon, Plus } from "@lucide/svelte";
  import { untrack } from "svelte";
  import { dndzone, type DndEvent } from "svelte-dnd-action";
  import { flip } from "svelte/animate";
  import SaveChanges from "./save-changes.svelte";
  import CmsRow from "./CmsRow.svelte";
  import TableTitle from "./TableTitle.svelte";
  import CreateItemModal from "./CreateItemModal.svelte";
  import { fieldStyleDefaults } from "./field-style-defaults";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { bytesToMb } from "$lib/utils";

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

  // Sync items when data changes (e.g. navigation)
  $effect(() => {
    items = deepClone(data);
    originalItems = deepClone(data);
    pendingCreates = [];
    pendingDeletes = [];
    cleanupTempFiles();
  });

  const flipDurationMs = 300;

  function handleDndConsider(e: CustomEvent<DndEvent<any>>) {
    items = e.detail.items;
  }

  function handleDndFinalize(e: CustomEvent<DndEvent<any>>) {
    items = e.detail.items;
    // Update sort field values to reflect new order
    if (config.sortField) {
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

  // Modal state
  let showCreateModal = $state(false);

  // Handle new item from modal
  function handleCreateItem(newItem: any) {
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
            <Button variant="outline" onclick={() => (showCreateModal = true)}>
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
            isSaving = true;
            return async ({ result, update }) => {
              isSaving = false;
              if (result.type === "success") {
                handleSaveComplete();
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
      </div>
    </div>

    <div class="overflow-x-hidden rounded-md border">
      <Table.Root>
        <Table.Header>
          <Table.Row class="hover:bg-transparent">
            {#if config.sortField}
              <Table.Head class="w-10 px-2 py-2"></Table.Head>
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
            dragDisabled: !config.sortField,
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

  <!-- Create Item Modal -->
  {#if config.createDeleteEnabled}
    <CreateItemModal
      {config}
      bind:open={showCreateModal}
      onOpenChange={(open) => (showCreateModal = open)}
      onSubmit={handleCreateItem}
    />
  {/if}
</Tooltip.Provider>
