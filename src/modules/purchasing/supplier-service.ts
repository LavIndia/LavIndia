/**
 * Suppliers: who stock is bought from.
 *
 * Deliberately a small CRUD surface. The interesting question — what was
 * spent with each of them — is answered by reading the inventory ledger,
 * because that is where the purchases actually are; duplicating a running
 * total onto the supplier row would be a second source of truth that drifts.
 */
import { prisma } from "../_shared/db";
import { DomainError } from "../_shared/errors";
import type { SupplierInput, SupplierSpend, SupplierView } from "./contracts";

const SELECT = {
  id: true,
  name: true,
  contactName: true,
  phone: true,
  email: true,
  gstin: true,
  address: true,
  city: true,
  state: true,
  pincode: true,
  notes: true,
  isActive: true,
  createdAt: true,
} as const;

/** Blank strings from a form mean "not given", which is null, not "". */
function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

class SupplierService {
  async list(options: { includeInactive?: boolean } = {}): Promise<SupplierView[]> {
    return prisma.supplier.findMany({
      where: options.includeInactive ? {} : { isActive: true },
      select: SELECT,
      orderBy: { name: "asc" },
    });
  }

  async get(id: string): Promise<SupplierView | null> {
    return prisma.supplier.findUnique({ where: { id }, select: SELECT });
  }

  async create(input: SupplierInput): Promise<SupplierView> {
    const name = clean(input.name);
    if (!name) throw new DomainError("VALIDATION_FAILED", "A supplier needs a name");

    const existing = await prisma.supplier.findUnique({ where: { name }, select: { id: true } });
    if (existing) {
      throw new DomainError("VALIDATION_FAILED", `"${name}" is already on the supplier list`);
    }

    return prisma.supplier.create({
      data: {
        name,
        contactName: clean(input.contactName),
        phone: clean(input.phone),
        email: clean(input.email),
        gstin: clean(input.gstin)?.toUpperCase() ?? null,
        address: clean(input.address),
        city: clean(input.city),
        state: clean(input.state),
        pincode: clean(input.pincode),
        notes: clean(input.notes),
        isActive: input.isActive ?? true,
      },
      select: SELECT,
    });
  }

  async update(id: string, input: Partial<SupplierInput>): Promise<SupplierView> {
    const name = input.name === undefined ? undefined : (clean(input.name) ?? undefined);
    if (input.name !== undefined && !name) {
      throw new DomainError("VALIDATION_FAILED", "A supplier needs a name");
    }

    return prisma.supplier.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(input.contactName !== undefined ? { contactName: clean(input.contactName) } : {}),
        ...(input.phone !== undefined ? { phone: clean(input.phone) } : {}),
        ...(input.email !== undefined ? { email: clean(input.email) } : {}),
        ...(input.gstin !== undefined
          ? { gstin: clean(input.gstin)?.toUpperCase() ?? null }
          : {}),
        ...(input.address !== undefined ? { address: clean(input.address) } : {}),
        ...(input.city !== undefined ? { city: clean(input.city) } : {}),
        ...(input.state !== undefined ? { state: clean(input.state) } : {}),
        ...(input.pincode !== undefined ? { pincode: clean(input.pincode) } : {}),
        ...(input.notes !== undefined ? { notes: clean(input.notes) } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      select: SELECT,
    });
  }

  /**
   * Retired rather than deleted.
   *
   * Past deliveries point at the supplier, and those records are what the
   * accounts are built from. Removing the row would either orphan them or
   * rewrite history, so a supplier no longer used is simply hidden from the
   * pickers.
   */
  async deactivate(id: string): Promise<SupplierView> {
    return prisma.supplier.update({
      where: { id },
      data: { isActive: false },
      select: SELECT,
    });
  }

  /**
   * What was received from each supplier in a window.
   *
   * One grouped query over the ledger rather than a query per supplier.
   * Lines with no cost recorded are counted separately instead of being
   * treated as free, so a partial total never reads as a complete one.
   */
  async spendBySupplier(range: { from: Date; to: Date }): Promise<SupplierSpend[]> {
    const rows = await prisma.inventoryMovement.findMany({
      where: {
        type: "RECEIVE",
        supplierId: { not: null },
        createdAt: { gte: range.from, lte: range.to },
      },
      select: {
        supplierId: true,
        quantity: true,
        unitCostCents: true,
        createdAt: true,
        supplier: { select: { name: true } },
      },
    });

    const totals = new Map<string, SupplierSpend>();

    for (const row of rows) {
      const id = row.supplierId!;
      const entry = totals.get(id) ?? {
        supplierId: id,
        supplierName: row.supplier?.name ?? "Unknown supplier",
        quantity: 0,
        spendCents: 0,
        linesMissingCost: 0,
        lastReceivedAt: null,
      };

      entry.quantity += row.quantity;
      if (row.unitCostCents === null) entry.linesMissingCost += 1;
      else entry.spendCents += row.unitCostCents * row.quantity;
      if (!entry.lastReceivedAt || row.createdAt > entry.lastReceivedAt) {
        entry.lastReceivedAt = row.createdAt;
      }

      totals.set(id, entry);
    }

    return [...totals.values()].sort((a, b) => b.spendCents - a.spendCents);
  }
}

export const supplierService = new SupplierService();
