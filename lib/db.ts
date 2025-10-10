import mysql from 'mysql2/promise';
import { getAttendancePointsWithClientTime } from './config';
import { getMaxDailyPoints } from './config';

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
  gender: 'male' | 'female';
  points: number;
  is_active: boolean;
  device_created_at: string;
  device_updated_at: string;
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
  device_timestamp: string;
}

// Add these interfaces at the top with other interfaces

export interface Feedback {
  id: number;
  sevak_id: number;
  reviewer_email: string;
  reviewer_name: string;
  reviewer_role: 'admin' | 'inspector';
  feedback_text: string;
  device_timestamp: string;
  created_at: string;
}

export interface FeedbackWithSevak extends Feedback {
  sevak_name: string;
  sevak_qr_id: string;
  sevak_gender: 'male' | 'female';
  sevak_points: number;
}

// Create database connection
export async function createDbConnection() {
  if (!dbConfig.user || !dbConfig.password || !dbConfig.database) {
    throw new Error('Missing database configuration');
  }
  return await mysql.createConnection(dbConfig);
}

// Helper function to get user info
function getUserInfo(user: any) {
  return {
    email: user.emailAddresses?.[0]?.emailAddress || 'unknown@email.com',
    name: user.username ? user.username : 'Unknown User',
    role: (user.publicMetadata?.role || 'inspector') as 'admin' | 'inspector'
  };
}

// Helper function to format device time for MySQL
function formatDeviceTimeForMySQL(deviceTimeISO: string): string {
  try {
    const date = new Date(deviceTimeISO);
    return date.toISOString().slice(0, 19).replace('T', ' ');
  } catch (error) {
    console.error('Error formatting device time:', error);
    throw new Error('Invalid device timestamp format');
  }
}

// Generate next sevak ID based on gender
async function getNextSevakId(connection: mysql.Connection, gender: 'male' | 'female'): Promise<string> {
  if (gender === 'male') {
    // Male IDs: ID-0001 to ID-0300
    const [rows] = await connection.execute(
      `SELECT MAX(CAST(SUBSTRING(sevak_id, 4) AS UNSIGNED)) as max_num 
       FROM sevaks 
       WHERE gender = 'male' AND CAST(SUBSTRING(sevak_id, 4) AS UNSIGNED) <= 300`
    ) as any[];
    
    const nextNum = (rows[0]?.max_num || 0) + 1;
    if (nextNum > 300) {
      throw new Error('Male sevak ID limit reached (300 maximum)');
    }
    return `ID-${nextNum.toString().padStart(4, '0')}`;
  } else {
    // Female IDs: ID-0301 onwards
    const [rows] = await connection.execute(
      `SELECT MAX(CAST(SUBSTRING(sevak_id, 4) AS UNSIGNED)) as max_num 
       FROM sevaks 
       WHERE gender = 'female'`
    ) as any[];
    
    const nextNum = Math.max((rows[0]?.max_num || 300), 300) + 1;
    return `ID-${nextNum.toString().padStart(4, '0')}`;
  }
}

// Check daily point limit for inspector - ONLY FOR ADD OPERATIONS
async function checkDailyPointLimit(
  connection: mysql.Connection, 
  userEmail: string, 
  sevakId: number, 
  pointsToAdd: number,
  actionType: 'ADD' | 'DEDUCT',
  deviceTimeISO: string
): Promise<boolean> {
  const actionDate = new Date(deviceTimeISO).toISOString().split('T')[0];
  
  // Get max daily points from Next.js config
  const maxDailyPoints = getMaxDailyPoints();
  
  console.log(`[DAILY LIMIT CHECK] Max allowed: ${maxDailyPoints}, Trying to add: ${pointsToAdd}`);
  
  // Get current daily total for ADD operations only
  const [limitRows] = await connection.execute(
    `SELECT total_points_added 
     FROM daily_point_limits 
     WHERE user_email = ? AND sevak_id = ? AND action_date = ?`,
    [userEmail, sevakId, actionDate]
  ) as any[];
  
  if (limitRows.length > 0) {
    const currentAdded = limitRows[0].total_points_added || 0;
    
    console.log(`[DAILY LIMIT CHECK] Current added today: ${currentAdded}, After this: ${currentAdded + pointsToAdd}`);
    
    if (currentAdded + pointsToAdd > maxDailyPoints) {
      throw new Error(`Daily limit reached! You can only ADD ${maxDailyPoints} points per sevak per day. Current total added today: ${currentAdded}`);
    }
  } else {
    console.log(`[DAILY LIMIT CHECK] First addition today for this sevak`);
  }
  
  return true;
}

