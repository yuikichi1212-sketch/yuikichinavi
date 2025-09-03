<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>ゆいきちナビ 超完全版 (Part 1)</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Leaflet 本体 -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>

  <!-- CSS セクション -->
  <style>
    /* 全体リセットと基本設定 */
    html, body {
      height: 100%;
      margin: 0;
      font-family: "Segoe UI", sans-serif;
      background: #f0f0f0;
    }

    /* 地図エリア */
    #map {
      height: 100%;
      width: 100%;
      background: #ddd;
    }

    /* コントロールUI */
    #controls {
      position: absolute;
      top: 10px;
      left: 10px;
      z-index: 1000;
      background: rgba(255, 255, 255, 0.95);
      padding: 12px;
      border-radius: 8px;
      box-shadow: 0 3px 6px rgba(0,0,0,0.25);
      width: 260px;
    }

    #controls input {
      width: 100%;
      margin-bottom: 8px;
      padding: 6px;
      font-size: 14px;
      border: 1px solid #aaa;
      border-radius: 4px;
    }

    #controls button {
      width: 100%;
      padding: 8px;
      margin-top: 6px;
      background: #0078ff;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 14px;
    }

    /* 情報表示領域 */
    #info {
      position: absolute;
      bottom: 10px;
      left: 10px;
      z-index: 1000;
      background: rgba(255,255,255,0.85);
      padding: 8px;
      font-size: 13px;
      border-radius: 6px;
      max-width: 90%;
    }
  </style>
