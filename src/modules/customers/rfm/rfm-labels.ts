import type { RfmSegment } from "./rfm-types";

/**
 * What each segment means and what to do about it.
 *
 * The action is part of the definition, not decoration. A segment nobody
 * knows how to act on is a label, and the shop gains nothing from knowing
 * that eleven customers are "hibernating" if that implies no next step.
 */
export const RFM_SEGMENTS: {
  id: RfmSegment;
  name: string;
  meaning: string;
  action: string;
  /** Rough priority for the owner's attention. 1 is most urgent. */
  priority: number;
  tone: "good" | "watch" | "risk";
}[] = [
  {
    id: "CHAMPIONS",
    name: "Champions",
    meaning: "Bought recently, buy often, and spend the most.",
    action: "Give them first sight of new pieces and private viewings.",
    priority: 2,
    tone: "good",
  },
  {
    id: "CANNOT_LOSE",
    name: "Cannot lose",
    meaning: "Were among the best customers, and have gone quiet.",
    action: "Call personally. Do not send an email — these warrant a voice.",
    priority: 1,
    tone: "risk",
  },
  {
    id: "AT_RISK",
    name: "At risk",
    meaning: "Bought regularly once, but not for a long while.",
    action: "Reach out with something specific to what they bought before.",
    priority: 3,
    tone: "risk",
  },
  {
    id: "LOYAL",
    name: "Loyal",
    meaning: "Buy consistently, though not always the largest orders.",
    action: "Reward the habit — early access, or a thank-you on the next piece.",
    priority: 4,
    tone: "good",
  },
  {
    id: "POTENTIAL_LOYALIST",
    name: "Potential loyalist",
    meaning: "Recent buyers who have come back more than once.",
    action: "A second good experience turns these into loyal customers.",
    priority: 5,
    tone: "good",
  },
  {
    id: "NEW",
    name: "New",
    meaning: "Bought for the first time, very recently.",
    action: "Follow up on the first purchase while it is still fresh.",
    priority: 6,
    tone: "watch",
  },
  {
    id: "PROMISING",
    name: "Promising",
    meaning: "Bought once, fairly recently.",
    action: "Invite them back before the first purchase is forgotten.",
    priority: 7,
    tone: "watch",
  },
  {
    id: "NEEDS_ATTENTION",
    name: "Needs attention",
    meaning: "Used to buy often; the gap is starting to lengthen.",
    action: "Act now, while they are only drifting rather than gone.",
    priority: 8,
    tone: "watch",
  },
  {
    id: "ABOUT_TO_SLEEP",
    name: "About to sleep",
    meaning: "Neither recent nor frequent, and fading.",
    action: "One well-judged approach; do not spend much to reach them.",
    priority: 9,
    tone: "watch",
  },
  {
    id: "HIBERNATING",
    name: "Hibernating",
    meaning: "Long since bought, and not often when they did.",
    action: "Include in broad campaigns only.",
    priority: 10,
    tone: "risk",
  },
  {
    id: "LOST",
    name: "Lost",
    meaning: "One purchase, a long time ago.",
    action: "Leave them be unless a campaign costs nothing to extend.",
    priority: 11,
    tone: "risk",
  },
];

const BY_ID = new Map(RFM_SEGMENTS.map((s) => [s.id, s]));

export function segmentLabel(segment: RfmSegment) {
  return BY_ID.get(segment)!;
}
