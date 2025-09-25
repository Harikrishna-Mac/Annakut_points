import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // Get leaderboard data
    const sevaks = await getLeaderboard();
    
    return NextResponse.json({ 
      success: true, 
      sevaks: sevaks,
      totalCount: sevaks.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Get leaderboard error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard. Please try again.' }, 
      { status: 500 }
    );
  }
}