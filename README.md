<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>ゆいきちナビ</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">

  <!-- Leaflet -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body, html {
      margin:0; padding:0; height:100%; width:100%; overflow:hidden;
    }
    #map {
      width:100%; height:100%;
      transform-origin:center center;
    }
    #panel {
      position:absolute; top:10px; left:10px; right:10px;
      background:white; padding:6px; border-radius:8px;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
      font-size:14px; z-index:1000;
    }
    #togglePanel {
      position:absolute; top:10px; right:10px; z-index:1100;
      background:#333; color:#fff; border:none;
      padding:6px 10px; border-radius:4px; font-size:12px;
    }
    #hud {
      position:absolute; bottom:5px; left:50%; transform:translateX(-50%);
      background:rgba(0,0,0,0.7); color:#fff;
      padding:4px 8px; border-radius:4px;
      font-size:12px; z-index:1000;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <button id="togglePanel">検索</button>
  <div id="panel" style="display:none;">
    <input id="start" placeholder="出発地" style="width:45%">
    <input id="goal" placeholder="目的地" style="width:45%">
    <button id="search">検索</button>
    <button id="stop">ナビ停止</button>
  </div>

  <div id="hud">案内はここに表示</div>

  <script>
    const map = L.map('map').setView([35.1709, 136.8815], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:'&copy; OpenStreetMap'
    }).addTo(map);

    // マーカーとルート
    let routeLayer;
    let currentMarker;
    let watchId;
    let rotating = false;

    // 音声案内
    function speak(text){
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      speechSynthesis.speak(u);
    }

    // 検索処理
    document.getElementById('search').onclick = async ()=>{
      const start = document.getElementById('start').value;
      const goal = document.getElementById('goal').value;
      if(!start || !goal){ alert("出発地と目的地を入力してください"); return; }

      // Nominatim で geocode
      async function geocode(q){
        const url=`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`;
        const res=await fetch(url); const data=await res.json();
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
      const sCoord = await geocode(start);
      const gCoord = await geocode(goal);

      // OSRM でルート検索
      const url=`https://router.project-osrm.org/route/v1/driving/${sCoord[1]},${sCoord[0]};${gCoord[1]},${gCoord[0]}?geometries=geojson&steps=true&overview=full`;
      const res=await fetch(url); const data=await res.json();
      const route = data.routes[0];

      if(routeLayer) map.removeLayer(routeLayer);
      routeLayer = L.geoJSON(route.geometry).addTo(map);
      map.fitBounds(routeLayer.getBounds());

      // 案内文を保存
      const steps = route.legs[0].steps.map(s=>s.maneuver.instruction);
      let stepIndex=0;

      // HUD 表示
      document.getElementById('hud').innerText =
        `合計 ${(route.duration/60).toFixed(0)}分, ${(route.distance/1000).toFixed(1)}km`;

      // 現在地追跡開始
      if(watchId) navigator.geolocation.clearWatch(watchId);
      watchId = navigator.geolocation.watchPosition(pos=>{
        const lat=pos.coords.latitude, lon=pos.coords.longitude;
        if(!currentMarker){
          currentMarker = L.marker([lat,lon]).addTo(map);
        }else{
          currentMarker.setLatLng([lat,lon]);
        }
        if(rotating){
          map.setView([lat,lon]); // 常に中央に
        }

        // 簡易: 距離で次案内
        const step=steps[stepIndex];
        if(step && L.latLng(lat,lon).distanceTo(route.legs[0].steps[stepIndex].maneuver.location.reverse())<30){
          speak(step);
          document.getElementById('hud').innerText=step;
          stepIndex++;
        }
      },err=>alert("位置情報エラー"),{enableHighAccuracy:true});

      // 回転ON
      rotating=true;
      window.addEventListener('deviceorientation', e=>{
        if(!rotating) return;
        const angle=360-e.alpha;
        document.getElementById('map').style.transform=`rotate(${angle}deg)`;
      });
    };

    // ナビ停止
    document.getElementById('stop').onclick=()=>{
      rotating=false;
      document.getElementById('map').style.transform="rotate(0deg)";
      if(watchId) navigator.geolocation.clearWatch(watchId);
      if(currentMarker) map.removeLayer(currentMarker);
      currentMarker=null;
      document.getElementById('hud').innerText="案内停止中";
    };

    // パネル切替
    document.getElementById('togglePanel').onclick=()=>{
      const p=document.getElementById('panel');
      p.style.display=(p.style.display==="none")?"block":"none";
    };
  </script>
</body>
</html>
