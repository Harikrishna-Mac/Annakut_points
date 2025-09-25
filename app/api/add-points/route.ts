import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { addPointsToSevak } from '@/lib/db';

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

    const { qrCode, points } = await request.json();
    
    // Validate input
    if (!qrCode || !points) {
      return NextResponse.json(
        { error: 'QR code and points are required' }, 
        { status: 400 }
      );
    }

    // Validate points value
    if (points !== 10) {
      return NextResponse.json(
        { error: 'Only 10 points can be added at a time' }, 
        { status: 400 }
      );
    }

    // Add points to sevak
    const result = await addPointsToSevak(
      qrCode, 
      points, 
      userId, 
      `Points added by inspector via QR scan`
    );
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully added ${points} points`,
      previousPoints: result.previousPoints,
      newPoints: result.newPoints,
      pointsAdded: points
    });
    
  } catch (error: any) {
    console.error('Add points error:', error);
    
    if (error.message === 'Sevak not found') {
      return NextResponse.json(
        { error: 'Invalid QR code. Sevak not found.' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to add points. Please try again.' }, 
      { status: 500 }
    );
  }
}