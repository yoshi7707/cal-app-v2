import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const createServiceAccountClient = () => {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !rawPrivateKey) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in environment.');
  }

  const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT(
    clientEmail,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/calendar']
  );

  return auth;
};

// const createServiceAccountClient = () => {
//   try {
//     const keyPath = path.join(process.cwd(), 'service-account-key.json');
//     const keyContent = fs.readFileSync(keyPath, 'utf8');
//     const key = JSON.parse(keyContent);

//     if (!key.private_key || !key.client_email) {
//       throw new Error('Missing private_key or client_email');
//     }

//     const cleanedKey = key.private_key.includes('\\n')
//       ? key.private_key.replace(/\\n/g, '\n')
//       : key.private_key;

//     const auth = new google.auth.JWT(
//       key.client_email,
//       null,
//       cleanedKey,
//       ['https://www.googleapis.com/auth/calendar']
//     );

//     return auth;
//   } catch (error) {
//     console.error('Error creating service account client:', error);
//     throw error;
//   }
// };

// const createServiceAccountClient = () => {
//   try {
//     console.log('Reading service account key file...');

//     const keyPath = path.join(process.cwd(), 'service-account-key.json');
//     console.log('Key file path:', keyPath);

//     if (!fs.existsSync(keyPath)) {
//       throw new Error('Service account key file not found.');
//     }

//     const keyContent = fs.readFileSync(keyPath, 'utf8');
//     console.log('Key file read successfully, length:', keyContent.length);

//     const key = JSON.parse(keyContent);
//     console.log('Key parsed successfully, client_email:', key.client_email);
    
//     if (!key.private_key || !key.client_email) {
//       throw new Error('Missing private_key or client_email in service account key.');
//     }

//     const cleanedKey = key.private_key.replace(/\\n/g, '\n');
//     console.log('Cleaned private key starts with:', cleanedKey.substring(0, 50));

//     const auth = new google.auth.JWT(
//       key.client_email,
//       null,
//       cleanedKey,
//       ['https://www.googleapis.com/auth/calendar']
//     );

//     console.log('JWT auth object created successfully');
//     return auth;
//   } catch (error) {
//     console.error('Error creating service account client:', error);
//     throw error;
//   }
// };

// Create service account client from JSON file
// const createServiceAccountClient = () => {
//   try {
//     console.log('Reading service account key file...');
    
//     // Read the service account JSON file
//     const keyPath = path.join(process.cwd(), 'service-account-key.json');
//     console.log('Key file path:', keyPath);
    
//     if (!fs.existsSync(keyPath)) {
//       throw new Error('Service account key file not found. Please save your JSON file as service-account-key.json in the project root.');
//     }
    
//     const keyContent = fs.readFileSync(keyPath, 'utf8');
//     console.log('Key file read successfully, length:', keyContent.length);
    
//     const key = JSON.parse(keyContent);
//     console.log('Key parsed successfully, client_email:', key.client_email);

//     const auth = new google.auth.JWT(
//       key.client_email,
//       null,
//       key.private_key.replace(/\\n/g, '\n'),
//       ['https://www.googleapis.com/auth/calendar']
//     );    
    
//     // const auth = new google.auth.JWT(
//     //   key.client_email,
//     //   null,
//     //   key.private_key,
//     //   ['https://www.googleapis.com/auth/calendar']
//     // );
    
//     console.log('JWT auth object created successfully');
//     console.log('Private key type:', typeof key.private_key);

//     return auth;
//   } catch (error) {
//     console.log('Raw private key preview:', key.private_key.substring(0, 50));
//     console.log('After replace:', key.private_key.replace(/\\n/g, '\n').substring(0, 50));

//     console.error('Error creating service account client:', error);
//     throw error;
//   }
// };

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
    
    console.log('Authorizing...');
    const tokens = await auth.authorize();
    console.log('Auth successful, tokens received:', !!tokens);
    
    const calendar = getCalendarAPI(auth);
    console.log('Calendar API created');
    
    const params = {
      calendarId: calendarId,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    };

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


// import { google } from 'googleapis';

// // Create service account client
// const createServiceAccountClient = () => {
//   console.log('Creating service account client...');
  
//   const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
//   const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  
//   console.log('Client email:', clientEmail);
//   console.log('Private key length:', privateKey?.length);
//   console.log('Private key starts with:', privateKey?.substring(0, 50));
  
