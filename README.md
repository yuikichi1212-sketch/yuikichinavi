<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>ゆいきちナビ 超完全版</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
  <style>
    html, body { height: 100%; margin: 0; }
    #map { height: 100%; width: 100%; }

    /* 検索パネル */
    #search-panel {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      background: rgba(255, 255, 255, 0.95);
      padding: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      z-index: 1000;
    }
    #search-panel summary {
      font-weight: bold;
      cursor: pointer;
      padding: 5px;
    }
    #search-panel details[open] { background: rgba(255, 255, 255, 0.98); }
    #search-panel input, #search-panel button {
      margin: 3px;
      padding: 4px;
      font-size: 14px;
    }

    /* HUD */
    #hud {
      position: absolute;
      bottom: 10px;
      left: 10px;
      background: rgba(0,0,0,0.6);
      color: white;
      padding: 4px 6px;
      border-radius: 6px;
      font-size: 11px;
      line-height: 1.2em;
      z-index: 500;
    }

    /* 矢印マーカー */
    .heading-arrow {
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 14px solid red;
      transform-origin: 50% 50%;
      transition: transform 0.5s linear; /* 矢印をスムーズに回転 */
    }
  </style>
</head>
<body>
  <div id="search-panel">
    <details>
      <summary>検索パネル ▼</summary>
      <div>
        出発: <input type="text" id="start" placeholder="例: 名古屋駅">
        目的地: <input type="text" id="end" placeholder="例: 栄駅">
        <button onclick="searchRoute()">検索</button>
        <button onclick="stopNav()">ナビ停止</button>
      </div>
    </details>
  </div>
  <div id="map"></div>
  <div id="hud">合計時間: 0分<br>距離: 0km</div>

  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
  <script>
    const map = L.map('map').setView([35.1709, 136.8815], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // 現在地マーカーと矢印
    let userMarker = null;
    let headingMarker = null;
    let targetLatLng = null;

    // 座標をスムーズに動かす用
    function animateMarker() {
      if (userMarker && targetLatLng) {
        const current = userMarker.getLatLng();
        const lat = current.lat + (targetLatLng.lat - current.lat) * 0.1;
        const lng = current.lng + (targetLatLng.lng - current.lng) * 0.1;
        userMarker.setLatLng([lat, lng]);
        headingMarker.setLatLng([lat, lng]);
      }
      requestAnimationFrame(animateMarker);
    }

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        targetLatLng = L.latLng(lat, lng);

        if (!userMarker) {
          userMarker = L.circleMarker([lat, lng], {
            radius: 6,
            color: "blue",
            fillColor: "blue",
            fillOpacity: 0.8
          }).addTo(map);

          headingMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: "",
              html: '<div class="heading-arrow"></div>',
              iconSize: [20, 20]
            })
          }).addTo(map);

          animateMarker(); // アニメーション開始
        }
      });
    }

    // コンパス（向き検出）
    if (window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientationabsolute", handleOrientation, true);
      window.addEventListener("deviceorientation", handleOrientation, true);
    }

    let lastRotation = 0;
    function handleOrientation(event) {
      let alpha = event.alpha;
      if (alpha === null) return;
      let rotation = 360 - alpha; // 北固定なので逆回転

      // 差が大きいときも滑らかに補間
      let diff = rotation - lastRotation;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      lastRotation = (lastRotation + diff * 0.1) % 360;

      if (headingMarker) {
        const el = headingMarker.getElement().querySelector(".heading-arrow");
        if (el) el.style.transform = `rotate(${lastRotation}deg)`;
      }
    }

    function searchRoute() {
      alert("検索機能はここに追加予定です");
    }
    function stopNav() {
      alert("ナビを停止しました");
    }
  </script>
</body>
</html>
