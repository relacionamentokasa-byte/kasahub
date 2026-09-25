import "./lib/error-capture";

import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

// Build the framework handler directly. Importing its default `server-entry`
// from this custom entry resolves back to this file in production and creates
// a circular self-import, which makes every route respond with HTTP 500.
const startHandler = createStartHandler(defaultStreamHandler);

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  const captured = consumeLastCapturedError();
  console.error(captured ?? new Error(`h3 swallowed SSR error: ${body}`));
  const details = captured instanceof Error ? `${captured.message}\n${captured.stack || ''}` : typeof captured === 'object' && captured ? JSON.stringify(captured) : body;
  return new Response(renderErrorPage(details), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const response = await (startHandler as any)(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      const details = error instanceof Error ? `${error.message}\n${error.stack || ''}` : String(error);
      return new Response(renderErrorPage(details), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
