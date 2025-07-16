import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Create service account client from JSON file or environment variables
const createServiceAccountClient = () => {
  try {
    console.log('=== GOOGLE CALENDAR DEBUG: Creating service account client ===');
    
    // First, try to read JSON file (for local development)
    const keyPath = path.join(process.cwd(), 'service-account-key.json');
    console.log('Key file path:', keyPath);
    
    if (fs.existsSync(keyPath)) {
      console.log('✅ Service account key file found, using file for authentication');
      
      const keyContent = fs.readFileSync(keyPath, 'utf8');
      console.log('Key file read successfully, length:', keyContent.length);
      
      const key = JSON.parse(keyContent);
      console.log('✅ Key parsed successfully');
      console.log('🔑 Service Account Email:', key.client_email);
      console.log('📁 Project ID:', key.project_id);
      
      // Use GoogleAuth instead of JWT
      const auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/calendar']
      });
      
      console.log('✅ GoogleAuth object created successfully from file');
      return auth;
    } else {
      console.log('❌ Service account key file not found, trying environment variables...');
      
      // Fallback to environment variables (for Vercel deployment)
      const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
      const calendarId = process.env.GOOGLE_CALENDAR_ID;
      
      console.log('🔍 Environment Variables Check:');
      console.log('  - GOOGLE_SERVICE_ACCOUNT_EMAIL:', clientEmail ? '✅ Set' : '❌ Not set');
      console.log('  - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:', privateKey ? '✅ Set (' + privateKey.length + ' chars)' : '❌ Not set');
      console.log('  - GOOGLE_CALENDAR_ID:', calendarId || '❌ Not set (will use primary)');
      
      if (clientEmail && privateKey) {
        console.log('✅ Using environment variables for authentication');
        console.log('🔑 Service Account Email (from env):', clientEmail);
        
        // Use environment variables
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: clientEmail,
            private_key: privateKey.replace(/\\n/g, '\n'),
          },
          scopes: ['https://www.googleapis.com/auth/calendar']
        });
        
        console.log('✅ GoogleAuth object created successfully from environment variables');
        return auth;
      } else {
        console.log('❌ Missing required environment variables');
        throw new Error('Service account key file not found and environment variables not set. Please either save your JSON file as service-account-key.json in the project root or set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY environment variables.');
      }
    }
  } catch (error) {
    console.error('❌ Error creating service account client:', error);
    throw error;
  }
};

// Get Google Calendar API instance
const getCalendarAPI = (auth) => {
  return google.calendar({ version: 'v3', auth });
};

