import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getInspectorActivity, getTransactionsByInspector } from '@/lib/db';

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
    const inspectorEmail = searchParams.get('inspectorEmail');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (inspectorEmail) {
      // Get detailed transactions for specific inspector
      const transactions = await getTransactionsByInspector(
        inspectorEmail, 
        startDate || undefined, 
        endDate || undefined
      );
      
      return NextResponse.json({
        success: true,
        transactions
      });
    } else {
      // Get summary of all inspector activities
      const activities = await getInspectorActivity(
        startDate || undefined,
        endDate || undefined
      );
      
      return NextResponse.json({
        success: true,
        activities
      });
    }
  } catch (error: any) {
    console.error('Inspector activity error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inspector activity' },
      { status: 500 }
    );
  }
}