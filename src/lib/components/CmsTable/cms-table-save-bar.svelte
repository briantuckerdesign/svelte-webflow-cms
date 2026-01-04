<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button";
  import { ButtonGroup } from "$lib/components/ui/button-group";
  import { cn } from "$lib/utils.js";
  import { CircleAlert, Save, X } from "@lucide/svelte";
  import type { Snippet } from "svelte";
  import { getCmsTableContext } from "./context.js";

  interface Props {
    /** Form action URL (defaults to ?/saveAll) */
    action?: string;
    /** Custom content to render before the save buttons */
    beforeSave?: Snippet;
    /** Custom content to render after the save buttons */
    afterSave?: Snippet;
    /** Custom error display snippet */
    errorDisplay?: Snippet<[string[]]>;
    /** Whether to show validation errors (defaults to true) */
    showErrors?: boolean;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    action = "?/saveAll",
    beforeSave,
    afterSave,
    errorDisplay,
    showErrors = true,
    class: className,
  }: Props = $props();

  const ctx = getCmsTableContext();
</script>

<div class={cn("flex items-center gap-4", className)}>
  {#if beforeSave}
    {@render beforeSave()}
  {/if}

  <form
    method="POST"
    {action}
    use:enhance={({ cancel }) => {
      if (!ctx.hasChanges()) {
        cancel();
        return;
      }

      const errors = ctx.validateItems();
      if (errors.length > 0) {
        ctx.setValidationErrors(errors.map((e) => e.message));
        cancel();
        return;
      }
      ctx.setValidationErrors([]);

      // If there are pending file uploads, we need to handle them first
      if (ctx.pendingFileUploads.length > 0) {
        cancel();

        // Handle file uploads async, then resubmit
        (async () => {
          ctx.setIsSaving(true);
          try {
            await ctx.uploadPendingFiles();
            // Now resubmit the form with the updated payload
            const form = document.querySelector(
              `form[action="${action}"]`
            ) as HTMLFormElement;
            if (form) {
              // Update the hidden input with the new payload
              const payloadInput = form.querySelector(
                'input[name="payload"]'
              ) as HTMLInputElement;
              if (payloadInput) {
                payloadInput.value = JSON.stringify(ctx.getPayload());
              }
              // Use requestSubmit to trigger enhance again (but now without pending files)
              form.requestSubmit();
            }
          } catch (err) {
            ctx.setIsSaving(false);
            const errorMsg =
              err instanceof Error ? err.message : "Failed to upload files";
            ctx.setValidationErrors([errorMsg]);
          }
        })();

        return;
      }

      ctx.setIsSaving(true);

      return async ({ result, update }) => {
        ctx.setIsSaving(false);
        if (result.type === "success") {
          ctx.handleSaveComplete();
        } else if (result.type === "failure") {
          const errorMsg =
            (result.data as { error?: string })?.error ||
            "An error occurred while saving";
          ctx.setValidationErrors([errorMsg]);
        }
        await update();
      };
    }}
  >
    <input
      type="hidden"
      name="payload"
      value={JSON.stringify(ctx.getPayload())}
    />
    <ButtonGroup>
      <Button
        variant="outline"
        onclick={ctx.handleCancel}
        disabled={!ctx.hasChanges() || ctx.isSaving}
      >
        <X class="h-4 w-4" />
        Cancel
      </Button>
      <Button
        type="submit"
        variant={!ctx.hasChanges() || ctx.isSaving ? "outline" : "default"}
        disabled={!ctx.hasChanges() || ctx.isSaving}
      >
        <Save class="h-4 w-4" />
        {ctx.isSaving ? "Saving..." : "Save"}
      </Button>
    </ButtonGroup>
  </form>

  {#if afterSave}
    {@render afterSave()}
  {/if}
</div>

{#if showErrors && ctx.validationErrors.length > 0}
  {#if errorDisplay}
    {@render errorDisplay(ctx.validationErrors)}
  {:else}
    <div
      class="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
    >
      <CircleAlert class="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p class="font-medium">Please fix the following errors:</p>
        <ul class="mt-1 list-inside list-disc">
          {#each ctx.validationErrors as error}
            <li>{error}</li>
          {/each}
        </ul>
      </div>
    </div>
  {/if}
{/if}
