import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-icebreaker-bingo",
  description:
    "Bingo board of conversation prompts — scan someone's QR after talking to mark a square",
  accentHex: "#a3e635",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
