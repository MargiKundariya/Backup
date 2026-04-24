'use client';

/**
 * OnboardingTip — Interactive guided tour overlay
 *
 * Step 0: Points LEFT → "Pick a device from the sidebar"
 * Step 1: Points LEFT → "Upload your artwork"
 * Step 2: Points LEFT → "Export your mockup"
 *
 * Has Next button (manual advance) + Skip (dismiss forever).
 * Auto-advances when the user completes the action.
 */

import { X, ArrowLeft, ChevronRight } from 'lucide-react';
import type { OnboardingStep } from '@/hooks/useOnboarding';

interface Props {
  step: OnboardingStep;
  onNext: () => void;
  onDismiss: () => void;
}

interface StepConfig {
  emoji: string;
  title: string;
  body: string;
  cta: string;        // Next button label
  /** Vertical % from top of viewport where the pointer tip sits */
  arrowY: string;
}

const STEPS: Record<0 | 1 | 2, StepConfig> = {
  0: {
    emoji: '📱',
    title: 'Step 1 of 3 — Pick a device',
    body: 'Choose a phone, tablet, laptop or watch from the Device section on the left sidebar.',
    cta: 'Got it →',
    arrowY: '28%',
  },
  1: {
    emoji: '🎨',
    title: 'Step 2 of 3 — Upload your artwork',
    body: 'Drop your design PNG or JPEG into the Design section. It will snap onto the device.',
    cta: 'Next →',
    arrowY: '50%',
  },
  2: {
    emoji: '⬇️',
    title: 'Step 3 of 3 — Export your mockup',
    body: 'Hit Export in the Export section to download your store-ready product image.',
    cta: 'Done ✓',
    arrowY: '72%',
  },
};

export function OnboardingTip({ step, onNext, onDismiss }: Props) {
  if (step === 'done') return null;

  const tip = STEPS[step];

  return (
    <>
      {/* Semi-transparent backdrop — click to dismiss */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={onDismiss}
        aria-hidden="true"
      />

      {/* Arrow pointing left toward the sidebar — vertically positioned per step */}
      <div
        aria-hidden="true"
        className="fixed left-[285px] z-50 pointer-events-none"
        style={{ top: tip.arrowY, transform: 'translateY(-50%)' }}
      >
        {/* Arrow shaft */}
        <div className="flex items-center gap-0">
          <div className="w-8 h-0.5 bg-accent" />
          {/* Arrowhead pointing LEFT */}
          <ArrowLeft
            size={18}
            className="text-accent -ml-4 flex-shrink-0"
            strokeWidth={2.5}
          />
        </div>
        {/* Pulsing dot at sidebar edge */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
          </span>
        </div>
      </div>

      {/* Tour card — anchored near centre-right so it doesn't cover the sidebar */}
      <div
        role="dialog"
        aria-modal="false"
        aria-label="Getting started guide"
        aria-live="polite"
        className="fixed z-50 pointer-events-auto"
        style={{
          left: '320px',
          top: tip.arrowY,
          transform: 'translateY(-50%)',
        }}
      >
        <div className="glass-card rounded-2xl shadow-2xl border border-accent/30 w-72 overflow-hidden">
          {/* Accent top bar */}
          <div className="h-1 bg-gradient-to-r from-accent to-accent/50" />

          <div className="px-4 py-4">
            {/* Header row */}
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl leading-none flex-shrink-0" aria-hidden="true">
                {tip.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-accent leading-tight">{tip.title}</p>
                <p className="text-[11px] text-text-secondary leading-relaxed mt-1">{tip.body}</p>
              </div>
              <button
                onClick={onDismiss}
                aria-label="Skip onboarding"
                title="Skip guide"
                className="flex-shrink-0 p-1 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-surface-hover -mt-0.5"
              >
                <X size={12} aria-hidden="true" />
              </button>
            </div>

            {/* Footer: step dots + Next button */}
            <div className="flex items-center justify-between">
              {/* Step dots */}
              <div className="flex items-center gap-1.5">
                {([0, 1, 2] as const).map((s) => (
                  <div
                    key={s}
                    className={
                      s === step
                        ? 'w-4 h-1.5 rounded-full bg-accent transition-all duration-300'
                        : 'w-1.5 h-1.5 rounded-full bg-text-muted/40 transition-all duration-300'
                    }
                  />
                ))}
              </div>

              {/* Next button */}
              <button
                onClick={onNext}
                className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-accent text-white hover:bg-accent-hover active:scale-95 transition-all duration-150"
              >
                {tip.cta}
                {step < 2 && <ChevronRight size={11} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
