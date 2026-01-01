import Root from "./cms-table-root.svelte";
import Table from "./cms-table.svelte";
import Toolbar from "./cms-table-toolbar.svelte";
import SaveBar from "./cms-table-save-bar.svelte";
import Header from "./cms-table-header.svelte";
import Body from "./cms-table-body.svelte";
import Row from "./cms-table-row.svelte";
import Actions from "./cms-table-actions.svelte";
import Cell from "./cms-cell.svelte";

// Re-export context utilities for advanced usage
export { getCmsTableContext, setCmsTableContext } from "./context.js";
export type { CmsTableState, ValidationError } from "./context.js";

// Re-export field style defaults
export { fieldStyleDefaults } from "./field-style-defaults.js";

// Re-export utility components
export { default as TableTitle } from "./cms-table-title.svelte";
export { default as SaveChanges } from "./cms-table-save.svelte";

export {
  Root,
  Table,
  Toolbar,
  SaveBar,
  Header,
  Body,
  Row,
  Actions,
  Cell,
  //
  Root as CmsTableRoot,
  Table as CmsTable,
  Toolbar as CmsTableToolbar,
  SaveBar as CmsTableSaveBar,
  Header as CmsTableHeader,
  Body as CmsTableBody,
  Row as CmsTableRow,
  Actions as CmsTableActions,
  Cell as CmsTableCell,
};
