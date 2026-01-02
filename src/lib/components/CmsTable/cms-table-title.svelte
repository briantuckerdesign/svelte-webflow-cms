<script lang="ts">
  import { cn } from "$lib/utils.js";
  import { SquareArrowUpRight } from "@lucide/svelte";
  import { Button } from "../ui/button";
  import { getCmsTableContext } from "./context.js";

  interface Props {
    /** Override the title (defaults to config.pageTitle) */
    title?: string;
    /** Override the href (defaults to config.pageUrl) */
    href?: string;
    /** Whether to show the "Visit Page" link */
    showLink?: boolean;
    /** Additional CSS classes */
    class?: string;
  }

  let { title, href, showLink = true, class: className }: Props = $props();

  const ctx = getCmsTableContext();
  const config = $derived(ctx.config);

  const displayTitle = $derived(title ?? config.pageTitle);
  const displayHref = $derived(href ?? config.pageUrl);
</script>

{#if displayTitle}
  <div
    class={cn("flex items-center justify-between gap-4 flex-wrap", className)}
  >
    <h1 class="text-2xl font-bold">{displayTitle}</h1>
    {#if showLink && displayHref}
      <Button
        href={displayHref}
        variant="link"
        size="sm"
        target="_blank"
        class="p-0"
      >
        Visit Page
        <SquareArrowUpRight />
      </Button>
    {/if}
  </div>
{/if}
