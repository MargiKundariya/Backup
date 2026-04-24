'use client';

/**
 * useOnboarding
 * Drives a 3-step first-use guided tour.
 *
 * Steps:
 *   0 — Pick a device  (shown until selectedDevice is set OR user clicks Next)
 *   1 — Upload artwork (shown until a zone has a designImage OR user clicks Next)
 *   2 — Export         (shown until first export completes OR user clicks Next)
 *   done — hidden forever (localStorage flag)
 *
 * The user can either do the action (auto-advance) or click Next to skip forward.
 */

import { useState, useEffect } from 'react';
import { useEditorStore } from '@/lib/store';

const LS_KEY = 'skinmockup_onboarding_complete';

export type OnboardingStep = 0 | 1 | 2 | 'done';

export interface OnboardingState {
  step: OnboardingStep;
  /** Advance to the next step manually (Next button) */
  next: () => void;
  /** Call this after the first successful export */
  complete: () => void;
  /** Dismiss permanently without completing */
  dismiss: () => void;
}

export function useOnboarding(): OnboardingState {
  const selectedDevice = useEditorStore((s) => s.selectedDevice);
  const zoneDesigns = useEditorStore((s) => s.zoneDesigns);

  const [step, setStep] = useState<OnboardingStep>('done'); // start hidden until LS check

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const done = localStorage.getItem(LS_KEY) === '1';
    if (!done) setStep(0);
  }, []);

  // Auto-advance when the user completes the action for the current step
  useEffect(() => {
    if (step === 'done') return;

    if (step === 0 && selectedDevice) {
      setStep(1);
      return;
    }

    if (step === 1) {
      const hasImage = Object.values(zoneDesigns).some((z) => z.designImage);
      if (hasImage) setStep(2);
    }
  }, [selectedDevice, zoneDesigns, step]);

  const finish = () => {
    localStorage.setItem(LS_KEY, '1');
    setStep('done');
  };

  const next = () => {
    setStep((prev) => {
      if (prev === 0) return 1;
      if (prev === 1) return 2;
      // step 2 Next = finish
      finish();
      return 'done';
    });
  };

  return { step, next, complete: finish, dismiss: finish };
}
