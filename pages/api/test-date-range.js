import { getCurrentAndNextMonthEvents } from '../../prisma/event';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      console.log('Testing date range filtering...');
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      // Start of current month
      const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
      
      // End of next month
      const endOfNextMonth = new Date(currentYear, currentMonth + 2, 0);
      
      // Format dates as YYYY-MM-DD for database comparison
      const startDate = startOfCurrentMonth.toISOString().split('T')[0];
      const endDate = endOfNextMonth.toISOString().split('T')[0];
      
      console.log(`Current date: ${now.toISOString()}`);
      console.log(`Start date: ${startDate}`);
      console.log(`End date: ${endDate}`);
      
      const events = await getCurrentAndNextMonthEvents();
      
      console.log(`Found ${events.length} events in current and next month`);
      
      // Show first few events
      const sampleEvents = events.slice(0, 5);
      
      res.status(200).json({
        currentDate: now.toISOString(),
        startDate,
        endDate,
        totalEvents: events.length,
        sampleEvents
      });
      
    } catch (error) {
      console.error('Test error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 