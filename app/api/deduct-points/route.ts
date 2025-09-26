import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { deductPointsFromSevak } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { qrCode, points } = await request.json();
    if (!qrCode || !points) {
      return NextResponse.json({ error: 'QR code and points are required' }, { status: 400 });
    }

    if (points !== 10) {
      return NextResponse.json({ error: 'Only 10 points can be deducted at a time' }, { status: 400 });
    }

    const result = await deductPointsFromSevak(
      qrCode,
      points,
      userId,
      `Points deducted by inspector via QR scan`
    );

    return NextResponse.json({
      success: true,
      message: `Successfully deducted ${points} points`,
      previousPoints: result.previousPoints,
      newPoints: result.newPoints,
      pointsDeducted: points
    });
  } catch (error: any) {
    console.error('Deduct points error:', error);

    if (error.message === 'Sevak not found') {
      return NextResponse.json({ error: 'Invalid QR code. Sevak not found.' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to deduct points. Please try again.' }, { status: 500 });
  }
}
