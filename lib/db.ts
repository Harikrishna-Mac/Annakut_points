import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
};

export interface Sevak {
  id: number;
  sevak_id: string;
  name: string;
  points: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  sevak_id: number;
  user_email: string;
  user_name: string;
  user_role: 'admin' | 'inspector';
  transaction_type: 'ADD' | 'DEDUCT' | 'ATTENDANCE' | 'INITIAL';
  points_change: number;
  points_before: number;
  points_after: number;
  description: string | null;
  created_at: string;
}

export interface Attendance {
  id: number;
  sevak_id: number;
  user_email: string;
  user_name: string;
  user_role: 'admin' | 'inspector';
  attendance_date: string;
  check_in_time: string;
  points_awarded: number;
  is_on_time: boolean;
  created_at: string;
}

// Create database connection
export async function createDbConnection() {
  if (!dbConfig.user || !dbConfig.password || !dbConfig.database) {
    throw new Error('Missing database configuration');
  }
  return await mysql.createConnection(dbConfig);
}

// Helper function to get user info from Clerk user
function getUserInfo(user: any) {
  return {
    email: user.emailAddresses?.[0]?.emailAddress || 'unknown@email.com',
    name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Unknown User',
    role: (user.publicMetadata?.role || 'inspector') as 'admin' | 'inspector'
  };
}

// Generate next sevak ID manually
async function getNextSevakId(connection: mysql.Connection): Promise<string> {
  const [rows] = await connection.execute(
    'SELECT MAX(CAST(SUBSTRING(sevak_id, 4) AS UNSIGNED)) as max_num FROM sevaks'
  ) as any[];
  
  const nextNum = (rows[0]?.max_num || 0) + 1;
  return `ID-${nextNum.toString().padStart(4, '0')}`;
}

// Get sevak by QR code (sevak_id)
export async function getSevakByQR(qrCode: string): Promise<Sevak | null> {
  const connection = await createDbConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM sevaks WHERE sevak_id = ? AND is_active = TRUE',
      [qrCode]
    ) as any[];

    if (rows.length === 0) return null;
    return rows[0] as Sevak;
  } finally {
    await connection.end();
  }
}

// Helper function to get sevak with existing connection
async function getSevakByQRWithConnection(connection: mysql.Connection, qrCode: string): Promise<Sevak | null> {
  const [rows] = await connection.execute(
    'SELECT * FROM sevaks WHERE sevak_id = ? AND is_active = TRUE',
    [qrCode]
  ) as any[];

  if (rows.length === 0) return null;
  return rows[0] as Sevak;
}

