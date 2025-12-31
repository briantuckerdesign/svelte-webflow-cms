<script lang="ts">
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import { Switch } from "$lib/components/ui/switch";
  import * as Table from "$lib/components/ui/table";
  import type { TableConfig } from "$lib/types.js";
  import { GripVertical, Trash2 } from "@lucide/svelte";
  import { Label } from "../ui/label";
  import CmsCell from "./CmsCell.svelte";
  import { fieldStyleDefaults } from "./field-style-defaults";

  interface Props {
    item: any; // CollectionItem
    config: TableConfig;
    referenceData?: Record<string, any[]>;
    onDelete?: (item: any) => void;
    onTempFile?: (itemId: string, filename: string) => void;
    isDragEnabled?: boolean;
  }

  let {
    item = $bindable(),
    config,
    referenceData = {},
    onDelete,
    onTempFile,
    isDragEnabled = false,
  }: Props = $props();

  let isLive = $derived(!item.isDraft);
  let deleteDialogOpen = $state(false);

  // Get item name for image alt text (try 'name' field first, then 'title')
  let itemName = $derived(item.fieldData?.name || item.fieldData?.title || "");
</script>

<!-- Drag Handle if drag sorting enabled (Number sort field only) -->
{#if isDragEnabled}
  <Table.Cell
    class="w-10 cursor-grab px-4 py-3 text-gray-400 active:cursor-grabbing"
  >
    <GripVertical size={16} />
  </Table.Cell>
{:else}
  <Table.Cell class="w-1 p-0"></Table.Cell>
{/if}

<!-- Fields -->
{#each config.fields as field}
  {#if field.visible}
    <Table.Cell
      class="py-3 align-middle {field.editable ? 'px-1' : 'px-4'}"
      style="text-align: {field.styles?.align ??
        fieldStyleDefaults[field.schema.type].align}; "
    >
      <CmsCell
        {field}
        bind:value={item.fieldData[field.schema.slug]}
        itemId={item.id}
        {itemName}
        {referenceData}
        {onTempFile}
      />
    </Table.Cell>
  {/if}
{/each}

<!-- Actions -->
<Table.Cell
  class="sticky right-0 px-8 py-3 text-right"
  style="height:100%; background: linear-gradient(90deg, transparent 0%, white 20%); padding-left: 3rem;"
>
  <div></div>
  <div class="flex items-center justify-end gap-2">
    <!-- Live Status Toggle -->
    {#if config.draftEnabled}
      <div class="mr-2 flex items-center">
        <Label class="mr-4">Live</Label>
        <Switch
          checked={isLive}
          onCheckedChange={(checked) => {
            item.isDraft = !checked;
          }}
        />
      </div>
    {/if}

    <!-- Delete Button (if enabled) -->
    {#if config.createDeleteEnabled && onDelete}
      <AlertDialog.Root bind:open={deleteDialogOpen}>
        <AlertDialog.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              variant="ghost"
              size="icon"
              class="h-8 w-8 text-gray-500 hover:bg-red-50 hover:text-red-600"
              title="Delete"
            >
              <Trash2 size={14} />
            </Button>
          {/snippet}
        </AlertDialog.Trigger>
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>Are you sure?</AlertDialog.Title>
            <AlertDialog.Description>
              This will mark this item for deletion. The change will be applied
              when you save.
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <Button
              variant="destructive"
              onclick={() => {
                onDelete(item);
                deleteDialogOpen = false;
              }}
            >
              Delete
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Root>
    {/if}
  </div>
</Table.Cell>
