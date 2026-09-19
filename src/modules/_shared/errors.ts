/**
 * Domain errors shared by every module.
 *
 * Business rules fail loudly and specifically: a caller can tell "you asked
 * for 3 but only 1 is on the shelf" apart from "that barcode is not ours"
 * without parsing a message string. Nothing in the modules swallows an
 * error and returns a half-written state.
 */

export type DomainErrorCode =
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "FORBIDDEN"
  // Catalog
  | "PRODUCT_NOT_FOUND"
  | "VARIANT_NOT_FOUND"
  | "INVALID_SKU"
  | "DUPLICATE_SKU"
  | "DUPLICATE_BARCODE"
  | "UNKNOWN_BARCODE"
  // Inventory
  | "LOCATION_NOT_FOUND"
  | "INSUFFICIENT_STOCK"
  | "INVALID_QUANTITY"
  | "RESERVATION_FAILED"
  | "SERIAL_TRACKING_UNSUPPORTED"
  // Orders / Payments
  | "ORDER_NOT_FOUND"
  | "PAYMENT_FAILED"
  | "PAYMENT_NOT_VERIFIED"
  // Billing
  | "INVOICE_GENERATION_FAILED"
  | "INVOICE_ALREADY_ISSUED";

const STATUS_BY_CODE: Record<DomainErrorCode, number> = {
  VALIDATION_FAILED: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  FORBIDDEN: 403,
  PRODUCT_NOT_FOUND: 404,
  VARIANT_NOT_FOUND: 404,
  INVALID_SKU: 400,
  DUPLICATE_SKU: 409,
  DUPLICATE_BARCODE: 409,
  UNKNOWN_BARCODE: 404,
  LOCATION_NOT_FOUND: 404,
  INSUFFICIENT_STOCK: 409,
  INVALID_QUANTITY: 400,
  RESERVATION_FAILED: 409,
  SERIAL_TRACKING_UNSUPPORTED: 400,
  ORDER_NOT_FOUND: 404,
  PAYMENT_FAILED: 402,
  PAYMENT_NOT_VERIFIED: 400,
  INVOICE_GENERATION_FAILED: 500,
  INVOICE_ALREADY_ISSUED: 409,
};

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: DomainErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

/**
 * Raised instead of overselling. Carries the numbers so the caller can say
 * "only 1 left" rather than a generic failure.
 */
export class InsufficientStockError extends DomainError {
  constructor(args: {
    variantId: string;
    requested: number;
    available: number;
    label?: string;
  }) {
    super(
      "INSUFFICIENT_STOCK",
      args.label
        ? `Only ${args.available} left of ${args.label}`
        : `Only ${args.available} available, ${args.requested} requested`,
      args,
    );
    this.name = "InsufficientStockError";
  }
}

export class UnknownBarcodeError extends DomainError {
  constructor(barcode: string) {
    super("UNKNOWN_BARCODE", "Barcode not found", { barcode });
    this.name = "UnknownBarcodeError";
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

/**
 * The single translation point from a domain failure to an HTTP response.
 * Route handlers use this so every module reports failures identically and
 * an unexpected error never leaks its stack to a client.
 */
export function toErrorResponse(error: unknown): {
  body: { error: string; code: string; details?: Record<string, unknown> };
  status: number;
} {
  if (isDomainError(error)) {
    return {
      body: { error: error.message, code: error.code, details: error.details },
      status: error.status,
    };
  }
  console.error("Unhandled domain error:", error);
  return {
    body: { error: "Something went wrong", code: "INTERNAL_ERROR" },
    status: 500,
  };
}
