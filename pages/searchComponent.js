import React, { useState, useEffect } from 'react';

const data = {
  gyouji: [
    '「復活の祈り」',
    '七の日感謝祭',
    '発展・繁栄系祈願祭',
    '降魔・病気平癒系祈願祭',
    'The Missionミーティング',
    '「心の修行」',
    '百歳会',
    'いま学びたい御法話セミナー',
    'エンゼルプラン',
    'サクセスNo.1',
    '親子',
    '御法話拝聴会',
    '映画上映会',
    '伝道ー御法話拝聴会',
    '新復活祭',
    'ヘルメス大祭',
    '5月研修',
    '家庭ユートピア祈願大祭',
    '幸福供養祭',
    '大悟祭',
    '初転法輪記念祭',
    '御生誕祭',
    'エル・カンターレ祭',
    '街宣',
    '外部講師セミナー',
    '本部行事',
    '集い',
    '地区会',
    'チーム会',
    'ふれあい',
    'その他'
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
  const [selectedGyouji, setSelectedGyouji] = useState('');
  const [selectedDoushi, setSelectedDoushi] = useState('');
  const [selectedOnkyo, setSelectedOnkyo] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // useEffect(() => {
  //   if (data) {
  //     console.log(data.onkyos);
  //     console.log(data.gyouji);

  //   }
  // }, [data]);

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
      <div>
        <label htmlFor="doushi">導師:</label>
        <select style={{ width: "30%", height: "30px", marginTop: "5px", marginBottom: "5px", marginRight: "10px" }}
          id="doushi"
          value={selectedDoushi}
          onChange={(e) => setSelectedDoushi(e.target.value)}
        >
          <option value="">導師選択</option>
          <option value="田口義明">田口義明</option>
          <option value="馬場重善">馬場重善</option>
          <option value="豊田利雄">豊田利雄</option>
          <option value="北村かおり">北村かおり</option>
          <option value="豊田奈奈美">豊田奈奈美</option>
          <option value="渡辺和重">渡辺和重</option>
          <option value='飯田剛'>飯田剛</option>
          <option value="渡辺聖子">渡辺聖子</option>
          <option value="野口佐知子">野口佐知子</option>
          <option value="鮫島三重子">鮫島三重子</option>
          <option value="土谷恵">土谷恵</option>
          <option value="中島真美">中島真美</option>
          <option value="相良屋昌夫">相良屋昌夫</option>
          <option value="神えり">神えり</option>
          <option value='黒田信子'>黒田信子</option>
          <option value="雨谷大">中雨谷大</option>
          <option value="相良屋昌夫">相良屋昌夫</option>
          <option value="吉田瑞季">吉田瑞季</option>
          <option value='中島謙一郎'>中島謙一郎</option>
          <option value='その他'>その他</option>
          {/* {data.doushis.map((doushi, index) => (
            <option key={index} value={doushi}>
              {doushi} 
            </option>
          ))} */}
        </select>
        <label htmlFor="onkyo">音響:</label>
        <select style={{ width: "30%", height: "30px", marginTop: "5px", marginBottom: "5px", marginRight: "10px" }}
          id="onkyo"
          value={selectedOnkyo}
          onChange={(e) => setSelectedOnkyo(e.target.value)}
        >
          <option value="">音響選択</option>
          <option value="油井房雄">油井房雄</option>
          <option value='相良屋昌夫'>相良屋昌夫</option>
          <option value="北村かおり">北村かおり</option>
          <option value="豊田奈奈美">豊田奈奈美</option>
          <option value="渡辺聖子">渡辺聖子</option>
          <option value="野口佐知子">野口佐知子</option>
          <option value="土谷恵">土谷恵</option>
          <option value="中島真美">中島真美</option>
          <option value="神えり">神えり</option>
          <option value="大森美都里">大森美都里</option>
          <option value='武藤啓子'>武藤啓子</option>
          <option value='その他'>その他</option>
          <option value=''></option>
          {/* {data.onkyos.map((onkyo, index) => (
            <option key={index} value={onkyo}>
              {onkyo}
            </option>
          ))} */}
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
          <option value="「復活の祈り」">「復活の祈り」</option>
          <option value='七の日感謝祭'>七の日感謝祭</option>
          <option value="発展・繁栄系祈願祭">発展・繁栄系祈願祭</option>
          <option value="降魔・病気平癒系祈願祭">降魔・病気平癒系祈願祭</option>
          <option value="The Missionミーティング">The Missionミーティング</option>
          <option value="「心の修行」">「心の修行」</option>
          <option value="百歳会">百歳会</option>
          <option value="いま学びたい御法話セミナー">いま学びたい御法話セミナー</option>
          <option value="エンゼルプラン">エンゼルプラン</option>
          <option value="サクセスNo.1">サクセスNo.1</option>
          <option value="親子">親子</option>
          <option value="御法話拝聴会">御法話拝聴会</option>
          <option value="映画上映会">「映画上映会</option>
          <option value='伝道ー御法話拝聴会'>伝道ー御法話拝聴会</option>
          <option value="新復活祭">新復活祭</option>
          <option value="ヘルメス大祭">ヘルメス大祭</option>
          <option value="5月研修">5月研修</option>
          <option value="家庭ユートピア祈願大祭">家庭ユートピア祈願大祭</option>
          <option value="幸福供養祭">幸福供養祭</option>
          <option value="大悟祭">大悟祭</option>
          <option value="初転法輪記念祭">初転法輪記念祭</option>
          <option value="御生誕祭">御生誕祭</option>
          <option value='エル・カンターレ祭'>エル・カンターレ祭</option>
          <option value='街宣'>街宣</option>
          <option value='外部講師セミナー'>外部講師セミナー</option>
          <option value="本部行事">本部行事</option>
          <option value="集い">集い</option>
          <option value='地区会'>地区会</option>
          <option value='チーム会'>チーム会</option>
          <option value='ふれあい'>ふれあい</option>
          <option value='その他'>その他</option>
          <option value=''></option>
          {/* <option value="">行事選択</option>
          {data.gyouji.map((gyouji, index) => (
            <option key={index} value={gyouji}>
              {gyouji}
            </option>
          ))} */}
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
            <button style={{ width: "30%", height: "30px", marginTop: "5px", marginLeft: "30%" }} onClick={handleClosePopup}>戻る</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchComponent;