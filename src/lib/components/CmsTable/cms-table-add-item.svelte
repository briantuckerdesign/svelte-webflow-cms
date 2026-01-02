<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { cn } from "$lib/utils.js";
  import { Plus } from "@lucide/svelte";
  import type { Snippet } from "svelte";
  import { getCmsTableContext } from "./context.js";

  interface Props {
    /** Custom button content */
    children?: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let { children, class: className }: Props = $props();

  const ctx = getCmsTableContext();
  const config = $derived(ctx.config);
</script>

{#if config.createDeleteEnabled}
  <Button variant="outline" onclick={ctx.handleAddItem} class={cn(className)}>
    {#if children}
      {@render children()}
    {:else}
      <Plus class="h-4 w-4" />
      Add {config.itemSingular}
    {/if}
  </Button>
{/if}