// Add this function to list available calendars
export async function listGoogleCalendars() {
  try {
    console.log('=== GOOGLE CALENDAR DEBUG: Listing calendars ===');
    
    const auth = createServiceAccountClient();
    const authClient = await auth.getClient();
    const calendar = getCalendarAPI(authClient);
    
    console.log('🔍 Fetching calendar list...');
    const response = await calendar.calendarList.list();
    
    console.log('✅ Available calendars:');
    if (response.data.items && response.data.items.length > 0) {
      response.data.items.forEach((cal, index) => {
        console.log(`  ${index + 1}. ${cal.summary} (${cal.id})`);
        console.log(`     - Access Role: ${cal.accessRole}`);
        console.log(`     - Primary: ${cal.primary ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('❌ No calendars found - service account has no calendar access');
    }
    
    return response.data.items;
  } catch (error) {
    console.error('❌ Error listing calendars:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      status: error.status
    });
    throw error;
  }
}

// Debug function to test calendar access
export async function testCalendarAccess(calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary') {
  try {
    console.log('=== GOOGLE CALENDAR DEBUG: Testing calendar access ===');
    console.log('📅 Testing access to calendar:', calendarId);
    
    const auth = createServiceAccountClient();
    const authClient = await auth.getClient();
    const calendar = getCalendarAPI(authClient);
    
    // Test calendar access
    console.log('🔍 Testing calendar access...');
    const calendarInfo = await calendar.calendars.get({ calendarId: calendarId });
    console.log('✅ Calendar access successful!');
    console.log('📋 Calendar info:', {
      id: calendarInfo.data.id,
      summary: calendarInfo.data.summary,
      description: calendarInfo.data.description,
      timeZone: calendarInfo.data.timeZone
    });
    
    // Test listing events
    console.log('🔍 Testing event listing...');
    const eventsResponse = await calendar.events.list({
      calendarId: calendarId,
      maxResults: 5,
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    console.log('✅ Event listing successful!');
    console.log(`📊 Found ${eventsResponse.data.items?.length || 0} events`);
    
    return {
      success: true,
      calendarInfo: calendarInfo.data,
      eventCount: eventsResponse.data.items?.length || 0
    };
  } catch (error) {
    console.error('❌ Calendar access test failed:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      status: error.status
    });
    return {
      success: false,
      error: error.message
    };
  }
}

// Updated fetch function with better error handling
export async function fetchGoogleCalendarEvents(calendarId = 'primary', timeMin = null, timeMax = null) {
  try {
    console.log('Starting Google Calendar fetch...');
    
    const auth = createServiceAccountClient();
    console.log('Auth object created');
    
    console.log('Getting auth client...');
    const authClient = await auth.getClient();
    console.log('Auth client obtained successfully');
    
    const calendar = getCalendarAPI(authClient);
    console.log('Calendar API created');
    
    // First, let's check what calendars are available
    try {
      const calendarList = await calendar.calendarList.list();
      console.log('Available calendars:', calendarList.data.items.map(c => `${c.summary} (${c.id})`));
    } catch (listError) {
      console.log('Could not list calendars:', listError.message);
    }
    
    const params = {
      calendarId: calendarId,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    };

    // If no time range specified, get events from 30 days ago to 30 days in future
    if (!timeMin && !timeMax) {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      params.timeMin = thirtyDaysAgo.toISOString();
      params.timeMax = thirtyDaysFromNow.toISOString();
    } else {
      if (timeMin) params.timeMin = timeMin;
      if (timeMax) params.timeMax = timeMax;
    }

    console.log('Fetching events with params:', params);
    const response = await calendar.events.list(params);
    console.log('Google API response:', response.data.items?.length || 0, 'events');
    
    if (response.data.items?.length === 0) {
      console.log('No events found. This could mean:');
      console.log('1. The calendar has no events in the specified time range');
      console.log('2. The service account doesn\'t have access to this calendar');
      console.log('3. The calendar ID is incorrect');
      
      // Try to get calendar info to verify access
      try {
        const calendarInfo = await calendar.calendars.get({ calendarId: calendarId });
        console.log('Calendar info:', calendarInfo.data.summary);
      } catch (calError) {
        console.log('Cannot access calendar info:', calError.message);
        console.log('This suggests the service account doesn\'t have access to this calendar');
      }
    }
    
    const events = response.data.items.map(event => ({
      id: event.id,
      title: event.summary || 'No Title',
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      description: event.description || '',
      location: event.location || '',
      allDay: !event.start.dateTime,
      googleEventId: event.id,
      htmlLink: event.htmlLink,
    }));

    console.log('Processed events:', events.length);
    return events;
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    
    // More specific error messages
    if (error.message.includes('404')) {
      throw new Error('Calendar not found. Make sure the calendar ID is correct and the service account has access.');
    } else if (error.message.includes('403')) {
      throw new Error('Access denied. Make sure the service account has been granted access to the calendar.');
    } else {
      throw new Error(`Failed to fetch Google Calendar events: ${error.message}`);
    }
  }
}

// Check if event already exists in Google Calendar
export async function findExistingGoogleEvent(eventData, calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary') {
  try {
    const auth = createServiceAccountClient();
    const authClient = await auth.getClient();
    const calendar = getCalendarAPI(authClient);
    
    // Search for events with the same title and time
    const timeMin = new Date(eventData.start);
    const timeMax = new Date(eventData.end);
    
    // Add some buffer time for search
    timeMin.setMinutes(timeMin.getMinutes() - 30);
    timeMax.setMinutes(timeMax.getMinutes() + 30);
    
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      q: eventData.title // Search by title
    });
    
    // Check if any of the returned events match our criteria
    const matchingEvents = response.data.items.filter(event => {
      const eventStart = new Date(event.start.dateTime || event.start.date);
      const eventEnd = new Date(event.end.dateTime || event.end.date);
      const ourStart = new Date(eventData.start);
      const ourEnd = new Date(eventData.end);
      
      // Check if title matches and times are close (within 5 minutes)
      const titleMatches = event.summary === eventData.title;
      const startTimeClose = Math.abs(eventStart.getTime() - ourStart.getTime()) < 5 * 60 * 1000;
      const endTimeClose = Math.abs(eventEnd.getTime() - ourEnd.getTime()) < 5 * 60 * 1000;
      
      return titleMatches && startTimeClose && endTimeClose;
    });
    
    return matchingEvents.length > 0 ? matchingEvents[0] : null;
  } catch (error) {
    console.error('Error finding existing Google Calendar event:', error);
    return null;
  }
}

// Create event in Google Calendar
// export async function createGoogleCalendarEvent(eventData, calendarId = 'primary') {
  export async function createGoogleCalendarEvent(eventData, calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary') {
  try {
    console.log('=== GOOGLE CALENDAR DEBUG: Creating event ===');
    console.log('📅 Calendar ID being used:', calendarId);
    console.log('📝 Event data:', {
      title: eventData.title,
      start: eventData.start,
      end: eventData.end,
      allDay: eventData.allDay
    });
    
    const auth = createServiceAccountClient();
    console.log('✅ Auth object created');
    
    const authClient = await auth.getClient();
    console.log('✅ Auth client obtained');
    
    const calendar = getCalendarAPI(authClient);
    console.log('✅ Calendar API created');
    
    // Check calendar access first
    try {
      console.log('🔍 Checking calendar access...');
      const calendarInfo = await calendar.calendars.get({ calendarId: calendarId });
      console.log('✅ Calendar access confirmed:', calendarInfo.data.summary);
    } catch (accessError) {
      console.log('❌ Cannot access calendar:', accessError.message);
      console.log('💡 This suggests the service account does not have access to this calendar');
      throw new Error(`Cannot access calendar ${calendarId}: ${accessError.message}`);
    }
    
    const event = {
      summary: eventData.title,
      description: eventData.description || '',
      location: eventData.location || '',
      start: {
        dateTime: eventData.allDay ? undefined : eventData.start,
        date: eventData.allDay ? eventData.start.split('T')[0] : undefined,
        timeZone: 'UTC',
      },
      end: {
        dateTime: eventData.allDay ? undefined : eventData.end,
        date: eventData.allDay ? eventData.end.split('T')[0] : undefined,
        timeZone: 'UTC',
      },
    };

    console.log('📤 Sending event to Google Calendar...');
    console.log('📋 Event payload:', JSON.stringify(event, null, 2));
    
    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
    });

    console.log('✅ Event created successfully in Google Calendar!');
    console.log('🆔 Google Event ID:', response.data.id);
    console.log('🔗 Google Calendar Link:', response.data.htmlLink);

    return {
      id: response.data.id,
      title: response.data.summary,
      start: response.data.start.dateTime || response.data.start.date,
      end: response.data.end.dateTime || response.data.end.date,
      description: response.data.description,
      location: response.data.location,
      googleEventId: response.data.id,
      htmlLink: response.data.htmlLink,
    };
  } catch (error) {
    console.error('❌ Error creating Google Calendar event:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      status: error.status
    });
    throw new Error(`Failed to create Google Calendar event: ${error.message}`);
  }
}

// Update event in Google Calendar
export async function updateGoogleCalendarEvent(eventId, eventData, calendarId = 'primary') {
  try {
    const auth = createServiceAccountClient();
    const authClient = await auth.getClient();
    
    const calendar = getCalendarAPI(authClient);
    
    const event = {
      summary: eventData.title,
      description: eventData.description || '',
      location: eventData.location || '',
      start: {
        dateTime: eventData.allDay ? undefined : eventData.start,
        date: eventData.allDay ? eventData.start.split('T')[0] : undefined,
        timeZone: 'UTC',
      },
      end: {
        dateTime: eventData.allDay ? undefined : eventData.end,
        date: eventData.allDay ? eventData.end.split('T')[0] : undefined,
        timeZone: 'UTC',
      },
    };

    const response = await calendar.events.update({
      calendarId: calendarId,
      eventId: eventId,
      resource: event,
    });

    return {
      id: response.data.id,
      title: response.data.summary,
      start: response.data.start.dateTime || response.data.start.date,
      end: response.data.end.dateTime || response.data.end.date,
      description: response.data.description,
      location: response.data.location,
      googleEventId: response.data.id,
      htmlLink: response.data.htmlLink,
    };
  } catch (error) {
    console.error('Error updating Google Calendar event:', error);
    throw new Error(`Failed to update Google Calendar event: ${error.message}`);
  }
}

// Delete event from Google Calendar
export async function deleteGoogleCalendarEvent(eventId, calendarId = 'primary') {
  try {
    const auth = createServiceAccountClient();
    const authClient = await auth.getClient();
    
    const calendar = getCalendarAPI(authClient);
    
    await calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId,
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting Google Calendar event:', error);
    throw new Error(`Failed to delete Google Calendar event: ${error.message}`);
  }
}