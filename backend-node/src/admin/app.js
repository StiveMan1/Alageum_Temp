import PageBlocksInput from "./components/PageBlocksInput";

export default {
  register(app) {
    app.addFields({ type: "blocks", Component: PageBlocksInput });
  },
};
