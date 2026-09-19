/**
 * Stable identifiers exchanged between business domains.
 *
 * Modules hand each other these ids and DTOs built from them — never a whole
 * database row. Branding them makes an accidental swap (passing a ProductId
 * where a VariantId is required) a compile error rather than a runtime bug
 * that silently reads the wrong stock.
 */

declare const brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [brand]: B };

export type ProductId = Brand<string, "ProductId">;
export type VariantId = Brand<string, "VariantId">;
export type CategoryId = Brand<string, "CategoryId">;
export type LocationId = Brand<string, "LocationId">;
export type OrderId = Brand<string, "OrderId">;
export type OrderItemId = Brand<string, "OrderItemId">;
export type InvoiceId = Brand<string, "InvoiceId">;
export type CustomerId = Brand<string, "CustomerId">;
export type PaymentId = Brand<string, "PaymentId">;

/** A human-facing stock-keeping code, unique per sellable variant. */
export type Sku = Brand<string, "Sku">;

/**
 * An internal Code 128 barcode. LavIndia-internal only — it is NOT a
 * registered EAN/GTIN and must never be presented as one.
 */
export type Barcode = Brand<string, "Barcode">;

export const ProductId = (value: string): ProductId => value as ProductId;
export const VariantId = (value: string): VariantId => value as VariantId;
export const CategoryId = (value: string): CategoryId => value as CategoryId;
export const LocationId = (value: string): LocationId => value as LocationId;
export const OrderId = (value: string): OrderId => value as OrderId;
export const OrderItemId = (value: string): OrderItemId => value as OrderItemId;
export const InvoiceId = (value: string): InvoiceId => value as InvoiceId;
export const CustomerId = (value: string): CustomerId => value as CustomerId;
export const PaymentId = (value: string): PaymentId => value as PaymentId;
export const Sku = (value: string): Sku => value as Sku;
export const Barcode = (value: string): Barcode => value as Barcode;
