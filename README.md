<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>ゆいきちナビ - 超完全版</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Leaflet -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>

  <style>
    body, html {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
      overflow: hidden;
    }
    #map {
      height: 100%;
      width: 100%;
    }
    #controls {
      position: absolute;
      top: 10px;
      left: 10px;
      z-index: 1000;
      background: rgba(255,255,255,0.9);
      padding: 8px;
      border-radius: 6px;
      box-shadow: 0 0 5px rgba(0,0,0,0.3);
      font-size: 14px;
    }
    #controls input {
      width: 160px;
      font-size: 14px;
    }
    #controls button {
      font-size: 14px;
      padding: 4px 6px;
      margin-top: 4px;
      display: block;
      width: 100%;
    }
    #info {
      margin-top: 6px;
      font-size: 12px;
      padding: 4px;
      background: rgba(0,0,0,0.5);
      color: white;
      border-radius: 6px;
      max-width: 200px;
    }
    .turn-marker {
      font-size: 18px;
    }
    .pointer-icon {
      font-size: 30px;
      color: red;
      text-shadow: 0 0 2px white;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <div id="controls">
    <input type="text" id="end" placeholder="目的地を入力">
    <button id="searchBtn">ルート検索</button>
    <button id="stopBtn">ナビ停止</button>
    <div id="info">準備中...</div>
  </div>

  <script>
    // ==========================================================
    // Part 1: 地図と現在地
    // ==========================================================
    const map = L.map("map").setView([35.170915, 136.881537], 16); // 名古屋駅周辺を初期値
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    let userMarker = null;
    let routeLine = null;
    let turnMarkers = [];
    let compassHeading = 0;
    let navigating = false;

    // 現在地マーカー（進行方向ポインター）
    const pointerIcon = L.divIcon({
      className: "pointer-icon",
      html: "▲",
      iconSize: [30, 30]
    });

    // 位置情報を監視
    navigator.geolocation.watchPosition((pos) => {
      const latlng = [pos.coords.latitude, pos.coords.longitude];
      if (!userMarker) {
        userMarker = L.marker(latlng, {icon: pointerIcon}).addTo(map);
        map.setView(latlng, 16);
      } else {
        userMarker.setLatLng(latlng);
      }
      if (compassHeading && userMarker._icon) {
        userMarker._icon.style.transform =
          `rotate(${compassHeading}deg) translate(-50%, -50%)`;
      }
    }, (err) => {
      console.error("位置情報エラー:", err);
      document.getElementById("info").innerText = "位置情報が取得できません";
    }, {enableHighAccuracy: true});

    // ==========================================================
    // Part 2: ルート検索
    // ==========================================================
    async function geocode(address) {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );
      const data = await res.json();
      if (data.length === 0) throw new Error("住所が見つかりません");
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }

    async function getRoute(startLatLng, endLatLng) {
      const url = `https://router.project-osrm.org/route/v1/walking/${startLatLng.lng},${startLatLng.lat};${endLatLng[1]},${endLatLng[0]}?overview=full&geometries=geojson&steps=true&language=ja`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.routes || data.routes.length === 0) throw new Error("ルートなし");
      return data.routes[0];
    }

    async function showRoute(endAddress) {
      try {
        if (!userMarker) {
          alert("現在地がまだ取得できていません");
          return;
        }

        const endLatLng = await geocode(endAddress);
        const startLatLng = userMarker.getLatLng();
        const route = await getRoute(startLatLng, endLatLng);

        if (routeLine) {
          map.removeLayer(routeLine);
          routeLine = null;
        }
        turnMarkers.forEach(m => map.removeLayer(m));
        turnMarkers = [];

        // ルート線
        routeLine = L.geoJSON(route.geometry, {
          style: {color: "blue", weight: 5}
        }).addTo(map);

        // 曲がり角マーカー + 音声案内
        route.legs[0].steps.forEach((step, i) => {
          const coord = step.maneuver.location;
          const marker = L.marker([coord[1], coord[0]], {
            icon: L.divIcon({
              className: "turn-marker",
              html: "➡️",
              iconSize: [20, 20]
            })
          }).addTo(map);
          turnMarkers.push(marker);

          // 案内テキストを音声化
          setTimeout(() => {
            speak(`次は ${step.maneuver.instruction}`);
          }, i * 3000);
        });

        // 表示を調整
        map.fitBounds(routeLine.getBounds());

        navigating = true; // ナビ開始
        document.getElementById("info").innerText = "ナビを開始しました";

      } catch (err) {
        console.error("ルート表示エラー:", err);
        alert("ルートを表示できません: " + err.message);
      }
    }

    document.getElementById("searchBtn").addEventListener("click", () => {
      const end = document.getElementById("end").value;
      if (end) showRoute(end);
    });

    document.getElementById("stopBtn").addEventListener("click", () => {
      if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
      }
      turnMarkers.forEach(m => map.removeLayer(m));
      turnMarkers = [];
      navigating = false;
      document.getElementById("info").innerText = "ナビを停止しました";
    });

    // ==========================================================
    // Part 3: コンパス & 地図回転
    // ==========================================================
    function handleOrientation(event) {
      let heading;
      if (event.webkitCompassHeading) {
        heading = event.webkitCompassHeading; // iOS
      } else if (event.alpha) {
        heading = 360 - event.alpha; // Android
      }
      if (heading !== null && !isNaN(heading)) {
        compassHeading = heading;
        if (navigating) {
          map.setBearing(compassHeading);
        }
      }
    }

    // Leaflet拡張: setBearing
    L.Map.include({
      setBearing: function(angle) {
        const mapContainer = this.getContainer();
        mapContainer.style.transformOrigin = "center center";
        mapContainer.style.transition = "transform 0.3s linear";
        mapContainer.style.transform = `rotate(${angle}deg)`;
      }
    });

    if (window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", handleOrientation, true);
    }

    // ==========================================================
    // Part 4: 音声案内
    // ==========================================================
    function speak(text) {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "ja-JP";
      speechSynthesis.speak(utter);
    }
  </script>
</body>
</html>
