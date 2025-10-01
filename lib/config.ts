// Attendance Configuration - Change values here to update system-wide
export const ATTENDANCE_CONFIG = {
  // Time settings (24-hour format)
  ON_TIME_CUTOFF: {
    HOUR: parseInt('8'),
    MINUTE: parseInt('30')
  },
  
  // Points awarded
  POINTS: {
    ON_TIME: parseInt('50'),
    LATE: parseInt('25')
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
// export function getFormattedCutoffTime(): string {
//   const hour = ATTENDANCE_CONFIG.ON_TIME_CUTOFF.HOUR;
//   const minute = ATTENDANCE_CONFIG.ON_TIME_CUTOFF.MINUTE;
//   const apm = (ATTENDANCE_CONFIG.ON_TIME_CUTOFF.HOUR >= 12)? "AM":"PM";
//   return `${hour}:${minute.toString().padStart(2, '0')} ${apm}`;
// }
export function getFormattedCutoffTime(): string {
  let hour = ATTENDANCE_CONFIG.ON_TIME_CUTOFF.HOUR;
  const minute = ATTENDANCE_CONFIG.ON_TIME_CUTOFF.MINUTE;

  const apm = hour >= 12 ? "PM" : "AM";

  // Convert 24-hour → 12-hour
  if (hour === 0) {
    hour = 12; // midnight
  } else if (hour > 12) {
    hour = hour - 12;
  }

  // Add leading zeros
  const formattedHour = hour.toString().padStart(2, "0");
  const formattedMinute = minute.toString().padStart(2, "0");

  return `${formattedHour}:${formattedMinute} ${apm}`;
}
