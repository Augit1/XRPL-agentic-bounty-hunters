import { timingSafeEqual } from "node:crypto";
import { NextFunction, Request, Response } from "express";
import { config } from "../config";

export function requireAdminApiKey(request: Request, response: Response, next: NextFunction): void {
  const providedKey = request.header("x-api-key");

  if (!providedKey) {
    response.status(401).json({
      error: "Unauthorized",
      message: "Provide a valid x-api-key header to access write endpoints."
    });
    return;
  }

  const expectedBuffer = Buffer.from(config.adminApiKey);
  const providedBuffer = Buffer.from(providedKey);

  const isAuthorized =
    expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);

  if (!isAuthorized) {
    response.status(401).json({
      error: "Unauthorized",
      message: "Provide a valid x-api-key header to access write endpoints."
    });
    return;
  }

  next();
}
