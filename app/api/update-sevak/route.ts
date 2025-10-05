import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { updateSevak } from '@/lib/db';

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

    const { sevakId, name, gender, deviceTime } = await request.json();
    
    if (!sevakId || !name || !gender || !deviceTime) {
      return NextResponse.json(
        { error: 'All fields are required' }, 
        { status: 400 }
      );
    }

    if (!['male', 'female'].includes(gender)) {
      return NextResponse.json(
        { error: 'Invalid gender' }, 
        { status: 400 }
      );
    }

    const success = await updateSevak(sevakId, name, gender, deviceTime);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Sevak not found' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Sevak updated successfully' 
    });
    
  } catch (error: any) {
    console.error('Update sevak error:', error);
    return NextResponse.json(
      { error: 'Failed to update sevak' }, 
      { status: 500 }
    );
  }
}