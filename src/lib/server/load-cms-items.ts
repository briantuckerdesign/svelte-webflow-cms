import type { TableConfig } from "../types.js";
import { WebflowClient } from "webflow-api";

export async function loadCmsItems(token: string, tableConfig: TableConfig) {
  const client = new WebflowClient({ accessToken: token });
  if (!client)
    return {
      error: "WEBFLOW_TOKEN not configured or invalid",
      items: [],
    };

  try {
    const response = await client.collections.items.listItems(
      tableConfig.collectionId,
    );
    const items = response.items || [];

    console.log("listItems", items);

    // Sort by sort field if configured
    if (tableConfig.sortField) {
      items.sort((a, b) => {
        const aVal =
          (a.fieldData as Record<string, any>)?.[
            tableConfig.sortField!.schema.slug
          ] ?? 0;
        const bVal =
          (b.fieldData as Record<string, any>)?.[
            tableConfig.sortField!.schema.slug
          ] ?? 0;
        return Number(aVal) - Number(bVal);
      });
    }

    return {
      items,
      error: null,
    };
  } catch (err) {
    return {
      error: `Failed to fetch: ${err instanceof Error ? err.message : "Unknown error"}`,
      items: [],
    };
  }
}
