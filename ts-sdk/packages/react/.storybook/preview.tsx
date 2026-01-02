import type { Preview } from "@storybook/react";
import * as React from "react";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: "1rem" }}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
