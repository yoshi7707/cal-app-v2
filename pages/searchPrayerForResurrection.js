import React, { useState, useEffect } from 'react';

const DisplayComponent = ({ events = [] }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [sortedEvents, setSortedEvents] = useState([]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const twoWeeksFromNow = new Date(today);
    twoWeeksFromNow.setDate(today.getDate() + 14);
    twoWeeksFromNow.setHours(23, 59, 59, 999);

    const processedEvents = events.map(event => ({
      ...event,
      start: event.start instanceof Date ? event.start : new Date(event.start),
      end: event.end instanceof Date ? event.end : new Date(event.end)
    }));

    // Filter events
    const filtered = events.filter(event =>
      event.start >= today && event.start <= twoWeeksFromNow
    );

    // const filtered = processedEvents
    //   .filter(event => {
    //     const isValid = event.end >= today;
    //     return isValid;
    //   })
    //   .sort((a, b) => a.start - b.start);

    setSortedEvents(filtered);
  }, [events]);

  const handleDisplay = () => {
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  const handleCopy = () => {
    const textToCopy = sortedEvents.map(event => (
      `行事: ${event.title}\n` +
      `日時: ${event.start.toLocaleString()}\n` +
      `導師: ${event.doushi}\n` +
      `音響: ${event.onkyo}\n` +
      `${event.comment}\n` +
      '------------------------'
    )).join('\n');

    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000); // Reset success message after 2 seconds
      })
      .catch(err => console.error('Failed to copy text: ', err));
  };

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <button
        onClick={handleDisplay}
        style={{
          width: '120px',
          height: '30px',
          marginTop: '5px',
          marginBottom: '20px',
          marginRight: '10px',
          borderRadius: '10px',
          backgroundColor: '#3490dc',
          color: 'white',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        「復活の祈り」
      </button>

      {showPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 9999  // Added high z-index to appear above calendar
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflowY: 'auto',
            padding: '1.5rem',
            position: 'relative',  // Added position relative
            zIndex: 10000  // Added even higher z-index for the content
          }}>

            <div style={{
              marginTop: '1.5rem',
              textAlign: 'center'
            }}>
              <button
                onClick={handleClosePopup}
                style={{
                  width: '30%',
                  height: '30px',
                  borderRadius: '8px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                戻る
              </button>
              {/* </div> */}

              <button
                onClick={handleCopy}
                style={{
                  padding: '5px 15px',
                  marginLeft: '1rem',
                  borderRadius: '5px',
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                コピー
              </button>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              {sortedEvents.length > 0 ? (
                sortedEvents.map((event, index) => (
                  <div
                    key={index}
                    style={{
                      borderBottom: index < sortedEvents.length - 1 ? '1px solid #e2e8f0' : 'none',
                      paddingBottom: '1rem',
                      marginBottom: '1rem'
                    }}
                  >
                    <h4 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: '#2563eb',
                      marginBottom: '0.5rem'
                    }}>
                      {event.title}
                    </h4>
                    <p style={{ color: '#4b5563', marginBottom: '0.5rem' }}>
                      {event.start.toLocaleString()}
                    </p>
                    <p style={{ color: '#374151', marginBottom: '0.25rem' }}>
                      導師: {event.doushi}
                    </p>
                    <p style={{ color: '#374151' }}>
                      音響: {event.onkyo}
                    </p>
                    <p style={{ color: '#374151' }}>
                      {event.comment}
                    </p>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: 'center', color: '#6b7280' }}>
                  表示するイベントがありません。
                </p>
              )}
            </div>

            {/* <div style={{ 
              marginTop: '1.5rem',
              textAlign: 'center'
            }}>
              <button 
                onClick={handleClosePopup}
                style={{
                  width: '30%',
                  height: '30px',
                  borderRadius: '8px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                戻る
              </button>
            </div> */}
          </div>
        </div>
      )}
    </div>
  );
};

export default DisplayComponent;