// Update daily point limit tracker - ONLY FOR ADD OPERATIONS
async function updateDailyPointLimit(
  connection: mysql.Connection,
  userEmail: string,
  sevakId: number,
  pointsChanged: number,
  actionType: 'ADD' | 'DEDUCT',
  deviceTimeISO: string
) {
  // Only track ADD operations, ignore DEDUCT
  if (actionType !== 'ADD') return;
  
  const actionDate = new Date(deviceTimeISO).toISOString().split('T')[0];
  const deviceTimestamp = formatDeviceTimeForMySQL(deviceTimeISO);
  
  const [existing] = await connection.execute(
    `SELECT * FROM daily_point_limits 
     WHERE user_email = ? AND sevak_id = ? AND action_date = ?`,
    [userEmail, sevakId, actionDate]
  ) as any[];
  
  if (existing.length > 0) {
    // Update existing record - only ADD points
    await connection.execute(
      `UPDATE daily_point_limits 
       SET total_points_added = total_points_added + ?, last_updated = ? 
       WHERE user_email = ? AND sevak_id = ? AND action_date = ?`,
      [pointsChanged, deviceTimestamp, userEmail, sevakId, actionDate]
    );
  } else {
    // Create new record - only ADD points
    await connection.execute(
      `INSERT INTO daily_point_limits 
       (user_email, sevak_id, action_date, total_points_added, total_points_deducted, last_updated) 
       VALUES (?, ?, ?, ?, 0, ?)`,
      [userEmail, sevakId, actionDate, pointsChanged, deviceTimestamp]
    );
  }
}

// Get sevak by QR code
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

// Helper to get sevak with existing connection
async function getSevakByQRWithConnection(connection: mysql.Connection, qrCode: string): Promise<Sevak | null> {
  const [rows] = await connection.execute(
    'SELECT * FROM sevaks WHERE sevak_id = ? AND is_active = TRUE',
    [qrCode]
  ) as any[];
  if (rows.length === 0) return null;
  return rows[0] as Sevak;
}