//   if (!clientEmail || !privateKey) {
//     throw new Error('Missing required environment variables: GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
//   }
  
//   // Clean up the private key - remove quotes and fix newlines
//   const cleanPrivateKey = privateKey
//     .replace(/^"|"$/g, '') // Remove surrounding quotes
//     .replace(/\\n/g, '\n'); // Replace \n with actual newlines
  
//   console.log('Clean private key starts with:', cleanPrivateKey.substring(0, 50));
  
//   try {
//     const auth = new google.auth.JWT(
//       clientEmail,
//       null,
//       cleanPrivateKey,
//       ['https://www.googleapis.com/auth/calendar']
//     );
    
//     console.log('JWT auth object created successfully');
//     return auth;
//   } catch (error) {
//     console.error('Error creating JWT auth:', error);
//     throw error;
//   }
// };

// // Get Google Calendar API instance
// const getCalendarAPI = (auth) => {
//   return google.calendar({ version: 'v3', auth });
// };

// // Fetch events from Google Calendar
// export async function fetchGoogleCalendarEvents(calendarId = 'primary', timeMin = null, timeMax = null) {
//   try {
//     console.log('Starting Google Calendar fetch...');
//     console.log('Environment check:');
//     console.log('GOOGLE_SERVICE_ACCOUNT_EMAIL:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'Set' : 'Missing');
//     console.log('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:', process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? 'Set (length: ' + process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.length + ')' : 'Missing');
    
//     const auth = createServiceAccountClient();
//     console.log('Auth object created');
    
//     console.log('Authorizing...');
//     await auth.authorize();
//     console.log('Auth successful');
    
//     const calendar = getCalendarAPI(auth);
//     console.log('Calendar API created');
    
//     const params = {
//       calendarId: calendarId,
//       singleEvents: true,
//       orderBy: 'startTime',
//       maxResults: 100,
//     };

//     console.log('Fetching events with params:', params);
//     const response = await calendar.events.list(params);
//     console.log('Google API response:', response.data.items?.length || 0, 'events');
    
//     const events = response.data.items.map(event => ({
//       id: event.id,
//       title: event.summary || 'No Title',
//       start: event.start.dateTime || event.start.date,
//       end: event.end.dateTime || event.end.date,
//       description: event.description || '',
//       location: event.location || '',
//       allDay: !event.start.dateTime,
//       googleEventId: event.id,
//       htmlLink: event.htmlLink,
//     }));

//     console.log('Processed events:', events.length);
//     return events;
//   } catch (error) {
//     console.error('Error fetching Google Calendar events:', error);
//     throw new Error(`Failed to fetch Google Calendar events: ${error.message}`);
//   }
// }

// // Other functions remain the same...
// export async function createGoogleCalendarEvent(eventData, calendarId = 'primary') {
//   // Implementation for creating events
// }

// export async function updateGoogleCalendarEvent(eventId, eventData, calendarId = 'primary') {
//   // Implementation for updating events
// }

// export async function deleteGoogleCalendarEvent(eventId, calendarId = 'primary') {
//   // Implementation for deleting events
// }

// import { google } from 'googleapis';

// // Create service account client
// const createServiceAccountClient = () => {
//   const credentials = {
//     client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
//     private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
//   };

//   return new google.auth.JWT(
//     credentials.client_email,
//     null,
//     credentials.private_key,
//     ['https://www.googleapis.com/auth/calendar']
//   );
// };

// // Get Google Calendar API instance
// const getCalendarAPI = (auth) => {
//   return google.calendar({ version: 'v3', auth });
// };

// // Fetch events from Google Calendar
// export async function fetchGoogleCalendarEvents(calendarId = 'primary', timeMin = null, timeMax = null) {
//     try {
//       console.log('Starting Google Calendar fetch...');
//       console.log('Environment check:');
//       console.log('GOOGLE_SERVICE_ACCOUNT_EMAIL:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'Set' : 'Missing');
//       console.log('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:', process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? 'Set (length: ' + process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.length + ')' : 'Missing');
      
//       if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
//         throw new Error('Missing Google Service Account credentials in environment variables');
//       }
      
//       const auth = createServiceAccountClient();
//       console.log('Auth object created');
      
//       await auth.authorize();
//       console.log('Auth successful');
      
//       const calendar = getCalendarAPI(auth);
//       console.log('Calendar API created');
      
