import { CheckCircle2, CircleDashed, HelpCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { BadgeTone } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { supportLevels } from '@/styles/tokens';
import type { SupportLevel } from '@/types/contracts';

/**
 * A distinct icon AND the text label per level — confidence is never color-only (spec §24).
 * The border style is a third, fully non-chromatic cue: solid reads as settled, dashed as
 * provisional, dotted as barely there.
 */
const presentation: Record<SupportLevel, { icon: LucideIcon; tone: BadgeTone; edge: string }> = {
  strongly_supported: { icon: CheckCircle2, tone: 'teal', edge: 'border-solid' },
  plausible: { icon: CircleDashed, tone: 'amber', edge: 'border-dashed' },
  speculative: { icon: HelpCircle, tone: 'slate', edge: 'border-dotted' },
};

export function ConfidenceBadge({
  support,
  className,
}: {
  support: SupportLevel;
  className?: string;
}): JSX.Element {
  const { icon, tone, edge } = presentation[support];
  // Labels come from the token file so wording stays in one place.
  const { label } = supportLevels[support];

  return (
    <Badge tone={tone} icon={icon} size="sm" className={cn(edge, className)}>
      <span className="sr-only">Support level: </span>
      {label}
    </Badge>
  );
}
