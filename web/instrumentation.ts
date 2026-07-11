import type { Instrumentation } from 'next';

/**
 * The single "send an error somewhere" point. For now it writes ONE grep-able single-line JSON to
 * stderr (visible in Vercel's log viewer). A later phase can swap the body of THIS function for a
 * real sink (Sentry / Logtail / etc.) without touching any call site — that owner decision is pending.
 */
function reportError(payload: Record<string, unknown>): void {
  // Marker prefix keeps it filterable in Vercel logs; JSON.stringify keeps it a single line.
  console.error(`[REQUEST_ERROR] ${JSON.stringify(payload)}`);
}

/**
 * Next 15 server-side request-error hook (stable since 15.0 — no experimental.instrumentationHook
 * flag needed). Fires for errors thrown while rendering a route, running a Route Handler, a Server
 * Action, or middleware. Observability only — it must never throw.
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const digest =
    error && typeof error === 'object' && 'digest' in error
      ? String((error as { digest?: unknown }).digest)
      : undefined;

  reportError({
    at: new Date().toISOString(),
    path: request.path,
    method: request.method,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
    digest,
    message: error instanceof Error ? error.message : String(error),
  });
};
