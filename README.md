<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>ゆいきちナビ — 名古屋 乗換（徒歩＋地下鉄＋徒歩）完全版</title>

  <!-- Leaflet CSS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

  <style>
    :root{
      --accent:#1e90ff; --bg:#f7f9fc; --ink:#111; --card:#fff; --muted:#6b7280;
      --ok:#2ecc71; --warn:#ff9800; --danger:#e53935;
      --walk:#1e90ff; --subway:#6c5ce7; --higashiyama:#f1c40f; --meijo:#8e44ad; --meiko:#e67e22; --tsurumai:#00bcd4; --sakura:#e74c3c; --kamiiida:#795548;
    }
    html,body{height:100%;margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,Segoe UI,Roboto,"Noto Sans JP",sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
    #app{height:100%;display:flex;flex-direction:column}
    header.toolbar{background:var(--card);box-shadow:0 1px 8px rgba(0,0,0,.06);padding:8px;position:relative;z-index:1000}
    .bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .brand{font-weight:800;margin-right:6px}
    .ipt{padding:10px 12px;border:1px solid #e4e8ee;border-radius:12px;min-width:220px;flex:1 1 260px;background:#fff}
    .btn{padding:10px 12px;border:1px solid #dfe3ea;border-radius:12px;background:#fff;cursor:pointer;user-select:none}
    .btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
    .btn.ghost{background:transparent}
    .muted{font-size:12px;color:var(--muted)}
    .divider{width:1px;height:22px;background:#e9eef3}
    #main{position:relative;flex:1;min-height:480px}
    #map{position:absolute;inset:0;overflow:hidden;background:#eaeaea}

    /* 右サイド */
    .sidebar{position:absolute;right:12px;top:12px;z-index:1400;background:#fff;padding:10px;border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,0.12);width:380px;max-height:78vh;overflow:auto}
    .sidebar .title{font-weight:800;margin:4px 0}
    .seg{border-left:4px solid #ddd;padding:6px 8px;margin:6px 0}
    .seg.walk{border-color:var(--walk)}
    .seg.subway{border-color:var(--subway)}
    .badge{display:inline-block;border-radius:999px;padding:2px 8px;font-size:12px;background:#f3f4f6;margin-right:6px}
    .badge.line-東山線{background:var(--higashiyama);color:#111}
    .badge.line-名城線{background:var(--meijo);color:#fff}
    .badge.line-名港線{background:var(--meiko);color:#fff}
    .badge.line-鶴舞線{background:var(--tsurumai);color:#fff}
    .badge.line-桜通線{background:var(--sakura);color:#fff}
    .badge.line-上飯田線{background:var(--kamiiida);color:#fff}

    .legend{display:flex;gap:8px;flex-wrap:wrap}
    .legend .chip{display:flex;align-items:center;gap:6px;border:1px solid #eee;border-radius:999px;padding:4px 8px;font-size:12px;background:#fff}
    .color{width:12px;height:12px;border-radius:3px}

    @media(max-width:900px){.sidebar{width:min(92vw,420px);top:auto;bottom:12px;max-height:60vh}}
  </style>
</head>
<body>
  <div id="app">
    <header class="toolbar">
      <div class="bar">
        <div class="brand">ゆいきちナビ（名古屋 乗換）</div>
        <input id="to" class="ipt" placeholder="目的地（住所 / 名称 / 地図クリックでも設定可）" />
        <button id="set-to-map" class="btn">地図で目的地</button>
        <button id="search" class="btn primary">公共交通で検索</button>
        <span class="divider"></span>
        <button id="locate" class="btn">現在地取得</button>
        <span class="muted">※ 名古屋市営地下鉄のみ（簡易ルーティング）</span>
      </div>
    </header>

    <div id="main">
      <div id="map" aria-label="地図">地図を読み込み中…</div>

      <aside class="sidebar" id="sidebar" aria-live="polite">
        <div class="title">行程</div>
        <div id="itinerary" class="muted">— 目的地を指定して「公共交通で検索」を押してください —</div>
        <div class="title" style="margin-top:10px">凡例</div>
        <div class="legend">
          <div class="chip"><span class="color" style="background:var(--walk)"></span>徒歩</div>
          <div class="chip"><span class="color" style="background:var(--higashiyama)"></span>東山線</div>
          <div class="chip"><span class="color" style="background:var(--meijo)"></span>名城線</div>
          <div class="chip"><span class="color" style="background:var(--meiko)"></span>名港線</div>
          <div class="chip"><span class="color" style="background:var(--tsurumai)"></span>鶴舞線</div>
          <div class="chip"><span class="color" style="background:var(--sakura)"></span>桜通線</div>
          <div class="chip"><span class="color" style="background:var(--kamiiida)"></span>上飯田線</div>
        </div>
      </aside>
    </div>
  </div>

  <!-- Leaflet / Turf -->
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js"></script>

  <script>
  // ============================================================
  // ゆいきちナビ（名古屋・乗換）完全版
  // ・現在地→最寄り駅（徒歩/OSRM）
  // ・地下鉄（名古屋市営のみ/固定グラフ+BFS最小乗換）
  // ・最寄り駅→目的地（徒歩/OSRM）
  // ・座標は Overpass API 一括取得（OSM）
  // ============================================================

  // ---- 地図初期化
  const map = L.map('map', { center:[35.1709,136.8815], zoom:12 });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© OpenStreetMap contributors', keepBuffer: 5
  }).addTo(map);

  // ---- UI要素
  const E = {
    to: document.getElementById('to'), search: document.getElementById('search'), setToMap: document.getElementById('set-to-map'),
    itinerary: document.getElementById('itinerary'), locate: document.getElementById('locate')
  };

  // ---- 状態
  const S = {
    dest: null, current: null,
    stationNodes: new Map(), // name -> {lat,lng}
    layers: { walk1:null, walk2:null, subway:null, markers:[] },
    clickMode: null
  };

  // ---- 名古屋市営地下鉄・駅配列（順序＝線の連結順）
  // ※ 一部はループや分岐。BFSはこの順序から隣接を組む
  const LINES = {
    '東山線': ["高畑","八田","岩塚","中村公園","中村日赤","本陣","亀島","名古屋","伏見","栄","新栄町","千種","今池","池下","覚王山","本山","東山公園","星ヶ丘","一社","上社","本郷","藤が丘"],
    '名城線': ["大曽根","平安通","志賀本通","黒川","名城公園","市役所","久屋大通","栄","矢場町","上前津","東別院","金山","新瑞橋","八事","名古屋大学","本山","自由ヶ丘","茶屋ヶ坂","砂田橋","ナゴヤドーム前矢田","大曽根"], // ループ
    '名港線': ["金山","東別院","上前津","六番町","日比野","名古屋港"],
    '鶴舞線': ["上小田井","庄内緑地公園","庄内通","浄心","浅間町","丸の内","伏見","大須観音","上前津","鶴舞","荒畑","御器所","川名","いりなか","八事","塩釜口","植田","原","平針","赤池"],
    '桜通線': ["中村区役所","名古屋","国際センター","丸の内","久屋大通","高岳","車道","今池","吹上","御器所","桜山","瑞穂区役所","新瑞橋","桜本町","鶴里","野並","鳴子北","相生山","神沢","徳重"],
    '上飯田線': ["平安通","上飯田"]
  };

  // ---- 色
  const LINE_COLOR = {
    '東山線': getComputedStyle(document.documentElement).getPropertyValue('--higashiyama').trim()||'#f1c40f',
    '名城線': getComputedStyle(document.documentElement).getPropertyValue('--meijo').trim()||'purple',
    '名港線': getComputedStyle(document.documentElement).getPropertyValue('--meiko').trim()||'#e67e22',
    '鶴舞線': getComputedStyle(document.documentElement).getPropertyValue('--tsurumai').trim()||'#00bcd4',
    '桜通線': getComputedStyle(document.documentElement).getPropertyValue('--sakura').trim()||'red',
    '上飯田線': getComputedStyle(document.documentElement).getPropertyValue('--kamiiida').trim()||'brown'
  };

  // ---- Overpassで名古屋エリアの地下鉄駅を一括取得
  async function loadStationsFromOverpass(){
    const bbox = '34.8,136.75,35.4,137.2'; // 名古屋周辺
    const q = `
      [out:json][timeout:25];
      (
        node["railway"~"station|halt"]["station"="subway"](${bbox});
        node["railway"="subway_entrance"](${bbox});
      );
      out body;`;
    const res = await fetch('https://overpass-api.de/api/interpreter', {method:'POST', body:q, headers:{'Content-Type':'text/plain'}});
    if(!res.ok) throw new Error('Overpass失敗 '+res.status);
    const j = await res.json();
    const mapByName = new Map();
    for(const el of j.elements||[]){
      const name = el.tags && (el.tags.name || el.tags['name:ja']);
      if(!name) continue;
      const lat = el.lat, lng = el.lon;
      // 既存があれば平均化して代表座標に
      if(mapByName.has(name)){
        const cur = mapByName.get(name);
        mapByName.set(name, {lat:(cur.lat+lat)/2, lng:(cur.lng+lng)/2});
      } else {
        mapByName.set(name, {lat, lng});
      }
    }
    S.stationNodes = mapByName;
    // 駅マーカー薄表示
    for(const [name,pt] of mapByName){
      const m = L.circleMarker([pt.lat,pt.lng],{radius:4,weight:1,opacity:.5,color:'#555',fillOpacity:.35});
      m.bindTooltip(name); m.addTo(map); S.layers.markers.push(m);
    }
  }

  // ---- 駅座標取得（未取得名はNominatimフォールバック）
  async function ensureStationCoord(name){
    if(S.stationNodes.has(name)) return S.stationNodes.get(name);
    // Nominatim フォールバック（名古屋限定ヒント）
    try{
      const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ja&q='+encodeURIComponent('名古屋 地下鉄 '+name);
      const res = await fetch(url, {headers:{'Accept-Language':'ja'}});
      if(res.ok){
        const j = await res.json();
        if(j && j[0]){ const pt={lat:+j[0].lat, lng:+j[0].lon}; S.stationNodes.set(name,pt); return pt; }
      }
    }catch(e){}
    return null;
  }

  // ---- 目的地の座標解決
  async function geocodeAddress(q){
    const url='https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ja&q='+encodeURIComponent(q);
    const res=await fetch(url, {headers:{'Accept-Language':'ja'}});
    if(!res.ok) throw new Error('ジオコーディング失敗');
    const j=await res.json();
    if(!j||!j[0]) throw new Error('場所が見つかりません');
    return {lat:+j[0].lat, lng:+j[0].lon, label:j[0].display_name};
  }

  // ---- 最寄り駅探索
  function nearestStation(pt){
    let best=null, bestD=Infinity, bestLine=null;
    const p=turf.point([pt.lng, pt.lat]);
    // 候補は全駅名（LINEに含まれているもののみ優先）
    const allowed = new Set(Object.values(LINES).flat());
    for(const [name,coord] of S.stationNodes){
      if(!allowed.has(name)) continue;
      const d = turf.distance(p, turf.point([coord.lng,coord.lat]), {units:'kilometers'});
      if(d<bestD){ bestD=d; best={name, ...coord}; }
    }
    return best; // {name,lat,lng}
  }

  // ---- 地下鉄グラフ構築（駅 -> 隣接駅。線情報も保持）
  function buildGraph(){
    const adj = new Map(); // name -> Array<{to, line}>
    const push = (a,b,line)=>{
      if(!adj.has(a)) adj.set(a,[]);
      adj.get(a).push({to:b,line});
    };
    for(const [line, arr] of Object.entries(LINES)){
      for(let i=0;i<arr.length-1;i++){
        const a=arr[i], b=arr[i+1];
        push(a,b,line); push(b,a,line);
      }
      // 名城線はループ末尾も繋ぐ
      if(line==='名城線' && arr[0]!==arr[arr.length-1]){
        push(arr[0], arr[arr.length-1], line);
        push(arr[arr.length-1], arr[0], line);
      }
    }
    return adj;
  }

  // ---- 最小乗換（優先）+ 駅数（次優先）BFS
  function findSubwayRoute(fromName, toName, maxTransfers=3){
    const adj = buildGraph();
    const q = [];
    const seen = new Map(); // key:name|line -> {transfers, stops, prev, prevLine}
    // 初期：どのラインからでも開始（駅が複数ラインに属す場合に対応）
    const starts = (adj.get(fromName)||[]).map(e=>e.line);
    const uniqStarts = Array.from(new Set(starts.length?starts:['*']));
    for(const ln of uniqStarts){
      const key=fromName+'|'+ln; seen.set(key,{transfers:0,stops:0,prev:null,prevLine:ln});
      q.push({name:fromName,line:ln,transfers:0,stops:0});
    }
    while(q.length){
      const cur = q.shift();
      if(cur.name===toName){
        // 復元（lineが'*'の可能性も考慮）
        return reconstruct(fromName, cur.name, cur.line, seen);
      }
      for(const e of (adj.get(cur.name)||[])){
        const nextLine = e.line;
        const willTransfer = (cur.line!=='*' && nextLine!==cur.line) ? 1:0;
        const nt = cur.transfers + willTransfer;
        if(nt>maxTransfers) continue;
        const ns = cur.stops + 1;
        const key = e.to+'|'+nextLine;
        const prev = seen.get(key);
        if(!prev || (nt<prev.transfers) || (nt===prev.transfers && ns<prev.stops)){
          seen.set(key,{transfers:nt,stops:ns,prev:cur.name+'|'+cur.line,prevLine:nextLine});
          q.push({name:e.to,line:nextLine,transfers:nt,stops:ns});
        }
      }
    }
    return null;
  }
  function reconstruct(start, end, endLine, seen){
    const path=[]; let key=end+'|'+endLine; let lastLine=endLine;
    while(key){
      const [name,line] = key.split('|');
      path.push({name, line:lastLine});
      const rec = seen.get(key); key = rec && rec.prev; lastLine = rec && rec.prevLine; if(name===start) break;
    }
    path.reverse();
    // 線ごとにまとめてセグメント化
    const segments=[]; let cur=null;
    for(const p of path){
      if(!cur) cur={line:p.line, stops:[p.name]};
      else if(p.line===cur.line){ cur.stops.push(p.name); }
      else { segments.push(cur); cur={line:p.line, stops:[p.name]}; }
    }
    if(cur) segments.push(cur);
    return {segments};
  }

  // ---- OSRM 徒歩ルート
  async function fetchFootRoute(a,b){
    const url = `https://router.project-osrm.org/route/v1/foot/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson&steps=false`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('OSRM失敗');
    const j = await res.json();
    if(j.code!=='Ok' || !j.routes || !j.routes[0]) throw new Error('徒歩ルートなし');
    const r=j.routes[0];
    return { coords: r.geometry.coordinates.map(c=>[c[1],c[0]]), dist:r.distance, dur:r.duration };
  }

  // ---- 表示用：レイヤー管理
  function clearLayers(){
    for(const k of ['walk1','walk2','subway']){ const l=S.layers[k]; if(l){ try{ map.removeLayer(l) }catch(e){} S.layers[k]=null; } }
  }
  function drawWalk(coords, which){
    const line = L.polyline(coords,{color:getComputedStyle(document.documentElement).getPropertyValue('--walk').trim()||'#1e90ff', weight:6, opacity:.9});
    line.addTo(map); S.layers[which]=line; return line;
  }
  async function drawSubway(segments){
    const polylines=[];
    for(const seg of segments){
      const color = LINE_COLOR[seg.line] || '#6c5ce7';
      const pts=[];
      for(const name of seg.stops){
        const pt = await ensureStationCoord(name);
        if(pt) pts.push([pt.lat, pt.lng]);
      }
      if(pts.length>=2){
        const pl=L.polyline(pts,{color, weight:6, opacity:.95}); pl.addTo(map); polylines.push(pl);
      }
    }
    // グループ化
    const g=L.layerGroup(polylines).addTo(map); S.layers.subway=g; return g;
  }

  // ---- 距離/時間/運賃の概算（簡易）
  function fmtDist(m){ return m>=1000? (m/1000).toFixed(2)+" km" : Math.round(m)+" m" }
  function fmtDur(s){ const m=Math.round(s/60); return m<60? `${m}分` : `${Math.floor(m/60)}時間${m%60}分`; }
  function estimateSubwayTime(segments){
    // 駅間 90秒 + 列車内平均 32km/h として概算
    let stops=0, distKm=0;
    for(const seg of segments){
      stops += Math.max(0, seg.stops.length-1);
      // 座標から距離推定（直線）
      for(let i=0;i<seg.stops.length-1;i++){
        const a=S.stationNodes.get(seg.stops[i]); const b=S.stationNodes.get(seg.stops[i+1]);
        if(a&&b){ distKm += turf.distance(turf.point([a.lng,a.lat]), turf.point([b.lng,b.lat]), {units:'kilometers'}); }
      }
    }
    const cruise = (distKm/32)*3600; // 秒
    const dwell = stops * 90; // 停車
    return {seconds: cruise + dwell, stops};
  }
  function estimateFare(stops){
    // 超簡易：210円 + 20円*停車数（上限 340円）※目安
    return Math.min(340, 210 + stops*20);
  }

  // ---- 行程レンダリング
  function renderItinerary({startPt, startStation, segments, endStation, endPt, walk1, walk2}){
    const est = estimateSubwayTime(segments);
    const fare = estimateFare(est.stops);
    const walk1m = walk1? fmtDist(walk1.dist) : '—';
    const walk2m = walk2? fmtDist(walk2.dist) : '—';
    const totalSec = (walk1?walk1.dur:0) + est.seconds + (walk2?walk2.dur:0);

    const frag = [];
    frag.push(`<div class="seg walk"><span class="badge">徒歩</span> 現在地 → <b>${startStation.name}</b>（${walk1m} / ${walk1?fmtDur(walk1.dur):'—'}）</div>`);
    for(const seg of segments){
      frag.push(`<div class="seg subway"><span class="badge line-${seg.line}">${seg.line}</span> ${seg.stops[0]} → ${seg.stops[seg.stops.length-1]}（${seg.stops.length-1}駅）</div>`);
    }
    frag.push(`<div class="seg walk"><span class="badge">徒歩</span> <b>${endStation.name}</b> → 目的地（${walk2m} / ${walk2?fmtDur(walk2.dur):'—'}）</div>`);
    frag.push(`<div style="margin-top:8px"><b>合計所要時間</b>：${fmtDur(totalSec)}　<b>概算運賃</b>：${fare.toLocaleString()}円　<b>乗換回数</b>：${Math.max(0, segments.length-1)}回</div>`);
    E.itinerary.innerHTML = frag.join('');
  }

  // ---- 検索メイン
  async function search(){
    try{
      if(!S.current){ await locate(); }
      if(!S.dest){
        const q = (E.to.value||'').trim(); if(!q) throw new Error('目的地を入力、または地図で選択してください');
        S.dest = await geocodeAddress(q);
        L.marker([S.dest.lat,S.dest.lng]).addTo(map).bindPopup('目的地').openPopup();
      }
      clearLayers();

      // 1) 最寄り駅（出発側・到着側）
      const startStation = nearestStation(S.current);
      const endStation = nearestStation(S.dest);
      if(!startStation||!endStation) throw new Error('駅情報の取得に失敗しました');

      // 2) 地下鉄ルート（最小乗換優先 / 最大3回）
      const rr = findSubwayRoute(startStation.name, endStation.name, 3);
      if(!rr) throw new Error('地下鉄ルートが見つかりません');

      // 3) 徒歩（現在地→出発駅、到着駅→目的地）
      const [walk1, walk2] = await Promise.all([
        fetchFootRoute(S.current, startStation),
        fetchFootRoute(endStation, S.dest)
      ]);

      // 4) 描画
      const l1 = drawWalk(walk1.coords,'walk1');
      const sub = await drawSubway(rr.segments);
      const l2 = drawWalk(walk2.coords,'walk2');

      // 表示範囲
      const g = L.featureGroup([l1,sub,l2]);
      map.fitBounds(g.getBounds(),{padding:[40,40]});

      // 行程
      renderItinerary({startPt:S.current, startStation, segments:rr.segments, endStation, endPt:S.dest, walk1, walk2});

    }catch(e){
      console.error(e);
      E.itinerary.innerHTML = `<span style="color:#e53935">検索失敗：${e.message||e}</span>`;
    }
  }

  // ---- 現在地
  async function locate(){
    return new Promise((res,rej)=>{
      if(!navigator.geolocation){ rej(new Error('この端末は位置情報に対応していません')); return; }
      navigator.geolocation.getCurrentPosition(p=>{
        S.current = {lat:p.coords.latitude, lng:p.coords.longitude};
        L.marker([S.current.lat,S.current.lng]).addTo(map).bindPopup('現在地').openPopup();
        map.setView([S.current.lat,S.current.lng], 14);
        res();
      }, err=>{ rej(new Error('現在地が取得できませんでした')) }, {enableHighAccuracy:true, timeout:15000});
    });
  }

  // ---- 目的地：地図クリック
  E.setToMap.addEventListener('click',()=>{
    S.clickMode = 'dest';
    E.itinerary.innerHTML = '地図をクリックして目的地を選んでください…';
  });
  map.on('click', (ev)=>{
    if(S.clickMode==='dest'){
      S.dest = {lat:ev.latlng.lat, lng:ev.latlng.lng, label:'地図で選択'};
      L.marker([S.dest.lat,S.dest.lng]).addTo(map).bindPopup('目的地').openPopup();
      S.clickMode=null; E.itinerary.innerHTML='目的地が選択されました。検索を実行できます。';
    }
  });

  // ---- イベント
  E.search.addEventListener('click', search);
  E.locate.addEventListener('click', locate);

  // ---- 起動時：OSMから駅を取っておく
  (async ()=>{ try { await loadStationsFromOverpass(); } catch(e){ console.warn(e); } })();

  </script>
</body>
</html>
