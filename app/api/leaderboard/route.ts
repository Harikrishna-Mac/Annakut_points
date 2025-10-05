import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // Get gender filter from query parameters
    const { searchParams } = new URL(request.url);
    const gender = searchParams.get('gender') as 'male' | 'female' | null;

    // Get leaderboard data with optional gender filter
    const sevaks = await getLeaderboard(gender || undefined);
    
    return NextResponse.json({ 
      success: true, 
      sevaks: sevaks,
      totalCount: sevaks.length,
      gender: gender || 'all',
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