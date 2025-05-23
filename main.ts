/// <reference lib="deno.ns" />

import { Application, oakCors, dotenvConfig, Status } from './deps.ts';
import leadRouter from './src/routes/lead.routes.ts';

// --- Environment Variables ---
// Ensure .env is loaded before accessing variables
try {
  dotenvConfig({ export: true, path: './.env' }); // Explicitly point to .env in root
} catch (e) {
  // @ts-ignore - Deno namespace
  if (e instanceof Deno.errors.NotFound) {
    console.warn(
      '.env file not found. Relying on system environment variables.'
    );
  } else {
    console.error('Error loading .env file:', e);
    // Potentially exit if .env is critical
    // Deno.exit(1);
  }
}

// @ts-ignore - Deno namespace
const env = Deno.env.toObject(); // Use Deno.env after dotenvConfig has populated it
const port = env.PORT ? parseInt(env.PORT, 10) : 8000;
// Define allowedOrigin using environment variable or fallback
const allowedOrigin = env.ALLOWED_ORIGIN; 

if (!allowedOrigin) {
  console.warn(
    'WARNING: ALLOWED_ORIGIN environment variable not set. CORS might not function as expected in production. Falling back to a default origin for local development (currently commented out).'
  );
  // If you need a default for local dev, uncomment below:
  // allowedOrigin = 'http://localhost:3000'; // Example default
  // Consider if a default is truly needed or if it should fail/restrict if not set.
}

// --- Application Setup ---
export const app = new Application();

// --- Middleware ---

// *** NEW: Very Early Logger ***
app.use(async (ctx, next) => {
  console.log(
    `[EARLY LOG] Received request: ${ctx.request.method} ${ctx.request.url.pathname}`
  );
  await next();
});

// 1. Logger Middleware
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const rtHeader = ctx.response.headers.get('X-Response-Time');
  const time = rtHeader || `${ms}ms`; // Fallback if timing middleware didn't run or set header
  console.log(
    `${ctx.request.method} ${ctx.request.url} - ${ctx.response.status} - ${time}`
  );
});

// 2. Timing Middleware (Adds X-Response-Time header)
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set('X-Response-Time', `${ms}ms`);
});

// 3. CORS Middleware (MODIFIED)
app.use(
  oakCors({
    // Use the environment variable or the fallback
    origin: allowedOrigin, // Use the variable here
    optionsSuccessStatus: 200,
    credentials: true,
  })
);

// 4. Central Error Handling Middleware
app.use(async (ctx, next) => {
  try {
    await next();
    // Handle 404 Not Found specifically after routes have been processed
    if (ctx.response.status === Status.NotFound && !ctx.response.body) {
      ctx.response.status = Status.NotFound;
      ctx.response.body = {
        success: false,
        message: `Not Found - ${ctx.request.method} ${ctx.request.url}`,
      };
    }
  } catch (err) {
    console.error('Unhandled error caught in middleware:', err);

    // Default error response
    let statusCode = Status.InternalServerError;
    let message = 'Internal Server Error';

    // Customize based on error type if needed (Oak HttpErrors)
    if (err instanceof Error) {
      // Basic check
      message = err.message;
      // Check for Oak specific errors if available
      // if (isHttpError(err)) { statusCode = err.status; }
    }

    // Avoid setting body if response already sent
    if (!ctx.response.writable) return;

    ctx.response.status = statusCode;
    ctx.response.body = { success: false, message: message };
    // Optionally add stack trace in development
    // if (Deno.env.get("APP_ENV") === "development") {
    //     ctx.response.body.stack = err.stack;
    // }
  }
});

// --- Routes ---
console.log('Registering API routes...');
app.use(leadRouter.routes());
app.use(leadRouter.allowedMethods()); // Handles OPTIONS requests and 405 Method Not Allowed

// --- Start Server ---
app.addEventListener('listen', ({ hostname, port, secure }) => {
  const protocol = secure ? 'https://' : 'http://';
  const host = hostname === '0.0.0.0' ? 'localhost' : hostname ?? 'localhost'; // Use localhost for 0.0.0.0
  console.log(`-------------------------------------------------------`);
  console.log(`🚀 Server running! Access it at: ${protocol}${host}:${port}`);
  // Update console log to show the actual origin being used
  if (allowedOrigin) {
    console.log(
      `🔌 CORS configured for origin: ${allowedOrigin}`
    );
  } else {
    console.log(
      `🔌 CORS origin not explicitly set via ALLOWED_ORIGIN.`
    );
  }
  console.log(`-------------------------------------------------------`);
});

// Use an async IIFE to allow top-level await if needed elsewhere, though not strictly required here
(async () => {
  try {
    await app.listen({ port });
  } catch (error) {
    console.error('Fatal error starting server:', error);
    // @ts-ignore - Deno namespace 
    Deno.exit(1);
  }
})();
