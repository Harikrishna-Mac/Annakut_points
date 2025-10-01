import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createSevak } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';

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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' }, 
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload CSV or Excel file.' }, 
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum 5MB allowed.' }, 
        { status: 400 }
      );
    }

    // Read file content
    let fileContent: string;
    
    try {
      fileContent = await file.text();
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to read file. Please ensure it is a valid text file.' }, 
        { status: 400 }
      );
    }
    
    if (!fileContent || fileContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'File is empty or invalid' }, 
        { status: 400 }
      );
    }

    // Parse CSV data
    const lines = fileContent
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (lines.length === 0) {
      return NextResponse.json(
        { error: 'No valid data found in file' }, 
        { status: 400 }
      );
    }

    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('name') || firstLine.includes('sevak');
    const dataLines = hasHeader ? lines.slice(1) : lines;
    
    if (dataLines.length === 0) {
      return NextResponse.json(
        { error: 'No data rows found. Please check your file format.' }, 
        { status: 400 }
      );
    }

    if (dataLines.length > 100) {
      return NextResponse.json(
        { error: 'Too many rows. Maximum 100 sevaks can be uploaded at once.' }, 
        { status: 400 }
      );
    }

    // Capture device time once for the bulk upload
    const deviceTime = new Date().toISOString();

    const results = {
      created: [] as any[],
      failed: [] as any[],
      createdCount: 0,
      failedCount: 0
    };

    // Process each line
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const rowNumber = i + (hasHeader ? 2 : 1);
      
      try {
        let name: string;
        
        if (line.includes(',')) {
          name = line.split(',')[0]?.trim().replace(/"/g, '').replace(/'/g, '');
        } else {
          name = line.trim().replace(/"/g, '').replace(/'/g, '');
        }
        
        // Validate name
        if (!name || name.length < 2) {
          results.failed.push({
            row: rowNumber,
            name: name || 'Empty',
            error: 'Name too short (minimum 2 characters)'
          });
          results.failedCount++;
          continue;
        }

        if (name.length > 100) {
          results.failed.push({
            row: rowNumber,
            name: name.substring(0, 20) + '...',
            error: 'Name too long (maximum 100 characters)'
          });
          results.failedCount++;
          continue;
        }

        if (!/^[a-zA-Z\s\u0900-\u097F.-]+$/.test(name)) {
          results.failed.push({
            row: rowNumber,
            name: name.substring(0, 20),
            error: 'Name contains invalid characters'
          });
          results.failedCount++;
          continue;
        }

        // Create sevak with device time
        const sevak = await createSevak(name, user, deviceTime);
        
        results.created.push({
          row: rowNumber,
          sevak_id: sevak.sevak_id,
          name: sevak.name,
          points: sevak.points
        });
        results.createdCount++;
        
      } catch (error: any) {
        console.error(`Error creating sevak for row ${rowNumber}:`, error);
        
        results.failed.push({
          row: rowNumber,
          name: line.substring(0, 20) + (line.length > 20 ? '...' : ''),
          error: error.message || 'Database error'
        });
        results.failedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Bulk upload completed: ${results.createdCount} created, ${results.failedCount} failed`,
      createdCount: results.createdCount,
      failedCount: results.failedCount,
      details: {
        created: results.created,
        failed: results.failed
      }
    });
    
  } catch (error: any) {
    console.error('Bulk create sevaks error:', error);
    
    return NextResponse.json(
      { 
        error: 'Server error during bulk upload. Please try again.',
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}