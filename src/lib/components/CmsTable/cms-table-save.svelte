<script lang="ts">
  import { Save, X } from "@lucide/svelte";
  import ButtonGroup from "../ui/button-group/button-group.svelte";
  import Button from "../ui/button/button.svelte";

  type Props = {
    hasChanges: () => boolean;
    handleCancel: () => void;
    isSaving: boolean;
  };

  let { hasChanges, handleCancel, isSaving }: Props = $props();
</script>

<ButtonGroup>
  <Button
    variant="outline"
    onclick={handleCancel}
    disabled={!hasChanges() || isSaving}
  >
    <X class="h-4 w-4" />
    Cancel
  </Button>
  <Button
    type="submit"
    variant={!hasChanges() || isSaving ? "outline" : "default"}
    disabled={!hasChanges() || isSaving}
  >
    <Save class="h-4 w-4" />
    {isSaving ? "Saving..." : "Save Changes"}
  </Button>
</ButtonGroup>
