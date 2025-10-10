import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createFeedback } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { qrCode, feedbackText, deviceTime } = await request.json();

    // Validate input
    if (!qrCode || !feedbackText || !deviceTime) {
      return NextResponse.json(
        { error: 'QR code, feedback text, and device time are required' },
        { status: 400 }
      );
    }

    if (feedbackText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Feedback text cannot be empty' },
        { status: 400 }
      );
    }

    if (feedbackText.trim().length > 1000) {
      return NextResponse.json(
        { error: 'Feedback text is too long (maximum 1000 characters)' },
        { status: 400 }
      );
    }

    // Create feedback
    const result = await createFeedback(qrCode, feedbackText, user, deviceTime);

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback_id: result.feedback_id
    });

  } catch (error: any) {
    console.error('Create feedback error:', error);

    if (error.message === 'Sevak not found') {
      return NextResponse.json(
        { error: 'Invalid QR code. Sevak not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to submit feedback. Please try again.' },
      { status: 500 }
    );
  }
}