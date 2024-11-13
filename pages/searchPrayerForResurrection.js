import React, { useState, useEffect } from 'react';

const data = {
  gyouji: [
    '「復活の祈り」'
  ],
  doushis: [
    '田口義明',
    '馬場重善',
    '豊田利雄',
    '北村かおり',
    '豊田奈奈美',
    '渡辺和重',
    '飯田剛',
    '渡辺聖子',
    '野口佐知子',
    '鮫島三重子',
    '土谷恵',
    '中島真美',
    '相良屋昌夫',
    '神えり',
    '黒田信子',
    '雨谷大',
    '吉田瑞季',
    '中島謙一郎',
    '池田雅子',
    'その他',
  ],
  onkyos: [
    '相良屋昌夫',
    '油井房雄',
    '豊田奈奈美',
    '北村かおり',
    '渡辺聖子',
    '野口佐知子',
    '土谷恵',
    '中島真美',
    '大森美都里',
    '武藤啓子',
    '神えり',
    'その他',
    ''
  ],
  shikais: [
    '豊田奈奈美',
    '北村かおり',
    '渡辺聖子',
    '野口佐知子',
    '土谷恵',
    '中島真美',
    'その他',
    ''
  ],
  uketsukes: [
    '豊田奈奈美',
    '北村かおり',
    '渡辺聖子',
    '野口佐知子',
    '土谷恵',
    '中島真美',
    '鮫島三重子',
    'その他',
    ''
  ],
};

const SearchComponent = ({ events, data, onSearch }) => {
  const [selectedGyouji, setSelectedGyouji] = useState('「復活の祈り」');
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedResults = filteredResults
      .filter(
        (event) =>
          isValidDate(event.start) &&
          isValidDate(event.end) &&
          event.end >= today
      )
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

      <button style={{ width: "10%", height: "30px", marginTop: "5px", marginBottom: "20px", marginRight: "10px", borderRadius: "10px" }} onClick={handleSearch}>「復活の祈り」</button>

      {showPopup && (
        <div className="popup">
          <div className="popup-inner">
            <h3>下に”戻る”ボタンがあります！！</h3>
            <br />
            {searchResults.map((event, index) => (
              <div key={index}>
                {/* <h4>{event.title}</h4> */}
                <p> {event.start.toLocaleString()}</p>
                {/* <p>終了時間: {event.end.toLocaleString()}</p> */}
                <p>導師: {event.doushi}</p>
                <p>音響: {event.onkyo}</p>
                <br />
              </div>
            ))}
            <button style={{ width: "30%", height: "30px", marginTop: "5px", marginLeft: "30%" }} onClick={handleClosePopup}>戻る</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchComponent;