import React, { useState } from 'react';

const SearchComponent = ({ events, onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = () => {
    onSearch(searchTerm);
  };

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search events..."
      />
      <button onClick={handleSearch}>Search</button>
      <div>
        <h3>Search Results:</h3>
        {searchTerm && (
          <div>
            {events
              .filter(
                (event) =>
                  event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  event.doushi.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  event.onkyo.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((event, index) => (
                <div key={index}>
                  <h4>{event.title}</h4>
                  <p>Start: {event.start.toLocaleString()}</p>
                  <p>End: {event.end.toLocaleString()}</p>
                  <p>Doushi: {event.doushi}</p>
                  <p>Onkyo: {event.onkyo}</p>
                  <p>Shikai: {event.shikai}</p>
                  <p>Uketsuke: {event.uketsuke}</p>
                  <p>Comment: {event.comment}</p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchComponent;