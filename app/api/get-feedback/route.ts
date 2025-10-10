import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getFeedbackBySevaks, getFeedbackForSevak, getFeedbackStats } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sevakId = searchParams.get('sevakId');
    const gender = searchParams.get('gender') as 'male' | 'female' | null;
    const statsOnly = searchParams.get('stats') === 'true';

    // Get statistics only
    if (statsOnly) {
      const stats = await getFeedbackStats();
      return NextResponse.json({
        success: true,
        stats
      });
    }

    // Get feedback for specific sevak
    if (sevakId) {
      const feedback = await getFeedbackForSevak(sevakId);
      return NextResponse.json({
        success: true,
        feedback
      });
    }

    // Get all sevaks with feedback (grouped)
    const sevaksWithFeedback = await getFeedbackBySevaks(gender || undefined);
    
    return NextResponse.json({
      success: true,
      sevaks: sevaksWithFeedback,
      totalCount: sevaksWithFeedback.length,
      gender: gender || 'all'
    });

  } catch (error: any) {
    console.error('Get feedback error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback. Please try again.' },
      { status: 500 }
    );
  }
}