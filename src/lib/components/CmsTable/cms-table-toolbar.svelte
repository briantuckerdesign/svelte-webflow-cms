<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { cn } from "$lib/utils.js";
  import { Plus } from "@lucide/svelte";
  import type { Snippet } from "svelte";
  import { getCmsTableContext } from "./context.js";
  import CmsTableTitle from "./cms-table-title.svelte";

  interface Props {
    /** Custom content to render before the title */
    beforeTitle?: Snippet;
    /** Custom content to render after the title */
    afterTitle?: Snippet;
    /** Custom content to render before the add button */
    beforeActions?: Snippet;
    /** Custom content to render after the add button */
    afterActions?: Snippet;
    /** Whether to show the add button (defaults to config.createDeleteEnabled) */
    showAddButton?: boolean;
    /** Whether to show the title (defaults to true if config.pageTitle exists) */
    showTitle?: boolean;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    beforeTitle,
    afterTitle,
    beforeActions,
    afterActions,
    showAddButton,
    showTitle,
    class: className,
  }: Props = $props();

  const ctx = getCmsTableContext();
  const config = $derived(ctx.config);

  let shouldShowAddButton = $derived(
    showAddButton ?? config.createDeleteEnabled
  );
  let shouldShowTitle = $derived(showTitle ?? !!config.pageTitle);
</script>

<div class={cn("flex items-center justify-between gap-4", className)}>
  <div class="flex items-center gap-4">
    {#if beforeTitle}
      {@render beforeTitle()}
    {/if}

    {#if shouldShowTitle && config.pageTitle}
      <CmsTableTitle title={config.pageTitle} href={config.pageUrl} />
    {/if}

    {#if afterTitle}
      {@render afterTitle()}
    {/if}
  </div>

  <div class="flex items-center gap-4">
    {#if beforeActions}
      {@render beforeActions()}
    {/if}

    {#if shouldShowAddButton}
      <Button variant="outline" onclick={ctx.handleAddItem}>
        <Plus class="h-4 w-4" />
        Add {config.itemSingular}
      </Button>
    {/if}

    {#if afterActions}
      {@render afterActions()}
    {/if}
  </div>
</div>
