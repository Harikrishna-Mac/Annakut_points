// // app/api/sevak-history/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { auth } from '@clerk/nextjs/server';
// import mysql from 'mysql2/promise';

// // Database connection configuration
// const dbConfig = {
//   host: process.env.DB_HOST || 'localhost',
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASSWORD || '',
//   database: process.env.DB_NAME || 'annakut_points_system',
//   timezone: '+00:00',
//   ssl: process.env.DB_SSL === 'true' ? {
//     rejectUnauthorized: false
//   } : undefined
// };

// export async function GET(request: NextRequest) {
//   try {
//     // Check authentication
//     const { userId } = await auth();
//     if (!userId) {
//       return NextResponse.json(
//         { error: 'Authentication required' },
//         { status: 401 }
//       );
//     }

//     // Get sevakId from query parameters
//     const { searchParams } = new URL(request.url);
//     const sevakId = searchParams.get('sevakId');

//     if (!sevakId) {
//       return NextResponse.json(
//         { error: 'Sevak ID is required' },
//         { status: 400 }
//       );
//     }

//     // Create database connection
//     const connection = await mysql.createConnection(dbConfig);

//     try {
//       // First, get the sevak's internal ID
//       const [sevakRows] = await connection.execute(
//         'SELECT id, name FROM sevaks WHERE sevak_id = ? AND is_active = TRUE',
//         [sevakId]
//       ) as [any[], any];

//       if (sevakRows.length === 0) {
//         await connection.end();
//         return NextResponse.json(
//           { error: 'Sevak not found or inactive' },
//           { status: 404 }
//         );
//       }

//       const sevakInternalId = sevakRows[0].id;
//       const sevakName = sevakRows[0].name;

//       // Get transaction history ordered by created_at DESC (newest first)
//       const [transactionRows] = await connection.execute(
//         `SELECT 
//           id,
//           transaction_type,
//           points_change,
//           points_before,
//           points_after,
//           description,
//           clerk_user_id,
//           created_at
//         FROM transactions 
//         WHERE sevak_id = ? 
//         ORDER BY created_at DESC, id DESC`,
//         [sevakInternalId]
//       ) as [any[], any];

//       // Optional: Get attendance records for more detailed history
//       const [attendanceRows] = await connection.execute(
//         `SELECT 
//           attendance_date,
//           check_in_time,
//           points_awarded,
//           is_on_time,
//           clerk_user_id,
//           created_at
//         FROM attendance 
//         WHERE sevak_id = ? 
//         ORDER BY attendance_date DESC`,
//         [sevakInternalId]
//       ) as [any[], any];

//       await connection.end();

//       // Format the response
//       const response = {
//         success: true,
//         sevak: {
//           id: sevakId,
//           name: sevakName
//         },
//         transactions: transactionRows.map((row: any) => ({
//           id: row.id,
//           transaction_type: row.transaction_type,
//           points_change: row.points_change,
//           points_before: row.points_before,
//           points_after: row.points_after,
//           description: row.description,
//           clerk_user_id: row.clerk_user_id,
//           created_at: row.created_at.toISOString(),
//           // Add formatted display values
//           display_type: row.transaction_type.replace('_', ' '),
//           display_date: row.created_at,
//           is_positive: row.points_change > 0
//         })),
//         attendance: attendanceRows.map((row: any) => ({
//           attendance_date: row.attendance_date,
//           check_in_time: row.check_in_time,
//           points_awarded: row.points_awarded,
//           is_on_time: row.is_on_time,
//           clerk_user_id: row.clerk_user_id,
//           created_at: row.created_at.toISOString()
//         })),
//         summary: {
//           total_transactions: transactionRows.length,
//           total_attendance_days: attendanceRows.length,
//           points_added: transactionRows
//             .filter((t: any) => t.points_change > 0)
//             .reduce((sum: number, t: any) => sum + t.points_change, 0),
//           points_deducted: Math.abs(transactionRows
//             .filter((t: any) => t.points_change < 0)
//             .reduce((sum: number, t: any) => sum + t.points_change, 0)),
//           attendance_points: transactionRows
//             .filter((t: any) => t.transaction_type === 'ATTENDANCE')
//             .reduce((sum: number, t: any) => sum + t.points_change, 0),
//           on_time_days: attendanceRows.filter((a: any) => a.is_on_time).length,
//           late_days: attendanceRows.filter((a: any) => !a.is_on_time).length
//         }
//       };

