import { getContext, setContext } from "svelte";
import type { Field, TableConfig } from "$lib/types.js";

const CMS_TABLE_KEY = Symbol("cms-table");

export interface ValidationError {
  itemId: string;
  fieldName: string;
  message: string;
}

export interface CmsTableState {
  // Config
  config: TableConfig;
  referenceData: Record<string, any[]>;

  // State
  items: any[];
  originalItems: any[];
  pendingCreates: any[];
  pendingDeletes: { id: string; wasLive: boolean }[];
  tempFiles: Map<string, string>;
  isSaving: boolean;
  validationErrors: string[];

  // Derived
  displayItems: any[];
  isDragEnabled: boolean;
  hasActionsColumn: boolean;

  // Handlers
  hasChanges: () => boolean;
  getPayload: () => {
    updates: Array<{ item: any; wasLive: boolean }>;
    creates: any[];
    deletes: { id: string; wasLive: boolean }[];
  };
  handleCancel: () => void;
  handleSaveComplete: () => void;
  handleDeleteItem: (item: any) => void;
  handleAddItem: () => void;
  trackTempFile: (itemId: string, filename: string) => void;
  validateItems: () => ValidationError[];
  setValidationErrors: (errors: string[]) => void;
  setIsSaving: (saving: boolean) => void;

  // DnD handlers
  handleDndConsider: (e: CustomEvent<any>) => void;
  handleDndFinalize: (e: CustomEvent<any>) => void;

  // Style helpers
  getCellStyle: (field: Field) => string;
}

export function setCmsTableContext(state: CmsTableState) {
  setContext(CMS_TABLE_KEY, state);
}

export function getCmsTableContext(): CmsTableState {
  const context = getContext<CmsTableState>(CMS_TABLE_KEY);
  if (!context) {
    throw new Error(
      "CmsTable context not found. Make sure you're using CmsTable components inside a CmsTable.Root component."
    );
  }
  return context;
}