// Add points to sevak with daily limit check
export async function addPointsToSevak(
  qrCode: string, 
  points: number, 
  user: any, 
  deviceTimeISO: string,
  description?: string
) {
  const connection = await createDbConnection();
  const userInfo = getUserInfo(user);
  const deviceTimestamp = formatDeviceTimeForMySQL(deviceTimeISO);
  
  try {
    await connection.beginTransaction();

    const sevak = await getSevakByQRWithConnection(connection, qrCode);
    if (!sevak) {
      throw new Error('Sevak not found');
    }

    // // Check daily limit ONLY for inspectors on ADD operations
    // if (userInfo.role === 'inspector') {
    //   await checkDailyPointLimit(connection, userInfo.email, sevak.id, points, 'ADD', deviceTimeISO);
    // }

    const newPoints = sevak.points + points;

    await connection.execute(
      'UPDATE sevaks SET points = ?, device_updated_at = ? WHERE sevak_id = ?',
      [newPoints, deviceTimestamp, qrCode]
    );

    await connection.execute(
      `INSERT INTO transactions 
       (sevak_id, user_email, user_name, user_role, transaction_type, points_change, points_before, points_after, description, device_timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sevak.id, userInfo.email, userInfo.name, userInfo.role, 'ADD', points, sevak.points, newPoints, description || `Added ${points} points`, deviceTimestamp]
    );

    // // Update daily limit tracker ONLY for inspectors
    // if (userInfo.role === 'inspector') {
    //   await updateDailyPointLimit(connection, userInfo.email, sevak.id, points, 'ADD', deviceTimeISO);
    // }

    await connection.commit();
    return { success: true, newPoints, previousPoints: sevak.points };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

// Deduct points from sevak - NO DAILY LIMIT CHECK
export async function deductPointsFromSevak(
  qrCode: string, 
  points: number, 
  user: any, 
  deviceTimeISO: string,
  description?: string
) {
  const connection = await createDbConnection();
  const userInfo = getUserInfo(user);
  const deviceTimestamp = formatDeviceTimeForMySQL(deviceTimeISO);
  
  try {
    await connection.beginTransaction();

    const sevak = await getSevakByQRWithConnection(connection, qrCode);
    if (!sevak) {
      throw new Error('Sevak not found');
    }

    // NO DAILY LIMIT CHECK FOR DEDUCT - UNLIMITED DEDUCTIONS ALLOWED

    if (sevak.points < points) {
      throw new Error(`Insufficient points. Current balance: ${sevak.points}`);
    }

    const newPoints = Math.max(0, sevak.points - points);

    await connection.execute(
      'UPDATE sevaks SET points = ?, device_updated_at = ? WHERE sevak_id = ?',
      [newPoints, deviceTimestamp, qrCode]
    );

    await connection.execute(
      `INSERT INTO transactions 
       (sevak_id, user_email, user_name, user_role, transaction_type, points_change, points_before, points_after, description, device_timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sevak.id, userInfo.email, userInfo.name, userInfo.role, 'DEDUCT', -points, sevak.points, newPoints, description || `Deducted ${points} points`, deviceTimestamp]
    );

    // NO UPDATE TO DAILY LIMIT TRACKER FOR DEDUCT

    await connection.commit();
    return { success: true, newPoints, previousPoints: sevak.points };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

export async function createFeedback(
  qrCode: string,
  feedbackText: string,
  user: any,
  deviceTimeISO: string
): Promise<{ success: boolean; feedback_id: number }> {
  const connection = await createDbConnection();
  const userInfo = getUserInfo(user);
  const deviceTimestamp = formatDeviceTimeForMySQL(deviceTimeISO);

  try {
    await connection.beginTransaction();

    // Get sevak
    const sevak = await getSevakByQRWithConnection(connection, qrCode);
    if (!sevak) {
      throw new Error('Sevak not found');
    }

    // Validate feedback text
    if (!feedbackText || feedbackText.trim().length === 0) {
      throw new Error('Feedback text cannot be empty');
    }

    if (feedbackText.trim().length > 1000) {
      throw new Error('Feedback text is too long (max 1000 characters)');
    }

    // Insert feedback
    const [result] = await connection.execute(
      `INSERT INTO feedback 
       (sevak_id, reviewer_email, reviewer_name, reviewer_role, feedback_text, device_timestamp) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sevak.id, userInfo.email, userInfo.name, userInfo.role, feedbackText.trim(), deviceTimestamp]
    ) as any[];

    await connection.commit();
    return { success: true, feedback_id: result.insertId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

// Get all feedback grouped by sevak with gender filter
export async function getFeedbackBySevaks(gender?: 'male' | 'female'): Promise<any[]> {
  const connection = await createDbConnection();

  try {
    let query = `
      SELECT 
        s.id as sevak_internal_id,
        s.sevak_id,
        s.name as sevak_name,
        s.gender as sevak_gender,
        s.points as sevak_points,
        COUNT(f.id) as feedback_count,
        MAX(f.device_timestamp) as latest_feedback_time
      FROM sevaks s
      INNER JOIN feedback f ON s.id = f.sevak_id
      WHERE s.is_active = TRUE
    `;

    const params: any[] = [];

    if (gender) {
      query += ` AND s.gender = ?`;
      params.push(gender);
    }

    query += `
      GROUP BY s.id, s.sevak_id, s.name, s.gender, s.points
      ORDER BY latest_feedback_time DESC, feedback_count DESC
    `;

    const [rows] = await connection.execute(query, params) as any[];
    return rows;
  } finally {
    await connection.end();
  }
}

// Get all feedback for a specific sevak
export async function getFeedbackForSevak(sevakId: string): Promise<FeedbackWithSevak[]> {
  const connection = await createDbConnection();

  try {
    const query = `
      SELECT 
        f.*,
        s.name as sevak_name,
        s.sevak_id as sevak_qr_id,
        s.gender as sevak_gender,
        s.points as sevak_points
      FROM feedback f
      JOIN sevaks s ON f.sevak_id = s.id
      WHERE s.sevak_id = ?
      ORDER BY f.device_timestamp DESC
    `;

    const [rows] = await connection.execute(query, [sevakId]) as any[];
    return rows as FeedbackWithSevak[];
  } finally {
    await connection.end();
  }
}

// Get feedback statistics
export async function getFeedbackStats(): Promise<{
  total_feedback: number;
  total_sevaks_with_feedback: number;
  male_sevaks_feedback: number;
  female_sevaks_feedback: number;
}> {
  const connection = await createDbConnection();

  try {
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(DISTINCT f.id) as total_feedback,
        COUNT(DISTINCT f.sevak_id) as total_sevaks_with_feedback,
        COUNT(DISTINCT CASE WHEN s.gender = 'male' THEN f.sevak_id END) as male_sevaks_feedback,
        COUNT(DISTINCT CASE WHEN s.gender = 'female' THEN f.sevak_id END) as female_sevaks_feedback
      FROM feedback f
      JOIN sevaks s ON f.sevak_id = s.id
      WHERE s.is_active = TRUE
    `) as any[];

    return stats[0];
  } finally {
    await connection.end();
  }
}

// Mark attendance
export async function markAttendance(
  qrCode: string, 
  user: any, 
  clientHour: number, 
  clientMinute: number, 
  clientTimeISO: string
) {
  const connection = await createDbConnection();
  const userInfo = getUserInfo(user);
  const deviceTimestamp = formatDeviceTimeForMySQL(clientTimeISO);
  
  try {
    await connection.beginTransaction();

    const sevak = await getSevakByQRWithConnection(connection, qrCode);
    if (!sevak) {
      throw new Error('Sevak not found');
    }

    const clientDate = new Date(clientTimeISO);
    const today = clientDate.toISOString().split('T')[0];
    const checkInTime = clientDate.toTimeString().split(' ')[0];
    
    const [existingAttendance] = await connection.execute(
      'SELECT id FROM attendance WHERE sevak_id = ? AND attendance_date = ?',
      [sevak.id, today]
    ) as any[];

    if (existingAttendance.length > 0) {
      throw new Error('Attendance already marked for today');
    }

    const { points: pointsAwarded, isOnTime } = getAttendancePointsWithClientTime(clientHour, clientMinute);
    const newPoints = sevak.points + pointsAwarded;

    await connection.execute(
      'UPDATE sevaks SET points = ?, device_updated_at = ? WHERE sevak_id = ?',
      [newPoints, deviceTimestamp, qrCode]
    );

    await connection.execute(
      `INSERT INTO attendance 
       (sevak_id, user_email, user_name, user_role, attendance_date, check_in_time, points_awarded, is_on_time, device_timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sevak.id, userInfo.email, userInfo.name, userInfo.role, today, checkInTime, pointsAwarded, isOnTime, deviceTimestamp]
    );

    await connection.execute(
      `INSERT INTO transactions 
       (sevak_id, user_email, user_name, user_role, transaction_type, points_change, points_before, points_after, description, device_timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sevak.id, userInfo.email, userInfo.name, userInfo.role, 'ATTENDANCE', pointsAwarded, sevak.points, newPoints, `Attendance marked - ${isOnTime ? 'On time' : 'Late'} (+${pointsAwarded} points)`, deviceTimestamp]
    );

    await connection.commit();
    return { success: true, newPoints, previousPoints: sevak.points, isOnTime, pointsAwarded, checkInTime };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

// Create new sevak with gender
export async function createSevak(name: string, gender: 'male' | 'female', user: any, deviceTimeISO: string): Promise<Sevak> {
  const connection = await createDbConnection();
  const userInfo = getUserInfo(user);
  const deviceTimestamp = formatDeviceTimeForMySQL(deviceTimeISO);
  
  try {
    await connection.beginTransaction();

    const sevakId = await getNextSevakId(connection, gender);

    const [result] = await connection.execute(
      'INSERT INTO sevaks (sevak_id, name, gender, points, device_created_at, device_updated_at) VALUES (?, ?, ?, 100, ?, ?)',
      [sevakId, name.trim(), gender, deviceTimestamp, deviceTimestamp]
    ) as any[];

    await connection.execute(
      `INSERT INTO transactions 
       (sevak_id, user_email, user_name, user_role, transaction_type, points_change, points_before, points_after, description, device_timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [result.insertId, "System", "System", userInfo.role, 'INITIAL', 100, 0, 100, 'Initial points allocation', deviceTimestamp]
    );

    await connection.commit();

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

// Get leaderboard by gender
export async function getLeaderboard(gender?: 'male' | 'female') {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    let query = `
      SELECT 
        s.id,
        s.sevak_id,
        s.name,
        s.gender,
        s.points,
        s.is_active,
        s.device_created_at as created_at,
        COUNT(DISTINCT t.id) as total_transactions,
        COUNT(DISTINCT a.id) as total_attendance_days,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'ADD' THEN t.points_change ELSE 0 END), 0) as total_added,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'DEDUCT' THEN ABS(t.points_change) ELSE 0 END), 0) as total_deducted,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'ATTENDANCE' THEN t.points_change ELSE 0 END), 0) as attendance_points,
        COALESCE(SUM(CASE WHEN a.is_on_time = TRUE THEN 1 ELSE 0 END), 0) as on_time_days,
        COALESCE(SUM(CASE WHEN a.is_on_time = FALSE THEN 1 ELSE 0 END), 0) as late_days
      FROM sevaks s
      LEFT JOIN transactions t ON s.id = t.sevak_id
      LEFT JOIN attendance a ON s.id = a.sevak_id
      WHERE s.is_active = TRUE
    `;

    const params: any[] = [];

    // Add gender filter if provided
    if (gender) {
      query += ` AND s.gender = ?`;
      params.push(gender);
    }

    query += `
      GROUP BY s.id, s.sevak_id, s.name, s.gender, s.points, s.is_active, s.device_created_at
      ORDER BY s.points DESC, s.name ASC
    `;

    const [rows] = await connection.execute(query, params) as [any[], any];
    await connection.end();

    return rows;
  } catch (error) {
    await connection.end();
    throw error;
  }
}

// FULL DELETE - Permanently remove sevak
export async function deleteSevak(sevakId: string): Promise<boolean> {
  const connection = await createDbConnection();
  
  try {
    const [result] = await connection.execute(
      'DELETE FROM sevaks WHERE sevak_id = ?',
      [sevakId]
    ) as any[];

    return result.affectedRows > 0;
  } finally {
    await connection.end();
  }
}

// Update sevak information
export async function updateSevak(sevakId: string, name: string, gender: 'male' | 'female', deviceTimeISO: string): Promise<boolean> {
  const connection = await createDbConnection();
  const deviceTimestamp = formatDeviceTimeForMySQL(deviceTimeISO);
  
  try {
    const [result] = await connection.execute(
      'UPDATE sevaks SET name = ?, gender = ?, device_updated_at = ? WHERE sevak_id = ?',
      [name.trim(), gender, deviceTimestamp, sevakId]
    ) as any[];

    return result.affectedRows > 0;
  } finally {
    await connection.end();
  }
}

// Get inspector activity (for admin view)
// export async function getInspectorActivity(startDate?: string, endDate?: string): Promise<any[]> {
//   const connection = await createDbConnection();
  
//   try {
//     let query = 'SELECT * FROM inspector_activity';
//     const params: any[] = [];
    
//     if (startDate && endDate) {
//       query += ' WHERE activity_date BETWEEN ? AND ?';
//       params.push(startDate, endDate);
//     }
    
//     query += ' ORDER BY activity_date DESC, total_transactions DESC';
    
//     const [rows] = await connection.execute(query, params) as any[];
//     return rows;
//   } finally {
//     await connection.end();
//   }
// }
// Replace the existing getInspectorActivity function in lib/db.ts with this:

// Get inspector activity (for admin view) - AGGREGATED BY INSPECTOR
// Replace the existing getInspectorActivity function in lib/db.ts with this:

// Get inspector activity (for admin view) - AGGREGATED BY INSPECTOR
export async function getInspectorActivity(startDate?: string, endDate?: string): Promise<any[]> {
  const connection = await createDbConnection();
  
  try {
    let query = `
      SELECT 
        user_email,
        user_name,
        user_role,
        COUNT(DISTINCT sevak_id) as unique_sevaks,
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN transaction_type = 'ADD' THEN points_change ELSE 0 END), 0) as total_added,
        COALESCE(SUM(CASE WHEN transaction_type = 'DEDUCT' THEN ABS(points_change) ELSE 0 END), 0) as total_deducted,
        COALESCE(SUM(CASE WHEN transaction_type = 'ATTENDANCE' THEN points_change ELSE 0 END), 0) as attendance_points,
        MIN(DATE(device_timestamp)) as first_activity_date,
        MAX(DATE(device_timestamp)) as last_activity_date
      FROM transactions
      WHERE user_email != 'System' AND user_name != 'System'
    `;
    
    const params: any[] = [];
    
    if (startDate && endDate) {
      query += ' AND DATE(device_timestamp) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    query += ` 
      GROUP BY user_email, user_name, user_role
      ORDER BY total_transactions DESC, user_name ASC
    `;
    
    const [rows] = await connection.execute(query, params) as any[];
    return rows;
  } finally {
    await connection.end();
  }
}

// Get detailed transactions by inspector
export async function getTransactionsByInspector(userEmail: string, startDate?: string, endDate?: string): Promise<any[]> {
  const connection = await createDbConnection();
  
  try {
    let query = `
      SELECT 
        t.*,
        s.sevak_id,
        s.name as sevak_name,
        s.gender as sevak_gender
      FROM transactions t
      JOIN sevaks s ON t.sevak_id = s.id
      WHERE t.user_email = ?
    `;
    const params: any[] = [userEmail];
    
    if (startDate && endDate) {
      query += ' AND DATE(t.device_timestamp) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    query += ' ORDER BY t.device_timestamp DESC';
    
    const [rows] = await connection.execute(query, params) as any[];
    return rows;
  } finally {
    await connection.end();
  }
}

// Get sevak by ID (for edit)
export async function getSevakById(sevakId: string): Promise<Sevak | null> {
  const connection = await createDbConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM sevaks WHERE sevak_id = ?',
      [sevakId]
    ) as any[];
    if (rows.length === 0) return null;
    return rows[0] as Sevak;
  } finally {
    await connection.end();
  }
}

// Get system config
export async function getSystemConfig(key: string): Promise<string | null> {
  const connection = await createDbConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT config_value FROM system_config WHERE config_key = ?',
      [key]
    ) as any[];
    if (rows.length === 0) return null;
    return rows[0].config_value;
  } finally {
    await connection.end();
  }
}