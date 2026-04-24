import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, serverError } from '@/lib/auth';
import { getLicensesExpiringInRange } from '@/lib/db';
import { sendWhatsAppMessage, formatExpiryReminder } from '@/lib/whatsapp';

/**
 * API route to check for licenses expiring in 3-4 days and send WhatsApp reminders.
 * This should ideally be called by a daily CRON job.
 */
export async function POST(req: NextRequest) {
  try {
    // Check for Vercel Cron Header or Admin Session
    const authHeader = req.headers.get('authorization');
    const isCron = req.headers.get('x-vercel-cron') === '1' || authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isCron) {
      await requireAdmin(req);
    }

    // Find licenses expiring between 3 and 4 days from now
    const expiringSoon = await getLicensesExpiringInRange(3, 4);

    const results = [];

    for (const info of expiringSoon) {
      if (info.user_phone) {
        // Calculate days left for the message
        const expiryDate = new Date(info.expires_at);
        const today = new Date();
        const diffTime = Math.abs(expiryDate.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const message = formatExpiryReminder(
          info.user_name || 'Valued User',
          diffDays,
          info.expires_at
        );

        const success = await sendWhatsAppMessage({
          to: info.user_phone,
          message
        });

        results.push({
          userId: info.user_id,
          phone: info.user_phone,
          success
        });
      }
    }

    return NextResponse.json({
      processedCount: expiringSoon.length,
      details: results
    });

  } catch (err) {
    console.error('[Notification API Error]', err);
    return serverError(err);
  }
}
