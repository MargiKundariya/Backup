'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getBrowserClient, isSupabaseConfigured } from '@/lib/supabase';
import { useCredits, CreditHistoryRow } from '@/hooks/useCredits';
import { useSubscription } from '@/hooks/useSubscription';
import { CREDIT_PACKS, SUBSCRIPTION_PLANS, formatPrice } from '@/lib/stripe';
import {
  Coins, Zap, ArrowLeft, CheckCircle, Clock,
  TrendingDown, TrendingUp, RefreshCw, Star, X,
} from 'lucide-react';

type Tab = 'plans' | 'packs';

function CreditsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { balance, history, loading, refresh } = useCredits();
  const { subscription, isActive } = useSubscription();
  const [tab, setTab] = useState<Tab>('plans');
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      setSuccessMessage('Payment successful! Your credits will appear shortly.');
      const timer = setTimeout(() => refresh(), 2000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, refresh]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const sb = getBrowserClient();
    sb.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
    });
  }, [router]);

  const callStripe = async (url: string, body: object): Promise<{ url?: string; error?: string } | null> => {
    try {
      const sb = getBrowserClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.push('/login'); return null; }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (res.status === 503) { alert('Stripe payments are not yet configured. Check back soon!'); return null; }
      if (!res.ok) { alert(data.error ?? 'Something went wrong'); return null; }
      return data;
    } catch { alert('Network error — please try again'); return null; }
  };

  const handleSubscribe = async (planId: string) => {
    setPurchasing(planId);
    const data = await callStripe('/api/stripe/subscription', { planId });
    if (data?.url) window.location.href = data.url;
    setPurchasing(null);
  };

  const handlePurchasePack = async (packId: string) => {
    setPurchasing(packId);
    const data = await callStripe('/api/stripe/checkout', { packId });
    if (data?.url) window.location.href = data.url;
    setPurchasing(null);
  };

  const handleCancel = async () => {
    if (!confirm('Cancel your subscription? You keep access until the end of the billing period.')) return;
    setCanceling(true);
    try {
      const sb = getBrowserClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return;
      await fetch('/api/stripe/subscription', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      refresh();
    } catch { alert('Could not cancel — please try again'); }
    setCanceling(false);
  };

  const trialRow = history.find((r) => r.type === 'trial');
  const trialExpiry = trialRow?.expires_at ? new Date(trialRow.expires_at) : null;
  const trialDaysLeft = trialExpiry
    ? Math.max(0, Math.ceil((trialExpiry.getTime() - Date.now()) / 86400000))
    : null;

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : null;

  return (
    <div className="min-h-screen bg-canvas-bg">
      {/* Header */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" aria-label="Back to editor" className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors">
            <ArrowLeft size={16} aria-hidden="true" />
          </Link>
          <div className="flex items-center gap-2">
            <Coins size={18} className="text-accent" aria-hidden="true" />
            <h1 className="text-sm font-bold text-text-primary">Credits & Plans</h1>
          </div>
          <button onClick={refresh} aria-label="Refresh" className="ml-auto p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Success banner */}
        {successMessage && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <CheckCircle size={16} className="text-green-600 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        )}

        {/* Balance + active plan row */}
        <div className="glass-card rounded-2xl p-5 flex items-center gap-6">
          <div>
            <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">Balance</p>
            <div className="flex items-end gap-1.5">
              <span className="text-3xl font-bold text-text-primary">{loading ? '…' : balance}</span>
              <span className="text-sm text-text-muted mb-0.5">credits</span>
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">1 export = 1 credit</p>
          </div>

          <div className="w-px h-12 bg-border self-center" />

          <div className="flex-1">
            {isActive ? (
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Star size={12} className="text-accent fill-accent" aria-hidden="true" />
                  <p className="text-[11px] font-bold text-accent">Pro Plan active</p>
                </div>
                <p className="text-[10px] text-text-muted">
                  {subscription?.cancel_at_period_end
                    ? `Cancels on ${periodEnd}`
                    : `Renews ${periodEnd} · 1,000 credits/mo`}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-[11px] font-medium text-text-secondary mb-0.5">No active plan</p>
                {trialDaysLeft !== null && trialDaysLeft > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                    <Clock size={10} aria-hidden="true" />
                    Trial: {trialDaysLeft}d left
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-surface-hover rounded-xl w-fit">
          {(['plans', 'packs'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-200 capitalize ${
                tab === t ? 'bg-surface text-accent shadow-sm' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {t === 'plans' ? '📅 Monthly Plan' : '🪙 Credit Packs'}
            </button>
          ))}
        </div>

        {/* ── Plans tab ─────────────────────────────────────────────────────── */}
        {tab === 'plans' && (
          <section className="space-y-4">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <div
                key={plan.id}
                className="glass-card rounded-2xl border-2 border-accent overflow-hidden"
              >
                {/* Popular ribbon */}
                <div className="bg-accent px-4 py-1.5 flex items-center gap-2">
                  <Star size={12} className="text-white fill-white" aria-hidden="true" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">Best value for active vendors</span>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h2 className="text-xl font-bold text-text-primary">{plan.name}</h2>
                      <p className="text-[11px] text-text-muted mt-0.5">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-accent">{formatPrice(plan.price)}</p>
                      <p className="text-[10px] text-text-muted">/month</p>
                    </div>
                  </div>

                  {/* Feature list */}
                  <ul className="space-y-1.5 mb-4">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-[11px] text-text-secondary">
                        <CheckCircle size={12} className="text-green-500 flex-shrink-0" aria-hidden="true" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA or active state */}
                  {isActive ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                        <CheckCircle size={14} className="text-green-600" aria-hidden="true" />
                        <span className="text-[11px] font-medium text-green-700">
                          {subscription?.cancel_at_period_end ? `Active until ${periodEnd}` : 'Active — auto-renews monthly'}
                        </span>
                      </div>
                      {!subscription?.cancel_at_period_end && (
                        <button
                          onClick={handleCancel}
                          disabled={canceling}
                          className="flex items-center gap-1 text-[10px] text-text-muted hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          <X size={10} aria-hidden="true" />
                          {canceling ? 'Canceling…' : 'Cancel subscription'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={purchasing === plan.id}
                      className="w-full py-2.5 rounded-xl text-[13px] font-bold bg-accent text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {purchasing === plan.id ? 'Redirecting to Stripe…' : `Subscribe for ${formatPrice(plan.price)}/mo`}
                    </button>
                  )}
                </div>
              </div>
            ))}

            <p className="text-[10px] text-text-muted text-center">
              Cancel any time. Credits granted immediately on first payment and each renewal.
            </p>
          </section>
        )}

        {/* ── Credit packs tab ──────────────────────────────────────────────── */}
        {tab === 'packs' && (
          <section className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CREDIT_PACKS.map((pack) => (
                <div
                  key={pack.id}
                  className={`glass-card rounded-2xl p-4 border-2 transition-all ${
                    pack.popular ? 'border-accent' : 'border-transparent hover:border-border'
                  }`}
                >
                  {pack.popular && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-accent uppercase tracking-wider mb-2">
                      <Zap size={10} aria-hidden="true" />
                      Most popular
                    </span>
                  )}
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-text-primary">{pack.name}</span>
                    <span className="text-lg font-bold text-accent">{formatPrice(pack.price)}</span>
                  </div>
                  <p className="text-sm text-text-secondary mb-0.5">{pack.credits.toLocaleString()} credits</p>
                  <p className="text-[11px] text-text-muted mb-3">{pack.perCredit} per export</p>
                  <button
                    onClick={() => handlePurchasePack(pack.id)}
                    disabled={purchasing === pack.id}
                    className={`w-full py-2 rounded-xl text-[12px] font-medium transition-all ${
                      pack.popular ? 'bg-accent text-white hover:bg-accent-hover' : 'bg-surface-hover text-text-primary hover:bg-border'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {purchasing === pack.id ? 'Redirecting…' : `Buy ${pack.name}`}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-text-muted text-center">
              One-time purchase. Credits never expire.
            </p>
          </section>
        )}

        {/* Credit history */}
        {history.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-text-primary mb-3">History</h2>
            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 text-text-muted font-medium">Type</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium">Credits</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium hidden sm:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row: CreditHistoryRow) => (
                    <tr key={row.id} className="border-b border-border/50 last:border-0 hover:bg-surface-hover transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {row.amount > 0
                            ? <TrendingUp size={12} className="text-green-500 flex-shrink-0" />
                            : <TrendingDown size={12} className="text-red-500 flex-shrink-0" />}
                          <span className="capitalize text-text-secondary">{row.type}</span>
                        </div>
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono font-medium ${row.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {row.amount > 0 ? '+' : ''}{row.amount}
                      </td>
                      <td className="px-4 py-2.5 text-right text-text-muted hidden sm:table-cell">
                        {new Date(row.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default function CreditsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-canvas-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CreditsContent />
    </Suspense>
  );
}
