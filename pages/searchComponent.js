import React, { useState } from 'react';

const SearchComponent = ({ events, data, onSearch }) => {
  const [selectedGyouji, setSelectedGyouji] = useState('');
  const [selectedDoushi, setSelectedDoushi] = useState('');
  const [selectedOnkyo, setSelectedOnkyo] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = () => {
    const searchTerm = `${selectedGyouji} ${selectedDoushi} ${selectedOnkyo}`;
    const filteredResults = events.filter(
      (event) =>
        (selectedGyouji && event.title.includes(selectedGyouji)) ||
        (selectedDoushi && event.doushi.includes(selectedDoushi)) ||
        (selectedOnkyo && event.onkyo.includes(selectedOnkyo))
    );

    const sortedResults = filteredResults
    .filter((event) => isValidDate(event.start) && isValidDate(event.end))
    .sort((a, b) => a.start - b.start);

  setSearchResults(sortedResults);
  setShowPopup(true);
  onSearch(searchTerm.trim());
    
    // setSearchResults(filteredResults);
    // setShowPopup(true);
    // onSearch(searchTerm.trim());
  };

  const isValidDate = (date) => {
    return date instanceof Date && !isNaN(date.getTime());
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setSearchResults([]);
    setSelectedGyouji(''); // Reset the selectedGyouji state
    setSelectedDoushi(''); // Reset the selectedDoushi state
    setSelectedOnkyo(''); 
  };

  return (
    <div>
      <div>
        <label htmlFor="doushi">導師:</label>
        <select style={{ width: "30%", height: "30px", marginTop: "5px", marginBottom: "5px", marginRight: "10px" }}
          id="doushi"
          value={selectedDoushi}
          onChange={(e) => setSelectedDoushi(e.target.value)}
        >
          <option value="">導師選択</option>
          {data.doushis.map((doushi, index) => (
            <option key={index} value={doushi}>
              {doushi}
            </option>
          ))}
        </select>
        <label htmlFor="onkyo">音響:</label>
        <select style={{ width: "30%", height: "30px", marginTop: "5px", marginBottom: "5px", marginRight: "10px" }}
          id="onkyo"
          value={selectedOnkyo}
          onChange={(e) => setSelectedOnkyo(e.target.value)}
        >
          <option value="">音響選択</option>
          {data.onkyos.map((onkyo, index) => (
            <option key={index} value={onkyo}>
              {onkyo}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="gyouji">行事:</label>
        <select
          id="gyouji"
          value={selectedGyouji}
          onChange={(e) => setSelectedGyouji(e.target.value)}
        >
          <option value="">行事選択</option>
          {data.gyouji.map((gyouji, index) => (
            <option key={index} value={gyouji}>
              {gyouji}
            </option>
          ))}
        </select>
      </div>

      <button style={{ width: "30%", height: "30px", marginTop: "5px", marginBottom: "10px", marginRight: "10px" }} onClick={handleSearch}>検索ボタン</button>

      {showPopup && (
        <div className="popup">
          <div className="popup-inner">
            <h3>下に”戻る”ボタンがあります！！</h3>
            <br />
            {searchResults.map((event, index) => (
              <div key={index}>
                <h4>{event.title}</h4>
                <p>開始時間: {event.start.toLocaleString()}</p>
                <p>終了時間: {event.end.toLocaleString()}</p>
                <p>導師: {event.doushi}</p>
                <p>音響: {event.onkyo}</p>
                <p>司会: {event.shikai}</p>
                <p>受付: {event.uketsuke}</p>
                <p>備考: {event.comment}</p>
                <br />
              </div>
            ))}
            <button style={{ width: "30%", height: "30px", marginTop: "5px", marginLeft: "30%" }}onClick={handleClosePopup}>戻る</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchComponent;