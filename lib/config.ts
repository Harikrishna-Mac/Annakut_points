// Attendance Configuration - Change values here to update system-wide
export const ATTENDANCE_CONFIG = {
  MAX_DAILY_POINTS_PER_SEVAK: 30, // Change this value to adjust daily limit
  
  // Gender ID ranges
  MALE_ID_START: 1,
  MALE_ID_END: 300,
  FEMALE_ID_START: 301,
  
  // Point system
  POINTS_PER_ACTION: 10,
  INITIAL_SEVAK_POINTS: 100,
  
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

// Helper function to get max daily points
export function getMaxDailyPoints(): number {
  return ATTENDANCE_CONFIG.MAX_DAILY_POINTS_PER_SEVAK;
}

// Helper function to check if within male ID range
export function isMaleIdRange(idNumber: number): boolean {
  return idNumber >= ATTENDANCE_CONFIG.MALE_ID_START && idNumber <= ATTENDANCE_CONFIG.MALE_ID_END;
}

// Helper function to check if within female ID range
export function isFemaleIdRange(idNumber: number): boolean {
  return idNumber >= ATTENDANCE_CONFIG.FEMALE_ID_START;
}

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


export default ATTENDANCE_CONFIG;