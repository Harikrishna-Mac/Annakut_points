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

    // 1️⃣ Get Sevak
    const [rows] = await connection.execute(
      "SELECT * FROM sevaks WHERE sevak_id = ? AND is_active = TRUE",
      [qrCode]
    ) as any[];

    if (rows.length === 0) throw new Error("Sevak not found");

    const sevak: Sevak = rows[0];

    // 2️⃣ Get IST time (India UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60; // 5 hours 30 mins in minutes
    const istTime = new Date(now.getTime() + istOffset * 60 * 1000);

    const hour = istTime.getHours();
    const minute = istTime.getMinutes();

    // 3️⃣ Determine if on-time (before 8:30 AM IST)
    const isOnTime = hour < 8 || (hour === 8 && minute <= 30);
    const pointsAwarded = isOnTime ? 50 : 25;

    // 4️⃣ Today's date in IST (YYYY-MM-DD)
    const today = istTime.toISOString().split("T")[0];
    const checkInTime = istTime.toTimeString().split(" ")[0];

    // 5️⃣ Check if attendance already marked today
    const [existing] = await connection.execute(
      "SELECT id FROM attendance WHERE sevak_id = ? AND attendance_date = ?",
      [sevak.id, today]
    ) as any[];

    if (existing.length > 0) {
      throw new Error("Attendance already marked for today");
    }

    // 6️⃣ Update Sevak points
    const newPoints = sevak.points + pointsAwarded;
    await connection.execute(
      "UPDATE sevaks SET points = ?, updated_at = NOW() WHERE sevak_id = ?",
      [newPoints, qrCode]
    );

    // 7️⃣ Insert attendance record
    await connection.execute(
      "INSERT INTO attendance (sevak_id, clerk_user_id, attendance_date, check_in_time, points_awarded, is_on_time) VALUES (?, ?, ?, ?, ?, ?)",
      [sevak.id, clerkUserId, today, checkInTime, pointsAwarded, isOnTime]
    );

    // 8️⃣ Insert transaction record
    await connection.execute(
      "INSERT INTO transactions (sevak_id, clerk_user_id, transaction_type, points_change, points_before, points_after, description) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        sevak.id,
        clerkUserId,
        "ATTENDANCE",
        pointsAwarded,
        sevak.points,
        newPoints,
        `Attendance marked - ${isOnTime ? "On time" : "Late"} (+${pointsAwarded} points)`,
      ]
    );

    await connection.commit();

    return {
      success: true,
      previousPoints: sevak.points,
      newPoints,
      pointsAwarded,
      isOnTime,
      checkInTime,
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