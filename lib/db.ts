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
  clerk_user_id: string;
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
  clerk_user_id: string;
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
export async function addPointsToSevak(qrCode: string, points: number, clerkUserId: string, description?: string) {
  const connection = await createDbConnection();
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
      'INSERT INTO transactions (sevak_id, clerk_user_id, transaction_type, points_change, points_before, points_after, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [sevak.id, clerkUserId, 'ADD', points, sevak.points, newPoints, description || `Added ${points} points`]
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
export async function deductPointsFromSevak(qrCode: string, points: number, clerkUserId: string, description?: string) {
  const connection = await createDbConnection();
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
      'INSERT INTO transactions (sevak_id, clerk_user_id, transaction_type, points_change, points_before, points_after, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [sevak.id, clerkUserId, 'DEDUCT', -points, sevak.points, newPoints, description || `Deducted ${points} points`]
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
export async function markAttendance(qrCode: string, clerkUserId: string) {
  const connection = await createDbConnection();
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

    // const currentTime = new Date();
    const now = new Date(); // server time
const hour = now.getHours();
const minute = now.getMinutes();

// Example: on-time before 8:30
const isOnTime = hour < 8 || (hour === 8 && minute <= 30);

let pointsAwarded = isOnTime ? 50 : 25;


    // let pointsAwarded;
    if (isOnTime) {
      pointsAwarded = 50;
    } else {
      pointsAwarded = 25;
    }

    // // Check if on time (before 8:30 AM)
    // const cutoffTime = new Date();
    // cutoffTime.setHours(8, 30, 0, 0);
    // const isOnTime = currentTime <= cutoffTime;
    // const pointsAwarded = isOnTime ? 50 : 25;

    const newPoints = sevak.points + pointsAwarded;

    // Update sevak points
    await connection.execute(
      'UPDATE sevaks SET points = ?, updated_at = NOW() WHERE sevak_id = ?',
      [newPoints, qrCode]
    );

    // Record attendance
    await connection.execute(
      'INSERT INTO attendance (sevak_id, clerk_user_id, attendance_date, check_in_time, points_awarded, is_on_time) VALUES (?, ?, ?, ?, ?, ?)',
      [sevak.id, clerkUserId, today, checkInTime, pointsAwarded, isOnTime]
    );

    // Record transaction
    await connection.execute(
      'INSERT INTO transactions (sevak_id, clerk_user_id, transaction_type, points_change, points_before, points_after, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [sevak.id, clerkUserId, 'ATTENDANCE', pointsAwarded, sevak.points, newPoints, `Attendance marked - ${isOnTime ? 'On time' : 'Late'} (+${pointsAwarded} points)`]
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

// Create new sevak
export async function createSevak(name: string, clerkUserId: string): Promise<Sevak> {
  const connection = await createDbConnection();
  try {
    const [result] = await connection.execute(
      'INSERT INTO sevaks (name) VALUES (?)',
      [name.trim()]
    ) as any[];

    // Get the created sevak
    const [rows] = await connection.execute(
      'SELECT * FROM sevaks WHERE id = ?',
      [result.insertId]
    ) as any[];

    return rows[0] as Sevak;
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