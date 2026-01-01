<script lang="ts">
  import { dndzone, type DndEvent } from "svelte-dnd-action";
  import { flip } from "svelte/animate";
  import { cn } from "$lib/utils.js";
  import type { Snippet } from "svelte";
  import { getCmsTableContext } from "./context.js";
  import CmsTableRow from "./cms-table-row.svelte";

  interface Props {
    /** Custom row template - receives item and index */
    row?: Snippet<[{ item: any; index: number; isNew: boolean }]>;
    /** Custom empty state */
    empty?: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let { row, empty, class: className }: Props = $props();

  const ctx = getCmsTableContext();
  const flipDurationMs = 300;

  function handleDndConsider(e: CustomEvent<DndEvent<any>>) {
    ctx.handleDndConsider(e);
  }

  function handleDndFinalize(e: CustomEvent<DndEvent<any>>) {
    ctx.handleDndFinalize(e);
  }
</script>

<tbody
  use:dndzone={{
    items: ctx.items,
    flipDurationMs,
    dragDisabled: !ctx.isDragEnabled,
  }}
  onconsider={handleDndConsider}
  onfinalize={handleDndFinalize}
  class={cn("[&_tr:last-child]:border-0", className)}
>
  {#if ctx.items.length === 0 && ctx.pendingCreates.length === 0}
    {#if empty}
      {@render empty()}
    {:else}
      <tr>
        <td
          colspan="100"
          class="py-8 text-center text-sm text-muted-foreground"
        >
          No items yet. Click "Add {ctx.config.itemSingular}" to create one.
        </td>
      </tr>
    {/if}
  {:else}
    <!-- Existing items -->
    {#each ctx.items as item, i (item.id)}
      <tr
        animate:flip={{ duration: flipDurationMs }}
        class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
      >
        {#if row}
          {@render row({ item, index: i, isNew: false })}
        {:else}
          <CmsTableRow bind:item={ctx.items[i]} index={i} isNew={false} />
        {/if}
      </tr>
    {/each}

    <!-- Pending creates (shown with visual indicator) -->
    {#each ctx.pendingCreates as item, i (item.id)}
      <tr
        class="border-b bg-green-50/50 transition-colors hover:bg-green-100/50"
      >
        {#if row}
          {@render row({ item, index: ctx.items.length + i, isNew: true })}
        {:else}
          <CmsTableRow
            bind:item={ctx.pendingCreates[i]}
            index={ctx.items.length + i}
            isNew={true}
          />
        {/if}
      </tr>
    {/each}
  {/if}
</tbody>
