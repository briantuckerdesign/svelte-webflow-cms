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
      tableConfig.collectionId
    );
    const items = response.items || [];

    // Sort by sort field if configured
    if (tableConfig.sortField) {
      const sortSlug = tableConfig.sortField.schema.slug;
      const sortType = tableConfig.sortField.schema.type;
      const direction = tableConfig.sortField.direction ?? "asc";
      const multiplier = direction === "desc" ? -1 : 1;

      items.sort((a, b) => {
        const aVal = (a.fieldData as Record<string, any>)?.[sortSlug];
        const bVal = (b.fieldData as Record<string, any>)?.[sortSlug];

        if (sortType === "DateTime") {
          // Handle DateTime sorting (ISO strings or null)
          const aDate = aVal ? new Date(aVal).getTime() : 0;
          const bDate = bVal ? new Date(bVal).getTime() : 0;
          return (aDate - bDate) * multiplier;
        } else {
          // Number sorting (original behavior)
          return (Number(aVal ?? 0) - Number(bVal ?? 0)) * multiplier;
        }
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
