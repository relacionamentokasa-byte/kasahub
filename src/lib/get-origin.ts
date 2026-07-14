import { createIsomorphicFn } from "@tanstack/react-start";

export const getOrigin = createIsomorphicFn()
  .client(() => window.location.origin)
  .server(() => {
    try {
      // Dynamic require kept server-only via isomorphic split
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getRequest } = require("@tanstack/react-start/server");
      const req = getRequest();
      const proto = req.headers.get("x-forwarded-proto") ?? "https";
      const host = req.headers.get("host") ?? "kasahub.lovable.app";
      return `${proto}://${host}`;
    } catch {
      return "https://kasahub.lovable.app";
    }
  });