//       return NextResponse.json(response);

//     } catch (dbError) {
//       console.error('Database error:', dbError);
//       await connection.end();
//       return NextResponse.json(
//         { error: 'Database error occurred' },
//         { status: 500 }
//       );
//     }

//   } catch (error) {
//     console.error('Sevak history API error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// app/api/sevak-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import mysql from 'mysql2/promise';

// Database connection configuration
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
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get sevakId from query parameters
    const { searchParams } = new URL(request.url);
    const sevakId = searchParams.get('sevakId');

    if (!sevakId) {
      return NextResponse.json(
        { error: 'Sevak ID is required' },
        { status: 400 }
      );
    }

    // Create database connection
    const connection = await mysql.createConnection(dbConfig);

    try {
      // First, get the sevak's internal ID
      const [sevakRows] = await connection.execute(
        'SELECT id, name FROM sevaks WHERE sevak_id = ? AND is_active = TRUE',
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
      const sevakName = sevakRows[0].name;

      // Get transaction history ordered by created_at DESC (newest first)
      const [transactionRows] = await connection.execute(
        `SELECT 
          id,
          transaction_type,
          points_change,
          points_before,
          points_after,
          description,
          clerk_user_id,
          created_at
        FROM transactions 
        WHERE sevak_id = ? 
        ORDER BY created_at DESC, id DESC`,
        [sevakInternalId]
      ) as [any[], any];

      // Optional: Get attendance records for more detailed history
      const [attendanceRows] = await connection.execute(
        `SELECT 
          attendance_date,
          check_in_time,
          points_awarded,
          is_on_time,
          clerk_user_id,
          created_at
        FROM attendance 
        WHERE sevak_id = ? 
        ORDER BY attendance_date DESC`,
        [sevakInternalId]
      ) as [any[], any];

      await connection.end();

      // Format the response
      const response = {
        success: true,
        sevak: {
          id: sevakId,
          name: sevakName
        },
        transactions: transactionRows.map((row: any) => ({
          id: row.id,
          transaction_type: row.transaction_type,
          points_change: row.points_change,
          points_before: row.points_before,
          points_after: row.points_after,
          description: row.description,
          clerk_user_id: row.clerk_user_id,
          created_at: row.created_at.toISOString(),
          // Add formatted display values
          display_type: row.transaction_type.replace('_', ' '),
          display_date: row.created_at,
          is_positive: row.points_change > 0
        })),
        attendance: attendanceRows.map((row: any) => ({
          attendance_date: row.attendance_date,
          check_in_time: row.check_in_time,
          points_awarded: row.points_awarded,
          is_on_time: row.is_on_time,
          clerk_user_id: row.clerk_user_id,
          created_at: row.created_at.toISOString()
        })),
        summary: {
          total_transactions: transactionRows.length,
          total_attendance_days: attendanceRows.length,
          points_added: transactionRows
            .filter((t: any) => t.points_change > 0)
            .reduce((sum: number, t: any) => sum + t.points_change, 0),
          points_deducted: Math.abs(transactionRows
            .filter((t: any) => t.points_change < 0)
            .reduce((sum: number, t: any) => sum + t.points_change, 0)),
          attendance_points: transactionRows
            .filter((t: any) => t.transaction_type === 'ATTENDANCE')
            .reduce((sum: number, t: any) => sum + t.points_change, 0),
          on_time_days: attendanceRows.filter((a: any) => a.is_on_time).length,
          late_days: attendanceRows.filter((a: any) => !a.is_on_time).length
        }
      };

      return NextResponse.json(response);

    } catch (dbError) {
      console.error('Database error:', dbError);
      await connection.end();
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Sevak history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}