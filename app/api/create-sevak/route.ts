import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createSevak } from '@/lib/db';

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

    const { name } = await request.json();
    
    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Valid name is required' }, 
        { status: 400 }
      );
    }

    // Validate name length
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters long' }, 
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Name must be less than 100 characters' }, 
        { status: 400 }
      );
    }

    // Create new sevak
    const sevak = await createSevak(name.trim(), userId);
    
    return NextResponse.json({ 
      success: true, 
      message: `Sevak created successfully`,
      sevak: {
        id: sevak.id,
        sevak_id: sevak.sevak_id,
        name: sevak.name,
        points: sevak.points,
        created_at: sevak.created_at
      }
    });
    
  } catch (error: any) {
    console.error('Create sevak error:', error);
    
    // Handle duplicate name error (if you add unique constraint later)
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'A sevak with this name already exists' }, 
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create sevak. Please try again.' }, 
      { status: 500 }
    );
  }
}