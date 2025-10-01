import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'annakut_points_system',
  timezone: '+00:00',
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined
};

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sevakId = searchParams.get('sevakId');

    if (!sevakId) {
      return NextResponse.json(
        { error: 'Sevak ID is required' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(dbConfig);

    try {
      // Get sevak info - using device timestamps
      const [sevakRows] = await connection.execute(
        'SELECT id, name, points, device_created_at as created_at FROM sevaks WHERE sevak_id = ? AND is_active = TRUE',
        [sevakId]
      ) as [any[], any];

      if (sevakRows.length === 0) {
        await connection.end();
        return NextResponse.json(
          { error: 'Sevak not found or inactive' },
          { status: 404 }
        );
      }

      const sevakInternalId = sevakRows[0].id;
      const sevakInfo = sevakRows[0];

      // Get transaction history with device_timestamp
      const [transactionRows] = await connection.execute(
        `SELECT 
          id,
          transaction_type,
          points_change,
          points_before,
          points_after,
          description,
          user_email,
          user_name,
          user_role,
          device_timestamp
        FROM transactions 
        WHERE sevak_id = ? 
        ORDER BY device_timestamp DESC, id DESC`,
        [sevakInternalId]
      ) as [any[], any];

      // Get attendance records with device_timestamp
      const [attendanceRows] = await connection.execute(
        `SELECT 
          attendance_date,
          check_in_time,
          points_awarded,
          is_on_time,
          user_email,
          user_name,
          user_role,
          device_timestamp
        FROM attendance 
        WHERE sevak_id = ? 
        ORDER BY attendance_date DESC`,
        [sevakInternalId]
      ) as [any[], any];

      await connection.end();

      // Calculate summary stats
      const summary = {
        total_transactions: transactionRows.length,
        total_attendance_days: attendanceRows.length,
        points_added: transactionRows
          .filter((t: any) => t.points_change > 0 && t.transaction_type !== 'ATTENDANCE')
          .reduce((sum: number, t: any) => sum + t.points_change, 0),
        points_deducted: Math.abs(transactionRows
          .filter((t: any) => t.points_change < 0)
          .reduce((sum: number, t: any) => sum + t.points_change, 0)),
        attendance_points: transactionRows
          .filter((t: any) => t.transaction_type === 'ATTENDANCE')
          .reduce((sum: number, t: any) => sum + t.points_change, 0),
        on_time_days: attendanceRows.filter((a: any) => a.is_on_time).length,
        late_days: attendanceRows.filter((a: any) => !a.is_on_time).length,
        initial_points: transactionRows
          .filter((t: any) => t.transaction_type === 'INITIAL')
          .reduce((sum: number, t: any) => sum + t.points_change, 0)
      };

      const response = {
        success: true,
        sevakInfo: {
          id: sevakId,
          name: sevakInfo.name,
          points: sevakInfo.points,
          created_at: sevakInfo.created_at,
          ...summary
        },
        transactions: transactionRows.map((row: any) => ({
          id: row.id,
          transaction_type: row.transaction_type,
          points_change: row.points_change,
          points_before: row.points_before,
          points_after: row.points_after,
          description: row.description || '',
          user_email: row.user_email || 'system@annakut.com',
          user_name: row.user_name || 'System',
          user_role: row.user_role || 'system',
          device_timestamp: row.device_timestamp,
          // Display values
          display_type: row.transaction_type.replace('_', ' ').toLowerCase(),
          display_date: row.device_timestamp,
          is_positive: row.points_change > 0,
          formatted_change: row.points_change > 0 ? `+${row.points_change}` : row.points_change.toString()
        })),
        attendance: attendanceRows.map((row: any) => ({
          attendance_date: row.attendance_date,
          check_in_time: row.check_in_time,
          points_awarded: row.points_awarded,
          is_on_time: row.is_on_time,
          user_email: row.user_email || 'system@annakut.com',
          user_name: row.user_name || 'System',
          user_role: row.user_role || 'system',
          device_timestamp: row.device_timestamp,
          formatted_time: row.check_in_time,
          status: row.is_on_time ? 'On Time' : 'Late',
          status_color: row.is_on_time ? 'green' : 'yellow'
        })),
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: transactionRows.length,
          hasNextPage: false,
          hasPrevPage: false
        },
        summary
      };

      return NextResponse.json(response);

    } catch (dbError: any) {
      console.error('Database error:', dbError);
      await connection.end();
      return NextResponse.json(
        { 
          error: 'Database error occurred',
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Sevak history API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}