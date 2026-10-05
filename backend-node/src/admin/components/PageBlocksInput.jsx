import React from "react";
import { unstable_useContentManagerContext as useContentManagerContext } from "@strapi/content-manager/strapi-admin";
import { BlocksInput as NativeBlocksInput } from "../../../node_modules/@strapi/content-manager/dist/admin/pages/EditView/components/FormInputs/BlocksInput/BlocksInput.mjs";
import { pageEditorInputProps } from "../page-editor-options.mjs";

// BlocksInput is not a public export. check-page-editor-adapter.js verifies the
// exact official package bytes before build/start; upgrades require review.
// Reuse native rendering, form integration, permissions and empty normalization.
// Synchronous mode creates no delayed callback that can outlive a discard/reset.
const PageBlocksInput = React.forwardRef(function PageBlocksInput(props, ref) {
  const { model } = useContentManagerContext();
  return <NativeBlocksInput {...pageEditorInputProps(model, props)} ref={ref} />;
});

export default PageBlocksInput;
