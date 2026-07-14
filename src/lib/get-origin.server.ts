import { getRequest } from "@tanstack/react-start/server";

export function getRequestOrigin(): string {
  try {
    const req = getRequest();
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const host = req.headers.get("host") ?? "kasahub.lovable.app";
    return `${proto}://${host}`;
  } catch {
    return "https://kasahub.lovable.app";
  }
}
