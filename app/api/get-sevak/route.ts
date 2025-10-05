import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getSevakById } from '@/lib/db';

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

    if (!sevakId) {
      return NextResponse.json(
        { error: 'Sevak ID is required' },
        { status: 400 }
      );
    }

    const sevak = await getSevakById(sevakId);
    
    if (!sevak) {
      return NextResponse.json(
        { error: 'Sevak not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      sevak
    });
  } catch (error: any) {
    console.error('Get sevak error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sevak' },
      { status: 500 }
    );
  }
}