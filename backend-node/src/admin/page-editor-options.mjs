// Only this application's Page body opts into the pinned native editor's
// synchronous form updates. Preserve every native prop and other field mode.
export function pageEditorInputProps(model, props) {
  return model === "api::page.page" && props.name === "body"
    ? { ...props, livePreviewSync: true }
    : props;
}
