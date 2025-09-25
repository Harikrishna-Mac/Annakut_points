import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { deleteSevak } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { sevakId } = await request.json();

    // Validate input
    // if (!sevakId || isNaN(Number(sevakId))) {
    //   return NextResponse.json(
    //     { error: 'Valid sevakId is required' },
    //     { status: 400 }
    //   );
    // }

    // Delete the sevak (soft delete recommended)
    await deleteSevak(String(sevakId));

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
