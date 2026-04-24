import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, serverError } from '@/lib/auth';
import { getGlobalStats, getGlobalDailyActivity, getUsersWithLicenseStatus } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const [summary, activity, allUsers] = await Promise.all([
      getGlobalStats(),
      getGlobalDailyActivity(),
      getUsersWithLicenseStatus()
    ]);
    
    const now = new Date();
    
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const expiringThisWeek = [];
    const expiringThisMonth = [];
    const newThisWeek = [];
    const newThisMonth = [];

    for (const u of allUsers) {
       const expiry = new Date(u.computed_expiry);
       const created = new Date(u.created_at);
       
       if (expiry >= now && expiry <= oneWeekFromNow) expiringThisWeek.push(u);
       if (expiry >= now && expiry <= oneMonthFromNow) expiringThisMonth.push(u);

       if (created >= oneWeekAgo) newThisWeek.push(u);
       if (created >= oneMonthAgo) newThisMonth.push(u);
    }
    
    return NextResponse.json({ 
       summary, 
       activity,
       detailedStats: {
         expiringThisWeek,
         expiringThisMonth,
         newThisWeek,
         newThisMonth
       }
    });
  } catch (err) {
    return serverError(err);
  }
}
