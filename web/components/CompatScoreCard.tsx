import type { CompatScore, CompatTier } from '@engine/compatibility';
import { Card } from './ui/Card';

// The engine's tier is a fixed 4-value enum (Korean-labelled). Map it to English UI copy here —
// there's no English tier-teaser in the engine yet (that's Phase 6), so these labels live in the
// web layer for now.
const TIER_LABEL: Record<CompatTier, string> = {
  '천생연분': 'Soulmates',
  '좋음': 'Great match',
  '무난': 'Easygoing',
  '노력 필요': 'Takes some work',
};

const TIER_TEASER: Record<CompatTier, string> = {
  '천생연분': 'Okay, the acorns are basically writing your wedding vows.',
  '좋음': 'Strong chemistry — this one has real staying power.',
  '무난': 'Comfy and low-drama. A little effort makes it shine.',
  '노력 필요': "Sparks are there, but it'll ask for patience from you both.",
};

export function CompatScoreCard({ score }: { score: CompatScore }) {
  return (
    <Card className="space-y-1 p-6 text-center">
      <div className="text-5xl font-bold text-acorn-dark">{score.score}</div>
      <div className="text-xs text-bark/60">out of 100</div>
      <div className="text-xl font-semibold text-bark">{TIER_LABEL[score.tier]}</div>
      <p className="text-sm text-bark/70">{TIER_TEASER[score.tier]}</p>
    </Card>
  );
}
