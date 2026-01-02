// CmsTable - Composable components (shadcn-style)
import * as CmsTableComponents from "./components/CmsTable/index.js";
export const CmsTable = CmsTableComponents;

// Context utilities
export { getCmsTableContext } from "./components/CmsTable/context.js";
export type {
  CmsTableState,
  ValidationError,
} from "./components/CmsTable/context.js";

// Input components
export { default as TextInput } from "./components/CmsTable/inputs/TextInput.svelte";
export { default as NumberInput } from "./components/CmsTable/inputs/NumberInput.svelte";
export { default as LinkInput } from "./components/CmsTable/inputs/LinkInput.svelte";
export { default as EmailInput } from "./components/CmsTable/inputs/EmailInput.svelte";
export { default as PhoneInput } from "./components/CmsTable/inputs/PhoneInput.svelte";
export { default as ColorInput } from "./components/CmsTable/inputs/ColorInput.svelte";
export { default as SwitchInput } from "./components/CmsTable/inputs/SwitchInput.svelte";
export { default as OptionInput } from "./components/CmsTable/inputs/OptionInput.svelte";
export { default as ImageInput } from "./components/CmsTable/inputs/ImageInput.svelte";
export { default as ReferenceInput } from "./components/CmsTable/inputs/ReferenceInput.svelte";
export { default as MultiReferenceInput } from "./components/CmsTable/inputs/MultiReferenceInput.svelte";

// Types
export type {
  TableConfig,
  Field,
  FieldSchema,
  FieldStyles,
  FieldStyleDefaults,
  SortField,
  SortFieldSchema,
  ImageSettings,
  UploadProvider,
  UploadProviderFactory,
  UploadResult,
  TokenGetter,
} from "./types.js";

// Utilities
export { fieldStyleDefaults } from "./components/CmsTable/field-style-defaults.js";
export { cn, bytesToMb, mbToBytes } from "./utils.js";
