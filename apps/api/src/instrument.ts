// IMPORTANT: This file must be imported FIRST in any entrypoint (index.ts,
// workers/index.ts) before any other module is imported. Sentry's auto-
// instrumentation needs to wrap http/express/etc. before they are required.
import { initSentry } from "./lib/sentry";

initSentry();
