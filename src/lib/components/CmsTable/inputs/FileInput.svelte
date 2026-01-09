<script lang="ts">
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import type { FileSettings } from "$lib/types.js";
  import { ALLOWED_FILE_EXTENSIONS, ALLOWED_FILE_TYPES } from "$lib/types.js";
  import { File, Trash2, Upload } from "@lucide/svelte";
  import { getCmsTableContext } from "../context.js";

  interface WebflowFile {
    fileId?: string;
    url: string;
    alt?: string;
  }

  interface Props {
    value: WebflowFile | null;
    itemId: string;
    fieldSlug: string;
    itemName?: string;
    fileSettings?: FileSettings;
    disabled?: boolean;
  }

  let {
    value = $bindable(),
    itemId,
    fieldSlug,
    itemName = "",
    fileSettings,
    disabled,
  }: Props = $props();

  const ctx = getCmsTableContext();

  // Default to 10MB if no settings provided
  let maxSizeBytes = $derived(fileSettings?.maxSizeBytes ?? 10 * 1024 * 1024);

  let deleteDialogOpen = $state(false);

  // Build accept string from allowed extensions
  const acceptString = ALLOWED_FILE_EXTENSIONS.join(",");

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFileExtension(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase();
    return ext ? `.${ext}` : "";
  }

  function isAllowedFileType(file: globalThis.File): boolean {
    // Check MIME type
    if (
      ALLOWED_FILE_TYPES.includes(
        file.type as (typeof ALLOWED_FILE_TYPES)[number]
      )
    ) {
      return true;
    }
    // Fallback to extension check for edge cases
    const ext = getFileExtension(file.name);
    return ALLOWED_FILE_EXTENSIONS.includes(
      ext as (typeof ALLOWED_FILE_EXTENSIONS)[number]
    );
  }

  // Get display name - prefer alt (original filename) over URL parsing
  function getDisplayName(file: WebflowFile): string {
    if (file.alt) {
      return file.alt;
    }
    // Fallback to extracting from URL
    try {
      const pathname = new URL(file.url).pathname;
      return pathname.split("/").pop() || "file";
    } catch {
      return file.url.split("/").pop() || "file";
    }
  }

  function handleUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validate file type
    if (!isAllowedFileType(file)) {
      alert(
        `File type not allowed. Allowed types: ${ALLOWED_FILE_EXTENSIONS.join(", ")}`
      );
      input.value = "";
      return;
    }

    // Validate file size
    if (file.size > maxSizeBytes) {
      alert(`File is too large. Maximum size: ${formatFileSize(maxSizeBytes)}`);
      input.value = "";
      return;
    }

    // Create a blob URL for local preview
    const blobUrl = URL.createObjectURL(file);

    // Track the pending upload in context
    ctx.trackPendingFileUpload({
      itemId,
      fieldSlug,
      file,
      blobUrl,
      originalFilename: file.name,
    });

    // Update value with blob URL and original filename as alt
    value = {
      fileId: "",
      url: blobUrl,
      alt: file.name,
    };

    // Reset input so same file can be selected again
    input.value = "";
  }

  function confirmDelete() {
    // Remove any pending upload for this field
    ctx.removePendingFileUpload(itemId, fieldSlug);
    value = null;
    deleteDialogOpen = false;
  }

  // Check if current value is a pending upload (blob URL)
  let isPendingUpload = $derived(value?.url?.startsWith("blob:") ?? false);
</script>

<div class="flex items-center gap-2">
  {#if value?.url}
    {#if isPendingUpload}
      <!-- Pending upload - show filename without link -->
      <div
        class="flex items-center gap-1.5 text-sm text-muted-foreground max-w-full truncate"
        title={getDisplayName(value)}
      >
        <File class="h-4 w-4 shrink-0" />
        <span class="truncate">{getDisplayName(value)}</span>
      </div>
    {:else}
      <!-- Uploaded file - show as link -->
      <a
        href={value.url}
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-1.5 text-sm text-blue-600 hover:underline max-w-full truncate"
        title={getDisplayName(value)}
      >
        <File class="h-4 w-4 shrink-0" />
        <span class="truncate">{getDisplayName(value)}</span>
      </a>
    {/if}
    <AlertDialog.Root bind:open={deleteDialogOpen}>
      <AlertDialog.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            type="button"
            variant="ghost"
            size="sm"
            class="text-destructive hover:text-destructive"
            title="Remove file"
            {disabled}
          >
            <Trash2 class="h-4 w-4" />
          </Button>
        {/snippet}
      </AlertDialog.Trigger>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>Remove File</AlertDialog.Title>
          <AlertDialog.Description>
            Are you sure you want to remove this file? This change will be
            applied when you save.
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
          <AlertDialog.Action
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onclick={confirmDelete}
          >
            Remove File
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog.Root>
  {:else}
    <label class="cursor-pointer inline-block">
      <input
        type="file"
        accept={acceptString}
        class="hidden"
        onchange={handleUpload}
        {disabled}
      />
      <span
        class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 {disabled
          ? 'opacity-50 pointer-events-none'
          : ''}"
      >
        <Upload class="h-4 w-4" />
        Upload
      </span>
    </label>
  {/if}
</div>
