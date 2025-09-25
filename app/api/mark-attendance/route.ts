import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { markAttendance } from '@/lib/db';

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

    const { qrCode } = await request.json();
    
    // Validate input
    if (!qrCode) {
      return NextResponse.json(
        { error: 'QR code is required' }, 
        { status: 400 }
      );
    }

    // Mark attendance for sevak
    const result = await markAttendance(qrCode, userId);
    
    return NextResponse.json({ 
      success: true, 
      message: `Attendance marked successfully`,
      previousPoints: result.previousPoints,
      newPoints: result.newPoints,
      pointsAwarded: result.pointsAwarded,
      isOnTime: result.isOnTime,
      checkInTime: result.checkInTime
    });
    
  } catch (error: any) {
    console.error('Mark attendance error:', error);
    
    if (error.message === 'Sevak not found') {
      return NextResponse.json(
        { error: 'Invalid QR code. Sevak not found.' }, 
        { status: 404 }
      );
    }

    if (error.message === 'Attendance already marked for today') {
      return NextResponse.json(
        { error: 'Attendance already marked for today.' }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to mark attendance. Please try again.' }, 
      { status: 500 }
    );
  }
}