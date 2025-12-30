import type { TableConfig } from "../types.js";
import { WebflowClient } from "webflow-api";

export async function loadReferenceData(
  token: string,
  tableConfig: TableConfig,
): Promise<Record<string, any[]>> {
  const client = new WebflowClient({ accessToken: token });
  const referenceData: Record<string, any[]> = {};

  // Find all Reference and MultiReference fields in the config
  const referenceFields = tableConfig.fields.filter(
    (field) =>
      (field.schema.type === "Reference" ||
        field.schema.type === "MultiReference") &&
      field.schema.validations?.collectionId,
  );

  // Get unique collection IDs
  const collectionIds = [
    ...new Set(
      referenceFields.map((field) => field.schema.validations.collectionId),
    ),
  ];

  // Fetch items for each referenced collection
  await Promise.all(
    collectionIds.map(async (collectionId) => {
      try {
        const response = await client.collections.items.listItems(collectionId);
        referenceData[collectionId] = response.items || [];
      } catch (err) {
        console.error(
          `Failed to fetch reference data for collection ${collectionId}:`,
          err,
        );
        referenceData[collectionId] = [];
      }
    }),
  );

  return referenceData;
}
