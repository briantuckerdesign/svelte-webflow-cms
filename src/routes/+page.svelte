<script>
  // This is a placeholder page for library development
  // The actual library exports are in src/lib
  // See README.md for usage examples
</script>

<div class="p-8">
  <h1 class="text-3xl font-bold mb-4">svelte-webflow-cms</h1>
  <p class="mb-4">
    This is a library package. Import components from 'svelte-webflow-cms'.
  </p>

  <h2 class="text-xl font-semibold mb-2">New Composable API</h2>
  <p class="text-gray-600 mb-4">
    The CmsTable now uses a composable pattern similar to shadcn-svelte,
    allowing you to customize and extend the table easily.
  </p>

  <h3 class="text-lg font-medium mb-2">Available Components:</h3>
  <ul class="list-disc list-inside space-y-1 text-gray-700">
    <li>
      <code class="bg-gray-100 px-1 rounded">CmsTable.Root</code> - State provider
      wrapper
    </li>
    <li>
      <code class="bg-gray-100 px-1 rounded">CmsTable.Toolbar</code> - Title and add
      button
    </li>
    <li>
      <code class="bg-gray-100 px-1 rounded">CmsTable.SaveBar</code> - Save/cancel
      controls
    </li>
    <li>
      <code class="bg-gray-100 px-1 rounded">CmsTable.Table</code> - Table container
    </li>
    <li>
      <code class="bg-gray-100 px-1 rounded">CmsTable.Header</code> - Table header
      row
    </li>
    <li>
      <code class="bg-gray-100 px-1 rounded">CmsTable.Body</code> - Table body with
      DnD
    </li>
    <li>
      <code class="bg-gray-100 px-1 rounded">CmsTable.Row</code> - Individual row
    </li>
    <li>
      <code class="bg-gray-100 px-1 rounded">CmsTable.Actions</code> - Actions column
    </li>
    <li>
      <code class="bg-gray-100 px-1 rounded">CmsTable.Cell</code> - Field cell with
      input
    </li>
  </ul>
</div>
