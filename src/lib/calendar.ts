/**
 * Calendar utilities for generating "Add to Calendar" links
 */

export interface CalendarEvent {
  title: string
  description: string
  location: string
  startDate: string // YYYY-MM-DD
  startTime: string // HH:MM
  durationMinutes: number
}

/**
 * Generate a Google Calendar URL for adding an event
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const { title, description, location, startDate, startTime, durationMinutes } = event
  
  // Parse start datetime
  const [year, month, day] = startDate.split('-').map(Number)
  const [hours, minutes] = startTime.split(':').map(Number)
  
  // Create start and end times in UTC format (YYYYMMDDTHHMMSS)
  const startDt = new Date(year, month - 1, day, hours, minutes)
  const endDt = new Date(startDt.getTime() + durationMinutes * 60 * 1000)
  
  const formatDate = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
  }
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatDate(startDt)}/${formatDate(endDt)}`,
    details: description,
    location: location,
  })
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Generate an iCal (.ics) file content
 */
export function generateIcsContent(event: CalendarEvent): string {
  const { title, description, location, startDate, startTime, durationMinutes } = event
  
  // Parse start datetime
  const [year, month, day] = startDate.split('-').map(Number)
  const [hours, minutes] = startTime.split(':').map(Number)
  
  const startDt = new Date(year, month - 1, day, hours, minutes)
  const endDt = new Date(startDt.getTime() + durationMinutes * 60 * 1000)
  
  const formatDate = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
  }
  
  // Escape special characters for iCal
  const escapeIcal = (str: string) => str.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n')
  
  const uid = `${Date.now()}-${Math.random().toString(36).substring(2)}@dinkup.link`
  
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DinkUp//Pickleball//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startDt)}`,
    `DTEND:${formatDate(endDt)}`,
    `SUMMARY:${escapeIcal(title)}`,
    `DESCRIPTION:${escapeIcal(description)}`,
    `LOCATION:${escapeIcal(location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

/**
 * Download an .ics file
 */
export function downloadIcsFile(event: CalendarEvent, filename: string = 'event.ics'): void {
  const content = generateIcsContent(event)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Create calendar event from session data
 */
export function createSessionCalendarEvent(
  poolName: string,
  location: string,
  courtNumbers: string[] | null,
  proposedDate: string,
  proposedTime: string,
  durationMinutes: number,
  sessionUrl: string
): CalendarEvent {
  const courtInfo = courtNumbers?.length 
    ? ` (Court${courtNumbers.length > 1 ? 's' : ''} ${courtNumbers.join(', ')})`
    : ''
  
  return {
    title: `🏓 ${poolName} Pickleball`,
    description: `Pickleball session with ${poolName}.\n\nView details: ${sessionUrl}`,
    location: `${location}${courtInfo}`,
    startDate: proposedDate,
    startTime: proposedTime,
    durationMinutes,
  }
}