// Add points to sevak
export async function addPointsToSevak(qrCode: string, points: number, user: any, description?: string) {
  const connection = await createDbConnection();
  const userInfo = getUserInfo(user);
  
  try {
    await connection.beginTransaction();

    // Get current sevak data
    const sevak = await getSevakByQRWithConnection(connection, qrCode);
    if (!sevak) {
      throw new Error('Sevak not found');
    }

    const newPoints = sevak.points + points;

    // Update sevak points
    await connection.execute(
      'UPDATE sevaks SET points = ?, updated_at = NOW() WHERE sevak_id = ?',
      [newPoints, qrCode]
    );

    // Record transaction
    await connection.execute(
      'INSERT INTO transactions (sevak_id, user_email, user_name, user_role, transaction_type, points_change, points_before, points_after, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [sevak.id, userInfo.email, userInfo.name, userInfo.role, 'ADD', points, sevak.points, newPoints, description || `Added ${points} points`]
    );

    await connection.commit();
    return { success: true, newPoints, previousPoints: sevak.points };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

// Deduct points from sevak
export async function deductPointsFromSevak(qrCode: string, points: number, user: any, description?: string) {
  const connection = await createDbConnection();
  const userInfo = getUserInfo(user);
  
  try {
    await connection.beginTransaction();

    // Get current sevak data
    const sevak = await getSevakByQRWithConnection(connection, qrCode);
    if (!sevak) {
      throw new Error('Sevak not found');
    }

    if (sevak.points < points) {
      throw new Error(`Insufficient points. Current balance: ${sevak.points}`);
    }

    const newPoints = Math.max(0, sevak.points - points);

    // Update sevak points
    await connection.execute(
      'UPDATE sevaks SET points = ?, updated_at = NOW() WHERE sevak_id = ?',
      [newPoints, qrCode]
    );

    // Record transaction
    await connection.execute(
      'INSERT INTO transactions (sevak_id, user_email, user_name, user_role, transaction_type, points_change, points_before, points_after, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [sevak.id, userInfo.email, userInfo.name, userInfo.role, 'DEDUCT', -points, sevak.points, newPoints, description || `Deducted ${points} points`]
    );

    await connection.commit();
    return { success: true, newPoints, previousPoints: sevak.points };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

// Mark attendance
export async function markAttendance(qrCode: string, user: any) {
  const connection = await createDbConnection();
  const userInfo = getUserInfo(user);
  
  try {
    await connection.beginTransaction();

    // Get current sevak data
    const sevak = await getSevakByQRWithConnection(connection, qrCode);
    if (!sevak) {
      throw new Error('Sevak not found');
    }

    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date();
    const checkInTime = currentTime.toTimeString().split(' ')[0];
    
    // Check if already marked attendance today
    const [existingAttendance] = await connection.execute(
      'SELECT id FROM attendance WHERE sevak_id = ? AND attendance_date = ?',
      [sevak.id, today]
    ) as any[];

    if (existingAttendance.length > 0) {
      throw new Error('Attendance already marked for today');
    }

    // Check if on time (before 8:30 AM)
    const cutoffTime = new Date();
    cutoffTime.setHours(8, 30, 0, 0);
    const isOnTime = currentTime <= cutoffTime;
    const pointsAwarded = isOnTime ? 50 : 25;

    const newPoints = sevak.points + pointsAwarded;

    // Update sevak points
    await connection.execute(
      'UPDATE sevaks SET points = ?, updated_at = NOW() WHERE sevak_id = ?',
      [newPoints, qrCode]
    );

    // Record attendance
    await connection.execute(
      'INSERT INTO attendance (sevak_id, user_email, user_name, user_role, attendance_date, check_in_time, points_awarded, is_on_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [sevak.id, userInfo.email, userInfo.name, userInfo.role, today, checkInTime, pointsAwarded, isOnTime]
    );

    // Record transaction
    await connection.execute(
      'INSERT INTO transactions (sevak_id, user_email, user_name, user_role, transaction_type, points_change, points_before, points_after, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [sevak.id, userInfo.email, userInfo.name, userInfo.role, 'ATTENDANCE', pointsAwarded, sevak.points, newPoints, `Attendance marked - ${isOnTime ? 'On time' : 'Late'} (+${pointsAwarded} points)`]
    );

    await connection.commit();
    return { 
      success: true, 
      newPoints, 
      previousPoints: sevak.points, 
      isOnTime, 
      pointsAwarded,
      checkInTime 
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

// Create new sevak (with manual ID generation)
export async function createSevak(name: string, user: any): Promise<Sevak> {
  const connection = await createDbConnection();
  const userInfo = getUserInfo(user);
  
  try {
    await connection.beginTransaction();

    // Generate next sevak ID
    const sevakId = await getNextSevakId(connection);

    // Create sevak
    const [result] = await connection.execute(
      'INSERT INTO sevaks (sevak_id, name, points) VALUES (?, ?, 100)',
      [sevakId, name.trim()]
    ) as any[];

    // Create initial transaction
    await connection.execute(
      'INSERT INTO transactions (sevak_id, user_email, user_name, user_role, transaction_type, points_change, points_before, points_after, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [result.insertId, userInfo.email, userInfo.name, userInfo.role, 'INITIAL', 100, 0, 100, 'Initial points allocation']
    );

    await connection.commit();

    // Get the created sevak
    const [rows] = await connection.execute(
      'SELECT * FROM sevaks WHERE id = ?',
      [result.insertId]
    ) as any[];

    return rows[0] as Sevak;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

// Get all sevaks for leaderboard
export async function getLeaderboard(): Promise<any[]> {
  const connection = await createDbConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM sevak_leaderboard ORDER BY points DESC'
    ) as any[];

    return rows;
  } finally {
    await connection.end();
  }
}

// Delete sevak (mark as inactive)
export async function deleteSevak(sevakId: string): Promise<boolean> {
  const connection = await createDbConnection();
  try {
    const [result] = await connection.execute(
      'UPDATE sevaks SET is_active = FALSE, updated_at = NOW() WHERE sevak_id = ?',
      [sevakId]
    ) as any[];

    return result.affectedRows > 0;
  } finally {
    await connection.end();
  }
}

// Get point history for a specific sevak
export async function getSevakPointHistory(sevakId: string, page: number = 1, limit: number = 10, type?: string) {
  const connection = await createDbConnection();
  const offset = (page - 1) * limit;
  
  try {
    // Get sevak info with summary stats
    const [sevakRows] = await connection.execute(`
      SELECT 
        s.id,
        s.sevak_id,
        s.name,
        s.points,
        s.created_at,
        COUNT(DISTINCT t.id) as total_transactions,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'ADD' THEN t.points_change ELSE 0 END), 0) as total_added,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'DEDUCT' THEN ABS(t.points_change) ELSE 0 END), 0) as total_deducted,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'ATTENDANCE' THEN t.points_change ELSE 0 END), 0) as attendance_points
      FROM sevaks s
      LEFT JOIN transactions t ON s.id = t.sevak_id
      WHERE s.sevak_id = ? AND s.is_active = TRUE
      GROUP BY s.id, s.sevak_id, s.name, s.points, s.created_at
    `, [sevakId]) as any[];

    if (sevakRows.length === 0) {
      throw new Error('Sevak not found');
    }

    const sevakInfo = sevakRows[0];

    // Build transaction query with optional type filter
    let transactionQuery = `
      SELECT 
        t.id,
        t.transaction_type,
        t.points_change,
        t.points_before,
        t.points_after,
        t.description,
        t.created_at,
        t.user_email,
        t.user_name,
        t.user_role
      FROM transactions t
      WHERE t.sevak_id = ?
    `;

    const queryParams: any[] = [sevakInfo.id];

    if (type && ['ADD', 'DEDUCT', 'ATTENDANCE', 'INITIAL'].includes(type)) {
      transactionQuery += ` AND t.transaction_type = ?`;
      queryParams.push(type);
    }

    transactionQuery += ` ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    const [transactions] = await connection.execute(transactionQuery, queryParams) as any[];

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM transactions WHERE sevak_id = ?`;
    const countParams: any[] = [sevakInfo.id];

    if (type && ['ADD', 'DEDUCT', 'ATTENDANCE', 'INITIAL'].includes(type)) {
      countQuery += ` AND transaction_type = ?`;
      countParams.push(type);
    }

    const [countRows] = await connection.execute(countQuery, countParams) as any[];
    const totalCount = countRows[0].total;

    return {
      sevakInfo,
      transactions,
      totalCount,
      totalPages: Math.ceil(totalCount / limit)
    };

  } finally {
    await connection.end();
  }
}