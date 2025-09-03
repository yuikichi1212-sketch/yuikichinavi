<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <title>超フル解説ナビ完全版</title>

  <style>
    /* ====== 全体レイアウト ====== */
    body, html {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
      font-family: sans-serif;
      background: #f0f0f0;
    }

    #map {
      height: 100%;
      width: 100%;
    }

    /* ====== コントロールパネル ====== */
    #controls {
      position: absolute;
      top: 10px;
      left: 10px;
      width: 300px;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      z-index: 5;
      font-size: 14px;
    }

    #controls input {
      width: calc(100% - 12px);
      margin-bottom: 8px;
      padding: 8px;
      font-size: 14px;
    }

    #controls button {
      width: 100%;
      padding: 10px;
      margin-top: 6px;
      border: none;
      background: #4285F4;
      color: white;
      border-radius: 4px;
      font-size: 15px;
      cursor: pointer;
    }

    #controls button:hover {
      background: #3367D6;
    }

    /* ====== トグルボタン ====== */
    #toggleBtn {
      position: absolute;
      bottom: 20px;
      right: 20px;
      z-index: 5;
      background: rgba(66,133,244,0.9);
      color: #fff;
      border: none;
      border-radius: 50%;
      width: 55px;
      height: 55px;
      font-size: 28px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <!-- コントロールパネル -->
  <div id="controls">
    <h3>ナビゲーション設定</h3>
    <input id="start" type="text" placeholder="出発地を入力" />
    <input id="end" type="text" placeholder="目的地を入力" />
    <button onclick="startNavigation()">ナビ開始</button>
    <button onclick="stopNavigation()">ナビ停止</button>
  </div>

  <!-- トグルボタン -->
  <button id="toggleBtn" onclick="toggleControls()">☰</button>

  <!-- Google Maps API 読み込み -->
  <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places"></script>

  <script>
    /******************************************************
     * グローバル変数宣言
     ******************************************************/
    let map;                     // Google Map オブジェクト
    let directionsService;       // ルート検索サービス
    let directionsRenderer;      // ルート描画オブジェクト
    let stepMarkers = [];        // 曲がりポイントのマーカー配列
    let watchId = null;          // 現在地追跡の ID
    let isNavigating = false;    // ナビ中かどうか
    let currentPositionMarker = null;  // 現在地マーカー

    /******************************************************
     * 初期化処理
     ******************************************************/
    function initMap() {
      console.log("[initMap] マップを初期化します");

      // 地図を作成
      map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 35.1815, lng: 136.9066 }, // 名古屋駅あたり
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        rotateControl: true, // 回転を有効化
      });

      // Directions API サービスと描画器を作成
      directionsService = new google.maps.DirectionsService();
      directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true, // デフォルトマーカー非表示
      });
      directionsRenderer.setMap(map);
    }

    /******************************************************
     * ナビ開始処理
     ******************************************************/
    function startNavigation() {
      console.log("[startNavigation] ナビを開始します");

      const start = document.getElementById("start").value;
      const end = document.getElementById("end").value;

      if (!start || !end) {
        alert("出発地と目的地を入力してください");
        return;
      }

      // Directions API を使ってルート検索
      directionsService.route(
        {
          origin: start,
          destination: end,
          travelMode: google.maps.TravelMode.WALKING,
        },
        (result, status) => {
          console.log("[startNavigation] Directions API ステータス:", status);

          if (status === "OK") {
            directionsRenderer.setDirections(result);

            // 古いマーカーを削除
            stepMarkers.forEach(m => m.setMap(null));
            stepMarkers = [];

            // 各ステップにマーカーを設置
            const steps = result.routes[0].legs[0].steps;
            console.log("[startNavigation] ステップ数:", steps.length);

            steps.forEach((step, i) => {
              console.log("[startNavigation] ステップ", i+1, step.instructions);

              const marker = new google.maps.Marker({
                position: step.start_location,
                map: map,
                label: `${i+1}`,
              });
              stepMarkers.push(marker);
            });

            // 音声案内
            speak("ナビを開始します。");

            // 現在地追跡を開始
            if (navigator.geolocation) {
              watchId = navigator.geolocation.watchPosition(
                pos => {
                  const latlng = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                  };
                  console.log("[位置情報]", latlng);

                  // 現在地マーカーを更新
                  if (!currentPositionMarker) {
                    currentPositionMarker = new google.maps.Marker({
                      position: latlng,
                      map: map,
                      icon: {
                        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                        scale: 5,
                        fillColor: "blue",
                        fillOpacity: 0.8,
                        strokeWeight: 2,
                        rotation: 0
                      }
                    });
                  } else {
                    currentPositionMarker.setPosition(latlng);
                  }

                  // 地図を現在地の中央に固定
                  map.setCenter(latlng);

                  // コンパス回転開始
                  if (!isNavigating) {
                    window.addEventListener("deviceorientationabsolute", handleOrientation, true);
                    isNavigating = true;
                  }
                },
                err => console.error("[位置情報エラー]", err),
                { enableHighAccuracy: true }
              );
            }
          } else {
            alert("ルートを取得できませんでした: " + status);
          }
        }
      );
    }

    /******************************************************
     * ナビ停止処理
     ******************************************************/
    function stopNavigation() {
      console.log("[stopNavigation] ナビを停止します");

      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      stepMarkers.forEach(m => m.setMap(null));
      stepMarkers = [];
      if (currentPositionMarker) {
        currentPositionMarker.setMap(null);
        currentPositionMarker = null;
      }
      isNavigating = false;
      speak("ナビを終了しました。");
    }

    /******************************************************
     * コンパス（端末の向き）処理
     ******************************************************/
    function handleOrientation(event) {
      if (isNavigating && currentPositionMarker) {
        let heading = event.alpha;
        console.log("[handleOrientation] 端末の角度:", heading);

        if (typeof heading === "number") {
          // マーカーを回転
          currentPositionMarker.setIcon({
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 5,
            fillColor: "blue",
            fillOpacity: 0.8,
            strokeWeight: 2,
            rotation: 360 - heading
          });

          // 地図を回転（ナビ中のみ）
          map.setHeading(heading);
        }
      }
    }

    /******************************************************
     * 音声読み上げ
     ******************************************************/
    function speak(text) {
      console.log("[speak]", text);
      const synth = window.speechSynthesis;
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "ja-JP";
      synth.speak(utter);
    }

    /******************************************************
     * コントロール表示切替
     ******************************************************/
    function toggleControls() {
      const controls = document.getElementById("controls");
      if (controls.style.display === "none") {
        controls.style.display = "block";
        console.log("[toggleControls] コントロールを表示");
      } else {
        controls.style.display = "none";
        console.log("[toggleControls] コントロールを非表示");
      }
    }

    // ページ読み込み時に初期化
    window.onload = initMap;
  </script>
</body>
</html>
