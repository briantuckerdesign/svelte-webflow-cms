import type { FieldStyleDefaults } from "$lib/types.js";

const defaultWidth = {
  tiny: 80,
  small: 120,
  medium: 160,
  large: 200,
  xlarge: 240,
  huge: 300,
  xhuge: 360,
};
// const defaultWidth = 200; // px
const defaultAlign = "left";

export const fieldStyleDefaults: FieldStyleDefaults = {
  PlainText: {
    width: defaultWidth.medium,
    align: defaultAlign,
  },
  RichText: {
    width: defaultWidth.medium,
    align: defaultAlign,
  },
  Switch: {
    width: defaultWidth.tiny,
    align: "center",
  },
  Color: {
    width: defaultWidth.small,
    align: defaultAlign,
  },
  DateTime: {
    width: defaultWidth.medium,
    align: defaultAlign,
  },
  ExtFileRef: {
    width: defaultWidth.medium,
    align: defaultAlign,
  },
  Email: {
    width: defaultWidth.large,
    align: defaultAlign,
  },
  Image: {
    width: defaultWidth.medium,
    align: defaultAlign,
  },
  MultiImage: {
    width: defaultWidth.xlarge,
    align: defaultAlign,
  },
  File: {
    width: defaultWidth.medium,
    align: defaultAlign,
  },
  Link: {
    width: defaultWidth.huge,
    align: defaultAlign,
  },
  VideoLink: {
    width: defaultWidth.xhuge,
    align: defaultAlign,
  },
  Number: {
    width: defaultWidth.tiny,
    align: defaultAlign,
  },
  Option: {
    width: defaultWidth.medium,
    align: defaultAlign,
  },
  Phone: {
    width: defaultWidth.medium,
    align: defaultAlign,
  },
  Reference: {
    width: defaultWidth.medium,
    align: defaultAlign,
  },
  MultiReference: {
    width: defaultWidth.medium,
    align: defaultAlign,
  },
};
