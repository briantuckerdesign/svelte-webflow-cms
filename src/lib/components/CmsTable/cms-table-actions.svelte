<script lang="ts">
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import { Switch } from "$lib/components/ui/switch";
  import * as Table from "$lib/components/ui/table";
  import { Label } from "$lib/components/ui/label";
  import { cn } from "$lib/utils.js";
  import { Trash2 } from "@lucide/svelte";
  import type { Snippet } from "svelte";
  import { getCmsTableContext } from "./context.js";

  interface Props {
    /** The item this actions cell is for */
    item: any;
    /** Handler for delete action */
    onDelete?: () => void;
    /** Custom content to render before default actions */
    beforeActions?: Snippet;
    /** Custom content to render after default actions */
    afterActions?: Snippet;
    /** Whether to show the live toggle (defaults to config.draftEnabled) */
    showLiveToggle?: boolean;
    /** Whether to show the delete button (defaults to config.createDeleteEnabled) */
    showDelete?: boolean;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    item = $bindable(),
    onDelete,
    beforeActions,
    afterActions,
    showLiveToggle,
    showDelete,
    class: className,
  }: Props = $props();

  const ctx = getCmsTableContext();
  const config = $derived(ctx.config);

  let isLive = $derived(!item.isDraft);
  let deleteDialogOpen = $state(false);

  let shouldShowLiveToggle = $derived(showLiveToggle ?? config.draftEnabled);
  let shouldShowDelete = $derived(
    showDelete ?? (config.createDeleteEnabled && !!onDelete)
  );
</script>

<Table.Cell
  class={cn("sticky right-0 px-8 py-3 text-right", className)}
  style="height:100%; background: linear-gradient(90deg, transparent 0%, white 20%); padding-left: 3rem;"
>
  <div class="flex items-center justify-end gap-2">
    {#if beforeActions}
      {@render beforeActions()}
    {/if}

    <!-- Live Status Toggle -->
    {#if shouldShowLiveToggle}
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

    <!-- Delete Button -->
    {#if shouldShowDelete}
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
                onDelete?.();
                deleteDialogOpen = false;
              }}
            >
              Delete
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Root>
    {/if}

    {#if afterActions}
      {@render afterActions()}
    {/if}
  </div>
</Table.Cell>
