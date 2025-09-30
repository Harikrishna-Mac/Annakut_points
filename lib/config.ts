// Attendance Configuration - Change values here to update system-wide
export const ATTENDANCE_CONFIG = {
  // Time settings (24-hour format)
  ON_TIME_CUTOFF: {
    HOUR: parseInt(process.env.ATTENDANCE_ON_TIME_HOUR || '8'),
    MINUTE: parseInt(process.env.ATTENDANCE_ON_TIME_MINUTE || '30')
  },
  
  // Points awarded
  POINTS: {
    ON_TIME: parseInt(process.env.ATTENDANCE_ON_TIME_POINTS || '50'),
    LATE: parseInt(process.env.ATTENDANCE_LATE_POINTS || '25')
  },
  
  // Other attendance settings
  MAX_ATTEMPTS_PER_DAY: 1,
  TIMEZONE: 'Asia/Kolkata'
};

// Helper function to check if current time is on-time
// Add new function to check time with client's hour and minute
export function isOnTimeWithClientTime(clientHour: number, clientMinute: number): boolean {
  return clientHour < ATTENDANCE_CONFIG.ON_TIME_CUTOFF.HOUR || 
         (clientHour === ATTENDANCE_CONFIG.ON_TIME_CUTOFF.HOUR && 
          clientMinute <= ATTENDANCE_CONFIG.ON_TIME_CUTOFF.MINUTE);
}

// Get points based on client time
export function getAttendancePointsWithClientTime(clientHour: number, clientMinute: number): { points: number; isOnTime: boolean } {
  const isOnTime = isOnTimeWithClientTime(clientHour, clientMinute);
  return {
    points: isOnTime ? ATTENDANCE_CONFIG.POINTS.ON_TIME : ATTENDANCE_CONFIG.POINTS.LATE,
    isOnTime
  };
}

// Format cutoff time for display
export function getFormattedCutoffTime(): string {
  const hour = ATTENDANCE_CONFIG.ON_TIME_CUTOFF.HOUR;
  const minute = ATTENDANCE_CONFIG.ON_TIME_CUTOFF.MINUTE;
  return `${hour}:${minute.toString().padStart(2, '0')}`;
}