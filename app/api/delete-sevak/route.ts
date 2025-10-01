import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { deleteSevak } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { sevakId, deviceTime } = await request.json();

    // Validate input
    if (!sevakId) {
      return NextResponse.json(
        { error: 'Sevak ID is required' },
        { status: 400 }
      );
    }

    if (!deviceTime) {
      return NextResponse.json(
        { error: 'Device time is required' },
        { status: 400 }
      );
    }

    // Delete the sevak with device time
    await deleteSevak(sevakId, deviceTime);

    return NextResponse.json({
      success: true,
      message: `Sevak with ID ${sevakId} deleted successfully`
    });
  } catch (error: any) {
    console.error('Delete sevak error:', error);

    return NextResponse.json(
      { error: 'Failed to delete sevak. Please try again.' },
      { status: 500 }
    );
  }
}