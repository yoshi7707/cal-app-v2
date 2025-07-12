import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Alternative Method: Using GoogleAuth (most reliable)
const createServiceAccountClientAlternative = () => {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !rawPrivateKey) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in environment.');
  }

  // Clean up the private key
  let privateKey = rawPrivateKey;
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  privateKey = privateKey.replace(/^["']|["']$/g, '');

  // Create credentials object
  const credentials = {
    type: 'service_account',
    project_id: 'cal-app-koshigaya', // Replace with your project ID
    private_key_id: 'dummy',
    private_key: privateKey,
    client_email: clientEmail,
    client_id: 'dummy',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
  };

  console.log('Creating auth with GoogleAuth...');
  const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/calendar']
  });

  return auth;
};

// TEMPORARY: Test with hardcoded values (REMOVE BEFORE COMMITTING)
const createServiceAccountClientTest = () => {
  const clientEmail = 'your-service-account@project.iam.gserviceaccount.com'; // Replace with your email
  const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----`; // Replace with your actual key

  console.log('=== TESTING WITH HARDCODED VALUES ===');
  console.log('Client Email:', clientEmail);
  console.log('Private Key Length:', privateKey.length);
  console.log('Private Key Type:', typeof privateKey);

  const auth = new google.auth.JWT(
    clientEmail,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/calendar']
  );

  return auth;
};

// Method 1: Environment Variables using fromJSON (More reliable)
const createServiceAccountClientFromEnv = () => {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !rawPrivateKey) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in environment.');
  }

  // Clean up the private key - handle both escaped and unescaped newlines
  let privateKey = rawPrivateKey;
  
  // If it contains literal \n, replace with actual newlines
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  
  // Remove any surrounding quotes
  privateKey = privateKey.replace(/^["']|["']$/g, '');
  
  // Validate the key format
  if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
    throw new Error('Invalid private key format. Key must contain BEGIN and END PRIVATE KEY markers.');
  }

  // Create a service account key object
  const serviceAccountKey = {
    type: 'service_account',
    client_email: clientEmail,
    private_key: privateKey,
    private_key_id: 'dummy-key-id', // This can be a placeholder
    client_id: 'dummy-client-id',   // This can be a placeholder
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
  };

  console.log('Creating JWT with fromJSON method...');
  console.log('- clientEmail:', clientEmail);
  console.log('- privateKey length:', privateKey.length);

  // Use fromJSON instead of constructor
  const auth = google.auth.fromJSON(serviceAccountKey);
  auth.scopes = ['https://www.googleapis.com/auth/calendar'];

  return auth;
};

// Method 2: JSON File (Good for development)
const createServiceAccountClientFromFile = () => {
  try {
    const keyPath = path.join(process.cwd(), 'service-account-key.json');
    
    if (!fs.existsSync(keyPath)) {
      throw new Error('Service account key file not found at: ' + keyPath);
    }

    const keyContent = fs.readFileSync(keyPath, 'utf8');
    const key = JSON.parse(keyContent);

    if (!key.private_key || !key.client_email) {
      throw new Error('Invalid service account key file. Missing private_key or client_email.');
    }

    console.log('Creating JWT with fromJSON method (file)...');
    const auth = google.auth.fromJSON(key);
    auth.scopes = ['https://www.googleapis.com/auth/calendar'];

    return auth;
  } catch (error) {
    console.error('Error reading service account key file:', error);
    throw error;
  }
};

// Main function that tries different methods
const createServiceAccountClient = () => {
  try {
    // Try the alternative method first (most reliable)
    return createServiceAccountClientAlternative();
  } catch (altError) {
    console.log('Alternative method failed, trying fromJSON...');
    try {
      // Try environment variables with fromJSON
      return createServiceAccountClientFromEnv();
    } catch (envError) {
      console.log('Environment variables not found, trying JSON file...');
      try {
        return createServiceAccountClientFromFile();
      } catch (fileError) {
        console.error('All methods failed:');
        console.error('Alternative error:', altError.message);
        console.error('Environment error:', envError.message);
        console.error('File error:', fileError.message);
        throw new Error('Could not create service account client. Please check your credentials.');
      }
    }
  }
};

// Get Google Calendar API instance
const getCalendarAPI = (auth) => {
  return google.calendar({ version: 'v3', auth });
};

// Fetch events from Google Calendar
export async function fetchGoogleCalendarEvents(calendarId = 'primary', timeMin = null, timeMax = null) {
  try {
    console.log('Starting Google Calendar fetch...');
    
    const auth = createServiceAccountClient();
    console.log('Auth object created');
    
    // For GoogleAuth, we need to get the client
    const authClient = auth.getClient ? await auth.getClient() : auth;
    console.log('Auth client obtained');
    
    const calendar = google.calendar({ version: 'v3', auth: authClient });
    console.log('Calendar API created');
    
    const params = {
      calendarId: calendarId,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    };

    // Add time filters if provided
    if (timeMin) {
      params.timeMin = timeMin;
    }
    if (timeMax) {
      params.timeMax = timeMax;
    }

    console.log('Fetching events with params:', params);
    const response = await calendar.events.list(params);
    console.log('Google API response:', response.data.items?.length || 0, 'events');
    
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
    throw new Error(`Failed to fetch Google Calendar events: ${error.message}`);
  }
}

// Create event in Google Calendar
export async function createGoogleCalendarEvent(eventData, calendarId = 'primary') {
  try {
    const auth = createServiceAccountClient();
    await auth.authorize();
    
    const calendar = getCalendarAPI(auth);
    
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

    const response = await calendar.events.insert({
      calendarId: calendarId,
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
    console.error('Error creating Google Calendar event:', error);
    throw new Error(`Failed to create Google Calendar event: ${error.message}`);
  }
}

// Update event in Google Calendar
export async function updateGoogleCalendarEvent(eventId, eventData, calendarId = 'primary') {
  try {
    const auth = createServiceAccountClient();
    await auth.authorize();
    
    const calendar = getCalendarAPI(auth);
    
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
    await auth.authorize();
    
    const calendar = getCalendarAPI(auth);
    
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