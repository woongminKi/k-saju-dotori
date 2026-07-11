import type { CompatScore, CompatTier } from '@engine/compatibility';
import { tierTeaserEn } from '@engine/compatibility';
import { Card } from './ui/Card';

// Short badge label for the card — distinct from the engine's tierTeaserEn() sentence-length
// copy (used below). Exported so the share-card payload builder reuses the exact same English
// labels (share-cards.ts) instead of inventing a second set. Korean keys are the engine's
// CompatTier union; this is the one sanctioned place they appear in the web layer.
export const TIER_LABEL: Record<CompatTier, string> = {
  '천생연분': 'Soulmates',
  '좋음': 'Great match',
  '무난': 'Easygoing',
  '노력 필요': 'Takes some work',
};

export function CompatScoreCard({ score }: { score: CompatScore }) {
  return (
    <Card className="space-y-1 p-6 text-center">
      <div className="text-5xl font-bold text-acorn-dark">{score.score}</div>
      <div className="text-xs text-bark/60">out of 100</div>
      <div className="text-xl font-semibold text-bark">{TIER_LABEL[score.tier]}</div>
      <p className="text-sm text-bark/70">{tierTeaserEn(score.tier)}</p>
    </Card>
  );
}
