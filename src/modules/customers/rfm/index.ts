/**
 * RFM analysis — the customers module's public entry point for segmentation.
 *
 * Everything outside this module imports from here, so the scoring rules and
 * the query that feeds them can be replaced (by an HTTP client, say, once
 * this module travels) without touching a single screen.
 */

export { loadRfmFacts } from "./rfm-repository";
export { buildRfmBoard, quintileScores, segmentFor } from "./rfm-scoring";
export { RFM_SEGMENTS, segmentLabel } from "./rfm-labels";
export type {
  RfmBoard,
  RfmCustomer,
  RfmFacts,
  RfmScore,
  RfmSegment,
  RfmSegmentSummary,
} from "./rfm-types";
