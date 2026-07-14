import { createIsomorphicFn } from "@tanstack/react-start";

export const getOrigin = createIsomorphicFn()
  .client(() => window.location.origin)
  .server(() => {
    // Import kept in server bundle only — createIsomorphicFn strips this body on the client
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getRequestOrigin } = require("./get-origin.server") as typeof import("./get-origin.server");
    return getRequestOrigin();
  });