</head>
<body>
  <!-- UIコントロール -->
  <div id="controls">
    <input id="end" placeholder="目的地を入力 (例: 栄駅)">
    <button id="searchBtn">ルート検索</button>
    <button id="stopBtn">ナビ停止</button>
  </div>

  <!-- 地図 -->
  <div id="map"></div>

  <!-- 現在地などの情報 -->
  <div id="info">現在地を取得中...</div>

  <!-- JavaScript セクション -->
  <script>
    console.log("=== ゆいきちナビ Part1 起動 ===");

    // 1. Leafletマップを初期化
    const map = L.map("map", {
      zoomControl: true, // デフォルトのズームボタンON
    }).setView([35.170915, 136.881537], 14); // 初期値: 名古屋駅

    // 2. OpenStreetMapのタイルレイヤーを追加
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors"
    }).addTo(map);

    // 3. 現在地を表示するマーカー
    let userMarker = null;

    // 4. 現在地を取得して追従
    map.locate({setView: true, watch: true, enableHighAccuracy: true});

    map.on("locationfound", (e) => {
      console.log("現在地を取得:", e.latlng);

      // 初回のみマーカーを作成
      if (!userMarker) {
        userMarker = L.marker(e.latlng).addTo(map);
      } else {
        userMarker.setLatLng(e.latlng);
      }

      // 情報を更新
      document.getElementById("info").innerText =
        `現在地: ${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
    });

    map.on("locationerror", (e) => {
      console.error("位置情報エラー:", e.message);
      document.getElementById("info").innerText =
        "位置情報が取得できませんでした";
    });
  </script>
</body>
</html>
    // ==========================================================
    // Part 2: ルート検索と経路表示
    // ==========================================================

    // 経路線を管理するレイヤー
    let routeLine = null;

    // 曲がりマーカーを管理する配列
    let turnMarkers = [];

    // Nominatim APIで住所を座標に変換する関数
    async function geocode(address) {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      } else {
        throw new Error("住所が見つかりません: " + address);
      }
    }

    // OSRM APIでルートを取得する関数
    async function getRoute(startLatLng, endLatLng) {
      const url = `https://router.project-osrm.org/route/v1/walking/${startLatLng.lng},${startLatLng.lat};${endLatLng[1]},${endLatLng[0]}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code !== "Ok") throw new Error("ルートが見つかりません");
      return data.routes[0];
    }

    // ルート表示関数
    async function showRoute(endAddress) {
      try {
        if (!userMarker) {
          alert("現在地がまだ取得できていません");
          return;
        }

        // 目的地をジオコーディング
        const endLatLng = await geocode(endAddress);
        console.log("目的地座標:", endLatLng);

        // 出発地 = 現在地
        const startLatLng = userMarker.getLatLng();
        console.log("出発地:", startLatLng);

        // OSRMでルート取得
        const route = await getRoute(startLatLng, endLatLng);
        console.log("ルート取得:", route);

        // 既存のルートを消去
        if (routeLine) {
          map.removeLayer(routeLine);
          routeLine = null;
        }
        turnMarkers.forEach(m => map.removeLayer(m));
        turnMarkers = [];

        // ルート線を追加
        routeLine = L.geoJSON(route.geometry, {
          style: {color: "blue", weight: 5}
        }).addTo(map);

        // 曲がり角マーカーを追加
        route.legs[0].steps.forEach(step => {
          const coord = step.maneuver.location;
          const marker = L.marker([coord[1], coord[0]], {
            icon: L.divIcon({
              className: "turn-marker",
              html: "➡️",
              iconSize: [20, 20]
            })
          }).addTo(map);
          turnMarkers.push(marker);
        });

        // 全体を表示
        map.fitBounds(routeLine.getBounds());

        document.getElementById("info").innerText = "ルートを表示しました！";

      } catch (err) {
        console.error("ルート表示エラー:", err);
        alert("ルートを表示できません: " + err.message);
      }
    }

    // 検索ボタンの動作
    document.getElementById("searchBtn").addEventListener("click", async () => {
      const end = document.getElementById("end").value;
      if (!end) {
        alert("目的地を入力してください");
        return;
      }
      await showRoute(end);
    });

    // ナビ停止ボタン
    document.getElementById("stopBtn").addEventListener("click", () => {
      if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
      }
      turnMarkers.forEach(m => map.removeLayer(m));
      turnMarkers = [];
      document.getElementById("info").innerText = "ナビを停止しました";
    });
    // ==========================================================
    // Part 3: コンパス・地図回転・音声案内
    // ==========================================================

    let compassHeading = 0;   // デバイスの向き
    let navigating = false;   // ナビ中フラグ

    // コンパスイベントを処理
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
          map.setBearing(compassHeading); // ← mapを回転
        }
      }
    }

    // 地図に bearing を追加する関数（Leaflet拡張）
    L.Map.include({
      setBearing: function(angle) {
        const mapContainer = this.getContainer();
        mapContainer.style.transformOrigin = "center center";
        mapContainer.style.transition = "transform 0.3s linear";
        mapContainer.style.transform = `rotate(${angle}deg)`;
      }
    });

    // 音声読み上げ関数
    function speak(text) {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "ja-JP";
      speechSynthesis.speak(utter);
    }

    // ルート案内に音声追加（Part 2 の showRoute を上書き）
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

    // 停止時
    document.getElementById("stopBtn").addEventListener("click", () => {
      if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
      }
      turnMarkers.forEach(m => map.removeLayer(m));
      turnMarkers = [];
      navigating = false; // ナビ終了
      map.setBearing(0);  // 地図を戻す
      document.getElementById("info").innerText = "ナビを停止しました";
    });

    // コンパスイベントを監視
    if (window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", handleOrientation, true);
    }
    // ==========================================================
    // Part 4: UI改善・現在地固定・ポインター安定化
    // ==========================================================

    // 現在地を常に中央に固定（ナビ中のみ）
    function keepUserCentered() {
      if (userMarker && navigating) {
        const pos = userMarker.getLatLng();
        map.setView(pos, map.getZoom(), {animate: false});
      }
      requestAnimationFrame(keepUserCentered);
    }
    keepUserCentered();

    // 現在地ポインター（進行方向を示す三角形）
    const pointerIcon = L.divIcon({
      className: "pointer-icon",
      html: "▲",
      iconSize: [30, 30]
    });
    let pointerMarker = null;

    // 現在地更新時にポインターも更新
    navigator.geolocation.watchPosition((pos) => {
      const latlng = [pos.coords.latitude, pos.coords.longitude];

      if (!userMarker) {
        userMarker = L.marker(latlng, {icon: pointerIcon}).addTo(map);
      } else {
        userMarker.setLatLng(latlng);
      }

      if (!pointerMarker) {
        pointerMarker = userMarker;
      }

      // 方角に応じてポインターを回転
      if (compassHeading && pointerMarker._icon) {
        pointerMarker._icon.style.transform =
          `rotate(${compassHeading}deg) translate(-50%, -50%)`;
      }

    }, (err) => {
      console.error("位置情報エラー:", err);
    }, {enableHighAccuracy: true});

    // UI改善（小さくして邪魔にならないように）
    const style = document.createElement("style");
    style.innerHTML = `
      #controls {
        font-size: 14px;
        padding: 8px;
      }
      #controls input {
        width: 160px;
        font-size: 14px;
      }
      #controls button {
        font-size: 14px;
        padding: 4px 6px;
      }
      #info {
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
    `;
    document.head.appendChild(style);

    // デバッグ用ログ
    setInterval(() => {
      if (userMarker) {
        console.log("現在地:", userMarker.getLatLng(),
                    "方角:", compassHeading,
                    "ナビ中:", navigating);
      }
    }, 5000);

  </script>
</body>
</html>
