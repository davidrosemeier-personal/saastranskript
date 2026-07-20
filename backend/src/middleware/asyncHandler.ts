import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Express 4 does not catch rejected promises from async route handlers — an unhandled
 * rejection there crashes the entire Node process (taking down every in-flight request,
 * not just the failing one) instead of producing a 500 response. Wrap every async handler
 * with this so failures reach the error-handling middleware in app.ts instead.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
