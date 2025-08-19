<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ゆいきちナビ 超完全版</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css">
  <style>
    body, html {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
      font-family: sans-serif;
    }
    #map {
      height: 100%;
      width: 100%;
    }
    #controls {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      background: rgba(255,255,255,0.9);
      z-index: 1000;
      padding: 4px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    #infoBox {
      max-height: 150px;
      overflow-y: auto;
      font-size: 12px;
      background: rgba(255,255,255,0.9);
      padding: 5px;
      border-radius: 5px;
    }
    #toggleInfo {
      font-size: 12px;
      margin-top: 2px;
    }
    .leaflet-control-zoom {
      margin-top: 200px !important;
    }
    .compass-icon {
      width: 24px;
      height: 24px;
      transform-origin: center center;
    }
  </style>
</head>
<body>
  <div id="controls">
    <input type="text" id="from" placeholder="出発地">
    <input type="text" id="to" placeholder="目的地">
    <button id="searchBtn">検索</button>
    <button id="stopBtn">ナビ停止</button>
    <button id="toggleInfo">詳細表示/非表示</button>
    <div id="infoBox"></div>
  </div>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
  <script>
    const map = L.map('map').setView([35.1815, 136.9066], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    let userMarker;
    let compassMarker;
    let routeLine;
    let stepMarkers = [];
    let navActive = false;
    let heading = 0;
    let targetBearing = 0;
    let rotateEnabled = false;

    const infoBox = document.getElementById("infoBox");
    const toggleInfo = document.getElementById("toggleInfo");

    toggleInfo.onclick = () => {
      if(infoBox.style.display === "none"){
        infoBox.style.display = "block";
      } else {
        infoBox.style.display = "none";
      }
    };

    // 現在地取得
    if(navigator.geolocation){
      navigator.geolocation.watchPosition(pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if(!userMarker){
          userMarker = L.marker([lat, lng]).addTo(map);
          compassMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: "",
              html: '<div class="compass-icon">🧭</div>'
            })
          }).addTo(map);
          map.setView([lat, lng], 17);
        } else {
          userMarker.setLatLng([lat, lng]);
          compassMarker.setLatLng([lat, lng]);
        }
        if(navActive && rotateEnabled){
          smoothRotate();
        }
      }, err => console.error(err), {enableHighAccuracy: true});
    }

    // デバイスの向きを取得
    window.addEventListener("deviceorientationabsolute", e => {
      heading = e.alpha;
    });

    function smoothRotate(){
      const offset = 180; // ← ここで180度補正
      targetBearing = heading + offset;
      map.setBearing ? map.setBearing(targetBearing) : rotateMapCSS(targetBearing);
      document.querySelector(".compass-icon").style.transform = `rotate(${heading}deg)`;
    }

    function rotateMapCSS(angle){
      document.getElementById("map").style.transform = `rotate(${angle}deg)`;
    }

    // ダミールート
    document.getElementById("searchBtn").onclick = () => {
      if(routeLine) map.removeLayer(routeLine);
      stepMarkers.forEach(m => map.removeLayer(m));
      stepMarkers = [];

      const route = [
        [35.1815, 136.9066],
        [35.1820, 136.9080],
        [35.1830, 136.9095]
      ];

      routeLine = L.polyline(route, {color:'blue'}).addTo(map);
      map.fitBounds(routeLine.getBounds());
      navActive = true;
      rotateEnabled = true;
      infoBox.innerHTML = "次の案内を開始します";
      speechSynthesis.speak(new SpeechSynthesisUtterance("次の案内を開始します"));
    };

    document.getElementById("stopBtn").onclick = () => {
      navActive = false;
      rotateEnabled = false;
      if(routeLine) map.removeLayer(routeLine);
      stepMarkers.forEach(m => map.removeLayer(m));
      stepMarkers = [];
      infoBox.innerHTML = "ナビを停止しました";
      speechSynthesis.speak(new SpeechSynthesisUtterance("ナビを停止しました"));
    };
  </script>
</body>
</html>