//       const params = {
//         calendarId: calendarId,
//         singleEvents: true,
//         orderBy: 'startTime',
//         maxResults: 100,
//       };
  
//       console.log('Fetching events with params:', params);
//       const response = await calendar.events.list(params);
//       console.log('Google API response:', response.data.items?.length || 0, 'events');
      
//       const events = response.data.items.map(event => ({
//         id: event.id,
//         title: event.summary || 'No Title',
//         start: event.start.dateTime || event.start.date,
//         end: event.end.dateTime || event.end.date,
//         description: event.description || '',
//         location: event.location || '',
//         allDay: !event.start.dateTime,
//         googleEventId: event.id,
//         htmlLink: event.htmlLink,
//       }));
  
//       console.log('Processed events:', events.length);
//       return events;
//     } catch (error) {
//       console.error('Error fetching Google Calendar events:', error);
//       throw new Error(`Failed to fetch Google Calendar events: ${error.message}`);
//     }
//   }

// // Create event in Google Calendar
// export async function createGoogleCalendarEvent(eventData, calendarId = 'primary') {
//   try {
//     const auth = createServiceAccountClient();
//     await auth.authorize();
    
//     const calendar = getCalendarAPI(auth);
    
//     const event = {
//       summary: eventData.title,
//       description: eventData.description || '',
//       location: eventData.location || '',
//       start: {
//         dateTime: eventData.allDay ? undefined : eventData.start,
//         date: eventData.allDay ? eventData.start.split('T')[0] : undefined,
//         timeZone: 'UTC',
//       },
//       end: {
//         dateTime: eventData.allDay ? undefined : eventData.end,
//         date: eventData.allDay ? eventData.end.split('T')[0] : undefined,
//         timeZone: 'UTC',
//       },
//     };

//     const response = await calendar.events.insert({
//       calendarId: calendarId,
//       resource: event,
//     });

//     return {
//       id: response.data.id,
//       title: response.data.summary,
//       start: response.data.start.dateTime || response.data.start.date,
//       end: response.data.end.dateTime || response.data.end.date,
//       description: response.data.description,
//       location: response.data.location,
//       googleEventId: response.data.id,
//       htmlLink: response.data.htmlLink,
//     };
//   } catch (error) {
//     console.error('Error creating Google Calendar event:', error);
//     throw new Error(`Failed to create Google Calendar event: ${error.message}`);
//   }
// }

// // Update event in Google Calendar
// export async function updateGoogleCalendarEvent(eventId, eventData, calendarId = 'primary') {
//   try {
//     const auth = createServiceAccountClient();
//     await auth.authorize();
    
//     const calendar = getCalendarAPI(auth);
    
//     const event = {
//       summary: eventData.title,
//       description: eventData.description || '',
//       location: eventData.location || '',
//       start: {
//         dateTime: eventData.allDay ? undefined : eventData.start,
//         date: eventData.allDay ? eventData.start.split('T')[0] : undefined,
//         timeZone: 'UTC',
//       },
//       end: {
//         dateTime: eventData.allDay ? undefined : eventData.end,
//         date: eventData.allDay ? eventData.end.split('T')[0] : undefined,
//         timeZone: 'UTC',
//       },
//     };

//     const response = await calendar.events.update({
//       calendarId: calendarId,
//       eventId: eventId,
//       resource: event,
//     });

//     return {
//       id: response.data.id,
//       title: response.data.summary,
//       start: response.data.start.dateTime || response.data.start.date,
//       end: response.data.end.dateTime || response.data.end.date,
//       description: response.data.description,
//       location: response.data.location,
//       googleEventId: response.data.id,
//       htmlLink: response.data.htmlLink,
//     };
//   } catch (error) {
//     console.error('Error updating Google Calendar event:', error);
//     throw new Error(`Failed to update Google Calendar event: ${error.message}`);
//   }
// }

// // Delete event from Google Calendar
// export async function deleteGoogleCalendarEvent(eventId, calendarId = 'primary') {
//   try {
//     const auth = createServiceAccountClient();
//     await auth.authorize();
    
//     const calendar = getCalendarAPI(auth);
    
//     await calendar.events.delete({
//       calendarId: calendarId,
//       eventId: eventId,
//     });

//     return { success: true };
//   } catch (error) {
//     console.error('Error deleting Google Calendar event:', error);
//     throw new Error(`Failed to delete Google Calendar event: ${error.message}`);
//   }
// }