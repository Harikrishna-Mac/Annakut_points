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
export function isOnTimeAttendance(): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  return currentHour < ATTENDANCE_CONFIG.ON_TIME_CUTOFF.HOUR || 
         (currentHour === ATTENDANCE_CONFIG.ON_TIME_CUTOFF.HOUR && 
          currentMinute <= ATTENDANCE_CONFIG.ON_TIME_CUTOFF.MINUTE);
}

// Get points for current time
export function getAttendancePoints(): { points: number; isOnTime: boolean } {
  const isOnTime = isOnTimeAttendance();
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