<script lang="ts">
  import * as Table from "$lib/components/ui/table";
  import { GripVertical } from "@lucide/svelte";
  import type { Snippet } from "svelte";
  import { getCmsTableContext } from "./context.js";
  import { fieldStyleDefaults } from "./field-style-defaults.js";
  import CmsCell from "./cms-cell.svelte";
  import CmsTableActions from "./cms-table-actions.svelte";

  interface Props {
    /** The item data for this row */
    item: any;
    /** The index of this row */
    index: number;
    /** Whether this is a new (pending create) item */
    isNew?: boolean;
    /** Custom cells to render before the field columns */
    beforeColumns?: Snippet;
    /** Custom cells to render after the field columns (before actions) */
    afterColumns?: Snippet;
    /** Custom actions column content */
    actions?: Snippet<[{ item: any }]>;
    /** Whether to show default actions (defaults to true) */
    showActions?: boolean;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    item = $bindable(),
    index,
    isNew = false,
    beforeColumns,
    afterColumns,
    actions,
    showActions = true,
    class: className,
  }: Props = $props();

  const ctx = getCmsTableContext();
  const config = $derived(ctx.config);
  const isDragEnabled = $derived(ctx.isDragEnabled);

  // Get item name for image alt text
  let itemName = $derived(item.fieldData?.name || item.fieldData?.title || "");

  function handleDelete() {
    if (isNew) {
      // Remove from pending creates
      const idx = ctx.pendingCreates.findIndex((i: any) => i.id === item.id);
      if (idx !== -1) {
        ctx.pendingCreates.splice(idx, 1);
      }
    } else {
      ctx.handleDeleteItem(item);
    }
  }
</script>

<!-- Drag Handle -->
{#if isDragEnabled}
  <Table.Cell
    class="w-10 cursor-grab px-4 py-3 text-gray-400 active:cursor-grabbing"
  >
    <GripVertical size={16} />
  </Table.Cell>
{:else}
  <Table.Cell class="w-1 p-0"></Table.Cell>
{/if}

{#if beforeColumns}
  {@render beforeColumns()}
{/if}

<!-- Field Cells -->
{#each config.fields as field}
  {#if field.visible}
    <Table.Cell
      class="py-3 align-middle {field.editable ? 'px-1' : 'px-4'}"
      style="text-align: {field.styles?.align ??
        fieldStyleDefaults[field.schema.type].align};"
    >
      <CmsCell
        {field}
        bind:value={item.fieldData[field.schema.slug]}
        itemId={item.id}
        {itemName}
        referenceData={ctx.referenceData}
        onTempFile={ctx.trackTempFile}
      />
    </Table.Cell>
  {/if}
{/each}

{#if afterColumns}
  {@render afterColumns()}
{/if}

<!-- Actions -->
{#if showActions}
  {#if actions}
    <Table.Cell
      class="sticky right-0 px-8 py-3 text-right"
      style="height:100%; background: linear-gradient(90deg, transparent 0%, white 20%); padding-left: 3rem;"
    >
      {@render actions({ item })}
    </Table.Cell>
  {:else}
    <CmsTableActions {item} onDelete={handleDelete} />
  {/if}
{/if}
