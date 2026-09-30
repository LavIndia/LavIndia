/**
 * Promotions module — public surface.
 *
 * Other modules import from `@/modules/promotions` and nothing deeper. The
 * engine is pure and framework-free; this module never imports Marketing,
 * so it can be sold on its own.
 */
export type {
  AppliedPromotion,
  Benefit,
  BenefitType,
  Channel,
  Condition,
  EngineContext,
  EngineLine,
  EnginePromotion,
  Evaluation,
  Nudge,
  PaymentInstrument,
  PieceFilter,
  PromotionClass,
  RejectedPromotion,
  RewardValue,
  Selector,
} from "./contracts";
export { classOf } from "./contracts";
export { evaluatePromotions } from "./engine/evaluate";
export { matchesFilter } from "./engine/units";
export {
  benefitSchema,
  conditionSchema,
  pieceFilterSchema,
  promotionInputSchema,
  selectorSchema,
  type PromotionInput,
} from "./schema";
export { PROMOTION_TEMPLATES, templateById, type EditorCard, type PromotionTemplate } from "./templates";
export {
  describeBenefit,
  describeCondition,
  describePieces,
  headline,
  paymentLabel,
  percent,
  rupees,
  type NameLookup,
} from "./summarise";
export {
  labelOf,
  statusOf,
  inputToEngine,
  toEnginePromotion,
  type PromotionRow,
  type PromotionStatus,
} from "./mapping";
export {
  PROMOTION_INCLUDE,
  countOrderRedemption,
  customerFacts,
  findActivePromotionRows,
  recordRedemption,
  releaseOrderRedemption,
  toEnginePromotions,
  withinCustomerLimits,
  type CustomerFacts,
} from "./repository";
export {
  changeLifecycle,
  checkPromotion,
  createPromotion,
  deletePromotion,
  duplicatePromotion,
  getPromotion,
  listPromotions,
  toInput,
  updatePromotion,
  type LifecycleAction,
} from "./promotion-service";
export type { ValidationResult } from "./validate";
export { loadCatalogFacts, pieceAsLine, type CatalogFacts, type PieceFact } from "./read/catalog-facts";
export {
  ALL_PIECES_ID,
  buildSetLibrary,
  categorySetId,
  collectionSetId,
  createPieceSet,
  deletePieceSet,
  isBuiltInSet,
  loadSetLibrarySource,
  resolvePieces,
  resolvePromotion,
  setIdsOf,
  setUsage,
  updatePieceSet,
  type SetLibrary,
  type SetLibrarySource,
} from "./piece-sets";
export { inPieceSet } from "./engine/units";
export { pieceRuleSchema, pieceSetInputSchema, type PieceSetInput } from "./schema";
export type { PieceField, PieceRule, ResolvedPieceSet } from "./contracts";
