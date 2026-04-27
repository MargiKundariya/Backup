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
    
    const startOfWeek = new Date();
    const day = startOfWeek.getDay();
    const diff = day === 0 ? 6 : day - 1; // Adjust to Monday
    startOfWeek.setDate(startOfWeek.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const expiringThisWeek = [];
    const expiringThisMonth = [];
    const newThisWeek = [];
    const newThisMonth = [];


    for (const u of allUsers) {
       const expiry = new Date(u.computed_expiry);
       const created = new Date(u.created_at);
       
       if (expiry >= now && expiry <= oneWeekFromNow) expiringThisWeek.push(u);
       if (expiry >= now && expiry <= oneMonthFromNow) expiringThisMonth.push(u);

       if (created >= startOfWeek) newThisWeek.push(u);
       if (created >= startOfMonth) newThisMonth.push(u);

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
