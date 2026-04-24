'use client';

/**
 * CreditGateModal
 * Pre-export confirmation that shows credit cost and current balance.
 * User must confirm before export proceeds.
 * Shows "Buy credits" CTA when balance is insufficient.
 */

import { Coins, X, Zap, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface Props {
  cost: number;
  balance: number;
  jobDescription: string; // e.g. "3 designs × 5 devices"
  onConfirm: () => void;
  onCancel: () => void;
}

export function CreditGateModal({ cost, balance, jobDescription, onConfirm, onCancel }: Props) {
  const canAfford = balance >= cost;
  const newBalance = balance - cost;
  const isLow = canAfford && newBalance < 20;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-gate-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div className="glass-card rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-border">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
              <Coins size={16} className="text-accent" aria-hidden="true" />
            </div>
            <h2 id="credit-gate-title" className="text-sm font-bold text-text-primary">
              Confirm Export
            </h2>
          </div>
          <button
            onClick={onCancel}
            aria-label="Cancel export"
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        {/* Job info */}
        <div className="bg-surface-hover rounded-xl p-3 mb-4 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-text-secondary">{jobDescription}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-muted">Credit cost</span>
            <span className="text-sm font-bold text-accent flex items-center gap-1">
              <Zap size={12} aria-hidden="true" />
              {cost} credit{cost !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="border-t border-border pt-2 flex items-center justify-between">
            <span className="text-[11px] text-text-muted">Your balance</span>
            <span className={`text-[11px] font-medium ${canAfford ? 'text-text-primary' : 'text-red-500'}`}>
              {balance} credits
            </span>
          </div>
          {canAfford && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-muted">After export</span>
              <span className={`text-[11px] font-medium ${isLow ? 'text-orange-500' : 'text-text-secondary'}`}>
                {newBalance} credits
              </span>
            </div>
          )}
        </div>

        {/* Insufficient balance warning */}
        {!canAfford && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
            <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[11px] text-red-600 dark:text-red-400">
              You need {cost - balance} more credit{cost - balance !== 1 ? 's' : ''} for this export.
            </p>
          </div>
        )}

        {/* Low balance warning */}
        {isLow && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 mb-4">
            <AlertTriangle size={14} className="text-orange-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[11px] text-orange-600 dark:text-orange-400">
              Running low on credits. You&apos;ll have {newBalance} left after this export.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-3 py-2 text-[11px] font-medium rounded-xl bg-surface-hover text-text-secondary hover:bg-border transition-colors"
          >
            Cancel
          </button>
          {canAfford ? (
            <Button
              onClick={onConfirm}
              size="sm"
              className="flex-1"
            >
              Export ({cost} credit{cost !== 1 ? 's' : ''})
            </Button>
          ) : (
            <Link href="/credits" className="flex-1">
              <Button size="sm" className="w-full bg-orange-500 hover:bg-orange-600">
                Buy Credits
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
