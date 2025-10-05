// app/api/bulk-create-sevaks/route.ts
import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createSevak } from '@/lib/db';
import * as XLSX from 'xlsx';

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

    // --- Read file content depending on type ---
    let rows: string[] = [];

    if (fileExtension === '.csv') {
      const fileContent = await file.text();

      if (!fileContent || fileContent.trim().length === 0) {
        return NextResponse.json(
          { error: 'File is empty or invalid' },
          { status: 400 }
        );
      }

      rows = fileContent
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

      rows = jsonData
        .map(row => row.map(cell => (cell ? String(cell).trim() : '')).join(','))
        .filter(line => line.length > 0);
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid data found in file' },
        { status: 400 }
      );
    }

    // --- Header check ---
    const firstLine = rows[0].toLowerCase();
    const hasHeader =
      firstLine.includes('name') ||
      firstLine.includes('sevak') ||
      firstLine.includes('gender');
    const dataLines = hasHeader ? rows.slice(1) : rows;

    if (dataLines.length === 0) {
      return NextResponse.json(
        { error: 'No data rows found. Please check your file format.' },
        { status: 400 }
      );
    }

    // --- Bulk insert logic ---
    const deviceTime = new Date().toISOString();

    const results = {
      created: [] as any[],
      failed: [] as any[],
      createdCount: 0,
      failedCount: 0,
    };

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const rowNumber = i + (hasHeader ? 2 : 1);

      try {
        let name: string;
        let gender: 'male' | 'female' = 'male'; // default male

        if (line.includes(',')) {
          const parts = line
            .split(',')
            .map(p => p.trim().replace(/"/g, '').replace(/'/g, ''));
          name = parts[0] || '';

          if (parts.length > 1 && parts[1]) {
            const genderValue = parts[1].toLowerCase();
            if (
              genderValue === 'female' ||
              genderValue === 'f' ||
              genderValue === 'woman'
            ) {
              gender = 'female';
            }
          }
        } else {
          name = line.trim().replace(/"/g, '').replace(/'/g, '');
        }

        // --- Validations ---
        if (!name || name.length < 2) {
          results.failed.push({
            row: rowNumber,
            name: name || 'Empty',
            error: 'Name too short (minimum 2 characters)',
          });
          results.failedCount++;
          continue;
        }

        if (name.length > 100) {
          results.failed.push({
            row: rowNumber,
            name: name.substring(0, 20) + '...',
            error: 'Name too long (maximum 100 characters)',
          });
          results.failedCount++;
          continue;
        }

        if (!/^[a-zA-Z\s\u0900-\u097F.-]+$/.test(name)) {
          results.failed.push({
            row: rowNumber,
            name: name.substring(0, 20),
            error: 'Name contains invalid characters',
          });
          results.failedCount++;
          continue;
        }

        // --- Insert into DB ---
        const sevak = await createSevak(name, gender, user, deviceTime);

        results.created.push({
          row: rowNumber,
          sevak_id: sevak.sevak_id,
          name: sevak.name,
          gender: sevak.gender,
          points: sevak.points,
        });
        results.createdCount++;
      } catch (error: any) {
        console.error(`Error creating sevak for row ${rowNumber}:`, error);

        results.failed.push({
          row: rowNumber,
          name:
            line.substring(0, 20) + (line.length > 20 ? '...' : ''),
          error: error.message || 'Database error',
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
        failed: results.failed,
      },
    });
  } catch (error: any) {
    console.error('Bulk create sevaks error:', error);

    return NextResponse.json(
      {
        error: 'Server error during bulk upload. Please try again.',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
