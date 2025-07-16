import { testCalendarAccess, listGoogleCalendars } from '../../lib/googleCalendar';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== API: Testing Calendar Access ===');
    
    // Test 1: List all accessible calendars
    console.log('🔍 Test 1: Listing all calendars...');
    const calendars = await listGoogleCalendars();
    
    // Test 2: Test access to specific calendar
    console.log('🔍 Test 2: Testing specific calendar access...');
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    const accessTest = await testCalendarAccess(calendarId);
    
    const result = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      calendarId: calendarId,
      accessibleCalendars: calendars?.length || 0,
      calendarList: calendars?.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        accessRole: cal.accessRole,
        primary: cal.primary
      })) || [],
      specificCalendarTest: accessTest
    };
    
    console.log('✅ Test completed successfully');
    console.log('📊 Results:', JSON.stringify(result, null, 2));
    
    res.status(200).json(result);
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({
      error: 'Failed to test calendar access',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 