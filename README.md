<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>ゆいきちナビ — 1m先方向で地図回転・完全統合版 + ログイン</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    :root{
      --accent:#1e90ff;--bg:#f7f9fc;--ink:#111;--card:#fff;
      /* 地図回転（deg）と拡大率（端の茶色対策）をCSS変数で制御 */
      --rotdeg: 0deg;
      --rotscale: 1;
    }
    html,body{height:100%;margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,'Noto Sans JP',sans-serif;background:var(--bg);color:var(--ink)}
    #app{height:100%;display:flex;flex-direction:column}

    /* ===== Top Toolbar（地図の外） ===== */
    header.toolbar{background:var(--card);box-shadow:0 1px 8px rgba(0,0,0,.06);padding:8px}
    .bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .brand{font-weight:800;margin-right:6px}
    .ipt{padding:8px;border:1px solid #e4e8ee;border-radius:10px;min-width:220px;flex:1 1 240px}
    .btn{padding:8px 12px;border:1px solid #dfe3ea;border-radius:10px;background:#fff;cursor:pointer}
    .btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
    .mode-btn{padding:6px 10px;border-radius:10px;border:1px solid #dfe3ea;background:#fff}
    .mode-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}
    .muted{font-size:12px;color:#777}
    .collapse{display:none}
    .collapse-area{display:flex;gap:8px;align-items:center;flex-wrap:wrap}

    /* ===== Map / Sidebar / HUD ===== */
    #main{position:relative;flex:1;min-height:420px}
    #map{position:absolute;inset:0}

    /* ここがポイント：Leaflet の描画パネルのみ回転させる */
    #map .leaflet-map-pane{
      transform-origin: center center;
      transform: rotate(var(--rotdeg)) scale(var(--rotscale));
      transition: transform 120ms linear; /* スナップ時の微小変化にも対応 */
      will-change: transform;
    }
    /* コントロール類は回さない（読みやすく） */
    #map .leaflet-control-container{ transform: none !important; }

    /* 右パネル */
    .sidebar{position:absolute;right:12px;top:12px;z-index:1400;background:#fff;padding:10px;border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,0.12);width:360px;max-height:72vh;overflow:auto}
    .sidebar.hidden{display:none}
    .sidebar .title{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
    .route-item{padding:8px;border-radius:10px;border:1px solid #eee;margin-bottom:6px;cursor:pointer}
    .route-item.selected{background:var(--accent);color:#fff;border-color:var(--accent);font-weight:700}
    .turn-step{padding:6px;border-bottom:1px dashed #eee}

    /* HUD小型化 */
    .hud{position:absolute;left:12px;bottom:12px;z-index:1500;background:rgba(255,255,255,0.92);padding:6px 8px;border-radius:10px;box-shadow:0 8px 20px rgba(0,0,0,.12)}
    .hud .row{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
    .hud .key{font-size:11px;color:#666}
    .hud .val{font-weight:700;font-size:12px}
    .hud .next{font-size:11px;color:#444;margin-top:2px}

    .compass{position:absolute;right:12px;bottom:12px;z-index:1500;background:rgba(255,255,255,0.95);padding:6px;border-radius:50%;width:40px;height:40px;display:grid;place-items:center;box-shadow:0 6px 18px rgba(0,0,0,0.12)}
    .compass > div{transform-origin:center center}
    #status{position:absolute;left:12px;top:12px;z-index:1500;background:rgba(255,255,255,0.95);padding:6px 8px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,0.12);font-size:12px}

    /* ルート下部の簡易ステップ（開閉式） */
    #route-steps{position:absolute;left:0;right:0;bottom:0;background:rgba(255,255,255,0.96);border-top:1px solid #eee;max-height:42%;overflow:auto;padding:10px;display:none;z-index:1401}
    #route-steps .drag{font-size:12px;color:#666;text-align:center;margin-bottom:4px}

    /* 地図のズームボタンをモバイルで押しやすく拡大 */
    .leaflet-control-zoom{transform-origin:top left}

    @media(max-width:900px){
      .ipt{min-width:140px;flex:1 1 160px}
      .collapse{display:inline-flex}
      .collapse-area{display:none}
      .sidebar{width:min(92vw,420px);top:auto;bottom:12px;max-height:46vh}
      .leaflet-control-zoom{transform:scale(1.35)}
    }
    @media(min-width:901px){
      .leaflet-control-zoom{transform:scale(1.15)}
    }

    /* 現在地マーカー（矢印気泡）。地図が回っても画面上方向へ安定させるためにJSから角度補正 */
    .marker-heading{width:22px;height:22px;border-radius:50%;background:#1e90ff;border:2px solid #fff;box-shadow:0 0 0 2px rgba(30,144,255,.25);position:relative}
    .marker-heading::after{
      content:"";
      position:absolute;left:7px;top:-10px;
      width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:10px solid #1e90ff;
    }

    /* === Auth モーダル === */
    .modal{position:fixed;inset:0;background:rgba(0,0,0,.35);display:none;align-items:center;justify-content:center;z-index:2000}
    .modal .card{background:#fff;border-radius:14px;box-shadow:0 16px 40px rgba(0,0,0,.2);padding:16px;width:min(92vw,420px)}
    .modal .card h3{margin:0 0 8px 0}
    .modal .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px}
    .modal input{padding:8px;border:1px solid #e4e8ee;border-radius:10px;flex:1}
    .modal .btns{display:flex;gap:8px;margin-top:8px}
    .badge{font-size:12px;color:#555}
  </style>
</head>
<body>
  <div id="app">
    <!-- ===== ツールバー（地図の外。スマホで折りたたみ可能） ===== -->
    <header class="toolbar">
      <div class="bar">
        <div class="brand">ゆいきちナビ</div>
        <input id="from" class="ipt" placeholder="出発地（住所 / 緯度,経度 / 現在地）" />
        <input id="to" class="ipt" placeholder="目的地（住所 / 緯度,経度 / 地図クリック）" />
        <button id="swap" class="btn" title="入れ替え">⇄</button>
        <button id="search" class="btn primary">検索</button>
        <button id="toggle-more" class="btn collapse" aria-expanded="false">詳細 ▾</button>
        <span style="flex:1"></span>
        <span id="auth-chip" class="badge">未ログイン</span>
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ナビゲーションアプリ</title>
  <style>
    /* 基本スタイル */
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
    #map { width: 100%; height: 100vh; }
    #loginModal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); }
    #loginModalContent { background: white; margin: 20% auto; padding: 20px; width: 300px; border-radius: 8px; }
    button { padding: 10px; margin: 5px; width: 100%; cursor: pointer; }
    #loginBtn { position: absolute; top: 10px; right: 10px; }
  </style>
</head>
<body>

  <div id="map"></div>

  <button id="loginBtn">ログイン</button>

  <!-- ログインモーダル -->
  <div id="loginModal">
    <div id="loginModalContent">
      <span id="closeModal" style="cursor: pointer;">&times;</span>
      <h3>ログイン</h3>
      <input type="email" id="email" placeholder="メールアドレス" />
      <input type="password" id="password" placeholder="パスワード" />
      <button id="loginWithEmail">メールでログイン</button>
      <button id="googleLoginBtn">Googleでログイン</button>
      <button id="logoutBtn" style="display: none;">ログアウト</button>
    </div>
  </div>

  <!-- Firebase SDK -->
  <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js"></script>
  <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&callback=initMap" async defer></script>

  <script>
    // Firebase 設定
    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_PROJECT_ID.appspot.com",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID"
    };

    // Firebase 初期化
    const app = firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // DOM 要素
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const closeModal = document.getElementById('closeModal');
    const loginWithEmail = document.getElementById('loginWithEmail');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Google Maps と Geolocation の設定
    let map, userMarker, watchId;

    // ログイン状態の監視
    auth.onAuthStateChanged(user => {
      if (user) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        initMap();
      } else {
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        if (watchId) {
          navigator.geolocation.clearWatch(watchId);
        }
      }
    });

    // ログインボタンのクリックイベント
    loginBtn.addEventListener('click', () => {
      loginModal.style.display = 'block';
    });

    // モーダルを閉じる
    closeModal.addEventListener('click', () => {
      loginModal.style.display = 'none';
    });

    // メールでログイン
    loginWithEmail.addEventListener('click', () => {
      const email = emailInput.value;
      const password = passwordInput.value;
      auth.signInWithEmailAndPassword(email, password)
        .then(() => {
          loginModal.style.display = 'none';
        })
        .catch(error => {
          alert(error.message);
        });
    });

    // Google でログイン
    googleLoginBtn.addEventListener('click', () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      auth.signInWithPopup(provider)
        .then(() => {
          loginModal.style.display = 'none';
        })
        .catch(error => {
          alert(error.message);
        });
    });

    // ログアウト
    logoutBtn.addEventListener('click', () => {
      auth.signOut();
    });

    // Google Maps の初期化
    function initMap() {
      navigator.geolocation.getCurrentPosition(position => {
        const { latitude, longitude } = position.coords;
        const center = { lat: latitude, lng: longitude };

        map = new google.maps.Map(document.getElementById('map'), {
          center,
          zoom: 15,
          mapTypeId: 'roadmap'
        });

        userMarker = new google.maps.Marker({
          position: center,
          map,
          title: '現在地',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#00F',
            fillOpacity: 0.6,
            strokeWeight: 0
          }
        });

        watchId = navigator.geolocation.watchPosition(updatePosition, handleError, {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000
        });
      });
    }

    // 位置情報の更新
    function updatePosition(position) {
      const { latitude, longitude, heading } = position.coords;
      const newPos = { lat: latitude, lng: longitude };

      userMarker.setPosition(newPos);
      map.setCenter(newPos);

      if (heading !== null) {
        userMarker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#00F',
          fillOpacity: 0.6,
          strokeWeight: 0,
          rotation: heading
        });
      }
    }

    // エラーハンドリング
    function handleError(error) {
      alert('位置情報の取得に失敗しました。');
    }
  </script>

</body>
</html>

        
        <div class="muted">移動モード:</div>
        <button class="mode-btn active" data-mode="driving" id="m-driv">車</button>
        <button class="mode-btn" data-mode="foot" id="m-foot">徒歩</button>
        <button class="mode-btn" data-mode="bike" id="m-bike">自転車</button>
        <span style="flex:1"></span>
        <button id="set-from-map" class="btn">地図で出発</button>
        <button id="set-to-map" class="btn">地図で目的</button>
        <button id="start-nav" class="btn">ナビ開始</button>
        <button id="stop-nav" class="btn" disabled>停止</button>
        <label class="muted"><input type="checkbox" id="chk-follow" checked> 追尾</label>
        <label class="muted"><input type="checkbox" id="chk-rotate" checked> コンパス回転</label>
        <button id="toggle-sidebar" class="btn" title="右パネルの表示/非表示">パネル切替</button>
      </div>
    </header>

    <!-- ===== 認証モーダル ===== -->
    <div id="auth-modal" class="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div class="card">
        <h3 id="auth-title">ログイン / 新規登録</h3>
        <div class="row">
          <input id="auth-email" type="email" placeholder="メールアドレス" autocomplete="username" />
        </div>
        <div class="row">
          <input id="auth-pass" type="password" placeholder="パスワード" autocomplete="current-password" />
        </div>
        <div class="btns">
          <button id="btn-email-login" class="btn primary">メールでログイン</button>
          <button id="btn-email-signup" class="btn">新規登録</button>
          <button id="btn-google" class="btn">Googleでログイン</button>
          <button id="btn-auth-cancel" class="btn" style="margin-left:auto">閉じる</button>
        </div>
        <div id="auth-msg" class="muted" style="margin-top:6px"></div>
      </div>
    </div>

    <!-- ===== 地図エリア ===== -->
    <div id="main">
      <div id="map" aria-label="地図">地図を読み込み中…</div>

      <!-- 右：候補/詳細 -->
      <aside class="sidebar" id="sidebar" aria-live="polite">
        <div class="title"><span style="font-weight:700">ルート候補</span></div>
        <div id="route-list" class="route-list muted">— 検索して下さい —</div>
        <div class="title" style="margin-top:6px"><span style="font-weight:700">ルート詳細</span></div>
        <div id="turns" style="margin-top:4px">— ルートを選択してください —</div>
      </aside>

      <!-- HUD / Compass / Status -->
      <div class="hud" aria-live="polite">
        <div class="row"><span class="key">合計距離</span><span class="val" id="hud-total-dist">—</span><span class="key">合計時間</span><span class="val" id="hud-total-time">—</span></div>
        <div class="row"><span class="key">残り距離</span><span class="val" id="hud-rem-dist">—</span><span class="key">到着まで</span><span class="val" id="hud-rem-time">—</span></div>
        <div class="next" id="hud-next">次の案内 — —</div>
      </div>
      <div class="compass"><div id="compass-needle">🧭</div></div>
      <div id="status">状態: 初期化中</div>

      <!-- 下部の簡易ステップ -->
      <div id="route-steps">
        <div class="drag">▼ ルート案内（タップで閉じる）</div>
        <div id="route-steps-body"></div>
      </div>
    </div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js"></script>
  <!-- Firebase v11 -->
  <script src="https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js"></script>
  <script src="https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js"></script>
  <script>
  // ====== 再初期化ガード ======
  if (window._yk_full_v5_rot1m_login) {
    console.warn('already initialized');
  } else {
    window._yk_full_v5_rot1m_login = true;

    (function(){
      /*** =========================
       *      アプリ状態
       * ========================= */
      const S = {
        map:null, from:null, to:null,
        routes:[], routeLayers:[], progressLayer:null,
        selected:-1, nav:false, watchId:null,
        setMode:'driving',
        follow:true, rotate:true, useDummy:false,
        lastRerouteTs:0, lastSnapIdx:0,
        // 回転アニメーション
        mapAngle:0,          // 現在の地図角度（deg）
        targetAngle:0,       // 目標角度（deg）
        animRAF:null,        // requestAnimationFrame ID
        // 現在地まわり
        curMarker:null,
        // 認証
        loggedIn:false,
        user:null,
      };

      /*** =========================
       *      要素取得
       * ========================= */
      const E = {
        from: q('#from'), to: q('#to'), swap: q('#swap'), search: q('#search'),
        modes: qa('.mode-btn'), setFromMap: q('#set-from-map'), setToMap: q('#set-to-map'),
        routeList: q('#route-list'), turns: q('#turns'), status: q('#status'),
        startNav: q('#start-nav'), stopNav: q('#stop-nav'),
        hudTotalDist: q('#hud-total-dist'), hudTotalTime: q('#hud-total-time'),
        hudRemDist: q('#hud-rem-dist'), hudRemTime: q('#hud-rem-time'), hudNext: q('#hud-next'),
        chkFollow: q('#chk-follow'), chkRotate: q('#chk-rotate'),
        compass: q('#compass-needle'), sidebar: q('#sidebar'),
        stepsSheet: q('#route-steps'), stepsBody: q('#route-steps-body'),
        toggleMore: q('#toggle-more'), more: q('#more'), toggleSidebar: q('#toggle-sidebar'),
        // Auth
        authChip: q('#auth-chip'), btnAuth: q('#btn-auth'), btnLogout: q('#btn-logout'),
        modal: q('#auth-modal'), email: q('#auth-email'), pass: q('#auth-pass'),
        btnEmailLogin: q('#btn-email-login'), btnEmailSignup: q('#btn-email-signup'), btnGoogle: q('#btn-google'), btnAuthCancel: q('#btn-auth-cancel'),
        authMsg: q('#auth-msg'),
      };

      /*** =========================
       *      小物ヘルパー
       * ========================= */
      function q(s){return document.querySelector(s)}
      function qa(s){return Array.from(document.querySelectorAll(s))}
      function setStatus(msg, err){E.status.textContent = '状態: '+msg; E.status.style.color = err?'red':'#111'; console.log('[nav]', msg)}
      function formatDist(m){return m>=1000? (m/1000).toFixed(2)+' km' : Math.round(m)+' m'}
      function formatDuration(sec){ if(sec==null) return '—'; const s=Math.round(sec); const h=Math.floor(s/3600); const m=Math.round((s%3600)/60); return h>0? `${h}時間${m}分` : `${m}分`}
      const SPEED_KMH = {foot:4.8, bike:16, driving:42}
      function etaSeconds(meters, mode){ const v=SPEED_KMH[mode]||42; return (meters/1000)/v*3600 }

      // 地図回転のCSS反映
      function applyMapCSSRotation(){
        document.documentElement.style.setProperty('--rotdeg', S.mapAngle.toFixed(2)+'deg');
        // 端の茶色対策：回転時のみ軽く拡大
        const scale = (S.nav && S.rotate && Math.abs(S.mapAngle)%360>0.5)? 1.12 : 1.0;
        document.documentElement.style.setProperty('--rotscale', scale.toFixed(3));
        // コンパスは「北向き」を示すように、地図角度と逆回転で見せる
        try{ E.compass.style.transform = `rotate(${-S.mapAngle}deg)` }catch{}
      }
      // 角度差分を -180..+180 に正規化
      function deltaAngle(a, b){ let d=(b-a+540)%360-180; return d; }
      // スムーズ追従（毎フレーム）
      function ensureRotationLoop(){
        if (S.animRAF != null) return;
        const step = ()=>{
          S.animRAF = null;
          // 目標に向かって補間（緩やかに）
          const d = deltaAngle(S.mapAngle, S.targetAngle);
          const eps = 0.05; // 収束閾値
          if (Math.abs(d) > eps){
            // 係数は速度：大きいほど素早く回る（0.10〜0.18 くらいが自然）
            S.mapAngle = (S.mapAngle + d * 0.14 + 360) % 360;
            applyMapCSSRotation();
            S.animRAF = requestAnimationFrame(step);
          } else {
            S.mapAngle = S.targetAngle % 360;
            applyMapCSSRotation();
          }
        };
        S.animRAF = requestAnimationFrame(step);
      }
      // 回転を有効化/無効化（無効化時は0度へスムーズ復帰）
      function setRotationEnabled(on){
        if (on){
          ensureRotationLoop();
        } else {
          S.targetAngle = 0;
          ensureRotationLoop();
        }
      }

      // 日本語インストラクション
      function jpInstruction(step){
        if(!step||!step.maneuver) return '直進';
        const m=step.maneuver, type=m.type||'', mod=m.modifier||'', name=step.name?`（${step.name}）`:'';
        const round=`${m.exit? m.exit+' 番目の出口':''}`;
        const dir=({left:'左方向','slight left':'やや左方向','sharp left':'大きく左方向',right:'右方向','slight right':'やや右方向','sharp right':'大きく右方向',straight:'直進',uturn:'Uターン'})[mod]||'';
        let t='進む';
        switch(type){case'depart':t='出発';break;case'arrive':t='目的地に到着';break;case'turn':t=dir||'曲がる';break;case'new name':t='道なりに進む';break;case'merge':t='合流';break;case'on ramp':t='入口から進入';break;case'off ramp':t='出口で出る';break;case'roundabout':case'rotary':t=`環状交差点で${round||'目的の出口'}へ`;break;case'roundabout turn':t=`環状交差点で${dir}`;break;case'fork':t=`分岐で${dir}`;break;case'end of road':t=`突き当たりで${dir}`;break;case'continue':t='直進';break;case'use lane':t='車線に従う';break}
        return `${t}${name}`.trim()
      }

      // 音声読み上げ（次の案内）
      function speakJa(text){ if(!window.speechSynthesis) return; try{ const u=new SpeechSynthesisUtterance(text); u.lang='ja-JP'; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u) }catch{} }

      /*** =========================
       *      地図初期化
       * ========================= */
      const map = L.map('map', {center:[35.681236,139.767125], zoom:5, zoomControl:true});
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19, attribution:'© OpenStreetMap contributors'}).addTo(map);
      S.map = map;

      // 現在地マーカー（中の矢印は JS で角度補正して画面上方向へ）
      function ensureCurMarker(){
        if (S.curMarker) return S.curMarker;
        const html = `<div class="marker-heading rotateable"></div>`;
        S.curMarker = L.marker(map.getCenter(), {icon: L.divIcon({html, className:'', iconSize:[22,22]}), title:'現在地'}).addTo(map);
        return S.curMarker;
      }
      function setCurrentMarker(lat,lon, arrowScreenDeg){
        const m = ensureCurMarker();
        m.setLatLng([lat,lon]);
        try{
          const el = m.getElement().querySelector('.rotateable');
          if (el){
            el.style.transition = 'transform 80ms linear';
            el.style.transform = `rotate(${arrowScreenDeg||0}deg)`;
          }
        }catch{}
      }

      /*** =========================
       *    1m先のルート方向で回す
       * ========================= */
      function updateRotationByRouteAhead(route, lon, lat){
        try{
          const line = turf.lineString(route.geometry.coordinates);
          // 最近傍点（location は「線上距離(km)」として返る）
          const pt = turf.point([lon,lat]);
          const snapped = turf.nearestPointOnLine(line, pt, {units:'kilometers'});
          const locKm = snapped.properties.location || 0;
          // 1m = 0.001 km 先の点
          const ahead = turf.along(line, locKm + 0.001, {units:'kilometers'});
          const [ax, ay] = ahead.geometry.coordinates; // lon, lat
          // bearing（度）。北=0, 東=90, 時計回り
          let bearing = turf.bearing([lon,lat], [ax,ay]); // -180..+180
          // CSSは0..360にしておく
          bearing = (bearing + 360) % 360;

          // 「地図を回す目標角度」を更新
          if (S.nav && S.rotate){
            S.targetAngle = bearing;
            ensureRotationLoop();
          }

          // マーカー矢印は「画面上方向を向かせる」＝ 地図角度分だけ逆回し
          const arrowScreen = ((bearing - S.mapAngle) + 360) % 360;
          setCurrentMarker(lat, lon, arrowScreen);
        }catch(e){
          // 何かあっても矢印は0度へ
          setCurrentMarker(lat, lon, 0);
        }
      }

      /*** =========================
       *      ルート描画/選択
       * ========================= */
      function clearRoutes(){
        S.routeLayers.forEach(l=>{try{map.removeLayer(l)}catch{}});
        S.routeLayers=[];
        if(S.progressLayer){ try{ map.removeLayer(S.progressLayer) }catch{} S.progressLayer=null }
        E.routeList.innerHTML=''; E.turns.innerHTML='';
        S.routes=[]; S.selected=-1;
        E.hudTotalDist.textContent='—'; E.hudTotalTime.textContent='—';
        E.hudRemDist.textContent='—'; E.hudRemTime.textContent='—';
        q('#route-steps').style.display='none';
      }

      function drawRoutes(routes){
        clearRoutes(); S.routes=routes;
        routes.forEach((r,i)=>{
          const coords=r.geometry.coordinates.map(c=>[c[1],c[0]]);
          const line=L.polyline(coords,{color:i===0?'#1e90ff':'#888',weight:i===0?7:5,opacity:i===0?0.95:0.45}).addTo(map);
          line.on('click',()=> selectRoute(i));
          line.bindTooltip(`候補 ${i+1}｜${(r.distance/1000).toFixed(2)} km｜${formatDuration(etaSeconds(r.distance,S.setMode))}`);
          S.routeLayers.push(line);

          // ★ユーザー要望：「変な点を消す」→ 曲がり点マーカーは追加しない
          // （必要なら、ここに makeTurnMarker を復活させる）
        });
        S.selected=0; selectRoute(0);
      }

      function selectRoute(i){
        if(i<0||i>=S.routes.length) return;
        S.selected=i;
        S.routeLayers.forEach((l,idx)=>{
          l.setStyle({color: idx===i? '#1e90ff':'#888', weight: idx===i?8:5, opacity: idx===i?0.98:0.4});
          if(idx===i) l.bringToFront();
        });
        E.routeList.innerHTML='';
        S.routes.forEach((r,idx)=>{
          const div=document.createElement('div');
          div.className='route-item'+(idx===i?' selected':'');
          div.textContent=`候補 ${idx+1} — ${(r.distance/1000).toFixed(2)} km / ${formatDuration(etaSeconds(r.distance,S.setMode))}`;
          div.addEventListener('click',()=> selectRoute(idx));
          E.routeList.appendChild(div);
        });

        const r=S.routes[i];
        const steps=r.legs[0].steps||[];
        renderTurns(steps);

        const coords=r.geometry.coordinates.map(c=>[c[1],c[0]]);
        map.fitBounds(L.latLngBounds(coords),{padding:[50,50]});

        E.hudTotalDist.textContent=(r.distance/1000).toFixed(2)+' km';
        E.hudTotalTime.textContent=formatDuration(etaSeconds(r.distance,S.setMode));

        S.lastSnapIdx=0;
        if(S.progressLayer){ try{map.removeLayer(S.progressLayer)}catch{} S.progressLayer=null }
      }

      function renderTurns(steps){
        E.turns.innerHTML='';
        if(!steps||!steps.length){ E.turns.textContent='ターンバイターンデータがありません'; return }
        const fr=document.createDocumentFragment();
        steps.forEach((s)=>{
          const node=document.createElement('div');
          node.className='turn-step';
          node.innerHTML=`<div><strong>${jpInstruction(s)}</strong></div><div class='muted'>距離: ${formatDist(s.distance)} ${s.name?'｜道路: '+s.name:''}</div>`;
          fr.appendChild(node);
        });
        E.turns.appendChild(fr);

        // 下部シート（簡易）
        const listHtml = steps.map((s,idx)=>`<li data-idx="${idx}">${jpInstruction(s)} <span class='muted'>${formatDist(s.distance||0)}</span></li>`).join('');
        E.stepsBody.innerHTML = `<ol>${listHtml}</ol>`;
        E.stepsSheet.style.display='block';
        E.stepsBody.querySelectorAll('li').forEach(li=> li.addEventListener('click',()=>{
          const s=steps[+li.dataset.idx];
          if(s&&s.maneuver){
            const [lon,lat]=s.maneuver.location;
            map.panTo([lat,lon]);
            L.popup().setLatLng([lat,lon]).setContent(`<b>${jpInstruction(s)}</b>`).openOn(map);
          }
        }))
      }

      /*** =========================
       *      ルーティングAPI
       * ========================= */
      function parseLatLon(q){ if(!q) return null; const m=q.trim().match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/); if(m) return {lat:parseFloat(m[1]), lon:parseFloat(m[2]), display_name:`${parseFloat(m[1]).toFixed(5)}, ${parseFloat(m[2]).toFixed(5)}`}; return null }
      async function geocode(q){ const p=parseLatLon(q); if(p) return p; const url='https://nominatim.openstreetmap.org/search?format=json&limit=5&q='+encodeURIComponent(q); try{ const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),8000); const res=await fetch(url,{signal:ctrl.signal, headers:{'Accept-Language':'ja'}}); clearTimeout(t); if(!res.ok) throw new Error('HTTP '+res.status); const j=await res.json(); if(j&&j.length>0) return {lat:+j[0].lat, lon:+j[0].lon, display_name:j[0].display_name}; return null }catch(e){ console.warn('geocode fail',e); return null } }
      async function fetchRoutes(from,to,mode){ const profile=mode==='driving'?'driving': mode==='foot'?'foot':'bicycle'; const url=`https://router.project-osrm.org/route/v1/${profile}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`; try{ const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),12000); const res=await fetch(url,{signal:ctrl.signal}); clearTimeout(t); if(!res.ok) throw new Error('HTTP '+res.status); const j=await res.json(); if(j && j.code==='Ok' && j.routes && j.routes.length>0) return j.routes; return null }catch(e){ console.warn('fetchRoutes fail',e); return null } }

      async function resolveFromInput(){ const v=(E.from.value||'').trim(); if(!v || v==='現在地' || v==='いま' || v.toLowerCase()==='current'){ return await getCurrentLocation() } const g=await geocode(v); if(!g) throw new Error('出発地が見つかりません'); return g }
      async function resolveToInput(){ const v=(E.to.value||'').trim(); const g=parseLatLon(v) || (v? await geocode(v):null); if(!g) throw new Error('目的地が見つかりません'); return g }
      function getCurrentLocation(){ return new Promise((res,rej)=>{ if(!S.loggedIn){ rej(new Error('現在地機能はログイン後に利用できます')); return } if(!navigator.geolocation){ rej(new Error('この端末は位置情報に対応していません')); return } navigator.geolocation.getCurrentPosition(p=> res({lat:p.coords.latitude, lon:p.coords.longitude, display_name:'現在地'}), err=> rej(err), {enableHighAccuracy:true, timeout:12000}) }) }

      /*** =========================
       *      ナビ実行
       * ========================= */
      function startNavigation(){
        if(!S.loggedIn){ setStatus('ログインが必要です（ツールバーの「ログイン」から）',true); E.btnAuth.focus(); return }
        if(S.nav) return;
        if(!S.routes.length){ setStatus('先にルートを検索してください',true); return }
        S.nav=true; setStatus('ナビ開始'); E.startNav.disabled=true; E.stopNav.disabled=false;

        // 地図回転ON条件を満たすなら開始
        setRotationEnabled(E.chkRotate.checked);

        if(!navigator.geolocation){ setStatus('位置情報非対応。ダミーを使用します',true); applyDummy(); return }
        try{
          S.watchId = navigator.geolocation.watchPosition(onNavPos, onNavErr,{enableHighAccuracy:true, maximumAge:1000, timeout:15000})
        }catch(e){
          console.warn(e); applyDummy();
        }
      }
      function stopNavigation(){
        if(!S.nav) return;
        S.nav=false; setStatus('ナビ停止'); E.startNav.disabled=false; E.stopNav.disabled=true;
        try{ if(S.watchId!=null){ navigator.geolocation.clearWatch(S.watchId); S.watchId=null } }catch{}
        // 回転を滑らかに0度へ
        setRotationEnabled(false);
      }
      function onNavErr(err){ console.warn('nav err',err); if(err&&err.code===1){ setStatus('位置情報が許可されていません',true) } }

      function offRouteThreshold(){ return S.setMode==='foot'?30: S.setMode==='bike'?50:100 }
      function rerouteCooldownMs(){ return 8000 }

      function updateProgressLayer(route, snapIdx){
        if(!route) return;
        const coords=route.geometry.coordinates;
        if(snapIdx<=0) return;
        const seg=coords.slice(0,Math.min(snapIdx+1,coords.length)).map(c=>[c[1],c[0]]);
        if(!S.progressLayer){
          S.progressLayer=L.polyline(seg,{color:'#2ecc71',weight:8,opacity:.9}).addTo(map)
        } else {
          S.progressLayer.setLatLngs(seg)
        }
      }

      function onNavPos(pos){
        const lat=pos.coords.latitude, lon=pos.coords.longitude;

        // 常に中心へ（追尾ONのとき）
        if(S.follow){
          const z=Math.max(15,map.getZoom());
          map.setView([lat,lon], Math.min(17,z), {animate:false});
        }
        // 現在選択ルート
        const route=S.routes[S.selected];
        if(route){
          // ★1m先のルート方向で地図を回す（+ 矢印補正）
          updateRotationByRouteAhead(route, lon, lat);
        } else {
          setCurrentMarker(lat, lon, 0);
        }

        if(S.useDummy) return;

        // 進捗・残距離計算・音声案内
        if(route){
          const line=turf.lineString(route.geometry.coordinates);
          const pt=turf.point([lon,lat]);
          const snapped=turf.nearestPointOnLine(line, pt, {units:'meters'});
          const distTo=snapped.properties.dist;
          const snapIdx=snapped.properties.index||0;
          if(snapIdx>S.lastSnapIdx){ S.lastSnapIdx=snapIdx; updateProgressLayer(route,snapIdx) }

          // 次の案内（近いと読む）
          const steps=route.legs[0].steps||[];
          let chosen=null;
          for(let i=0;i<steps.length;i++){
            const st=steps[i];
            const loc=st.maneuver&&st.maneuver.location; if(!loc) continue;
            const d=turf.distance(turf.point([lon,lat]), turf.point([loc[0],loc[1]]), {units:'meters'});
            if(d>5){ chosen={index:i, step:st, dist:d}; break }
          }
          if(!chosen && steps.length){ chosen={index:steps.length-1, step:steps[steps.length-1], dist:0} }
          if(chosen){
            const msg=`${formatDist(chosen.dist)} 先、${jpInstruction(chosen.step)}`;
            E.hudNext.textContent=`次の案内 — ${msg}`;
            if(chosen.dist<60){ speakJa(msg) }
          }
          // 残距離とETA
          const totalDist=route.distance;
          const totalDur=etaSeconds(route.distance,S.setMode);
          const remLine=turf.lineString(route.geometry.coordinates.slice(snapIdx));
          const remKm=turf.length(remLine,{units:'kilometers'});
          const remM=Math.max(0,Math.round(remKm*1000));
          const remSec = totalDist>0 ? (totalDur*(remM/totalDist)) : 0;
          E.hudRemDist.textContent=formatDist(remM);
          E.hudRemTime.textContent=formatDuration(remSec);

          // 逸脱で自動リルート
          const nowMs=Date.now();
          if(distTo>offRouteThreshold() && (nowMs-S.lastRerouteTs)>rerouteCooldownMs()){
            S.lastRerouteTs=nowMs;
            setStatus(`コース外（${Math.round(distTo)}m）。再検索…`);
            const cur={lat,lon};
            const dest=S.to;
            if(dest){
              fetchRoutes(cur,dest,S.setMode).then(rs=>{
                if(rs&&rs.length){
                  drawRoutes(rs);
                  setStatus('自動リルート完了');
                  if(S.follow) map.setView([lat,lon],16,{animate:false});
                } else {
                  setStatus('リルート失敗',true)
                }
              });
            }
          }
        }
      }

      /*** =========================
       *    UI / 入力 / 初期配線
       * ========================= */
      E.swap.addEventListener('click',()=>{ const a=E.from.value; E.from.value=E.to.value; E.to.value=a; const af=S.from; S.from=S.to; S.to=af })
      E.modes.forEach(b=> b.addEventListener('click', async ()=>{
        E.modes.forEach(x=>x.classList.remove('active')); b.classList.add('active');
        S.setMode=b.dataset.mode;
        if(S.from&&S.to){
          setStatus('モード変更: 再検索…');
          const routes=await fetchRoutes(S.from,S.to,S.setMode);
          if(routes){ drawRoutes(routes); setStatus('モード変更を反映しました') }
          else { setStatus('モード変更の反映に失敗',true) }
        }
      }))
      E.setFromMap.addEventListener('click',()=>{ S.mapClickMode='from'; setStatus('地図をタップして出発地を選んでください') })
      E.setToMap.addEventListener('click',()=>{ S.mapClickMode='to'; setStatus('地図をタップして目的地を選んでください') })
      map.on('click',(e)=>{
        if(S.mapClickMode==='from'){
          S.from={lat:e.latlng.lat, lon:e.latlng.lng, display_name:`${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`};
          E.from.value=S.from.display_name; S.mapClickMode=null; setStatus('出発地を設定しました');
        } else if(S.mapClickMode==='to'){
          S.to={lat:e.latlng.lat, lon:e.latlng.lng, display_name:`${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`};
          E.to.value=S.to.display_name; S.mapClickMode=null; setStatus('目的地を設定しました');
        }
      });

      E.search.addEventListener('click', async ()=>{
        try{
          setStatus('出発地を解決中...'); const f=await resolveFromInput(); S.from=f;
          setStatus('目的地を解決中...'); const t=await resolveToInput(); S.to=t;
          setStatus('ルート検索中...'); const rs=await fetchRoutes(f,t,S.setMode);
          if(!rs){ setStatus('ルート検索に失敗しました（外部API制限の可能性）',true); return }
          drawRoutes(rs); setStatus('ルート候補を表示しました');
        }catch(e){ setStatus(e.message||'検索に失敗しました',true) }
      });
      E.startNav.addEventListener('click', startNavigation);
      E.stopNav.addEventListener('click', stopNavigation);
      E.chkFollow.addEventListener('change',()=>{ S.follow=E.chkFollow.checked });
      E.chkRotate.addEventListener('change',()=>{ S.rotate=E.chkRotate.checked; setRotationEnabled(S.nav && S.rotate) });
      [E.from,E.to].forEach(i=> i.addEventListener('keydown', e=>{ if(e.key==='Enter') E.search.click() }))

      // 右パネル切替 / 詳細の開閉
      E.toggleSidebar.addEventListener('click',()=>{ E.sidebar.classList.toggle('hidden') })
      E.toggleMore.addEventListener('click',()=>{
        const open = E.more.style.display!=='none' && getComputedStyle(E.more).display!=='none';
        if(open){ E.more.style.display='none'; E.toggleMore.setAttribute('aria-expanded','false'); E.toggleMore.textContent='詳細 ▸' }
        else     { E.more.style.display='flex'; E.toggleMore.setAttribute('aria-expanded','true'); E.toggleMore.textContent='詳細 ▾' }
      });
      q('#route-steps').addEventListener('click',()=>{ const s=q('#route-steps'); s.style.display = (s.style.display==='none'?'block':'none') });

      // 初期メッセージ
      setStatus('初期化完了 — 出発地と目的地を入力して検索してください');

      /*** =========================
       *      ダミー位置
       * ========================= */
      const DUMMY={lat:35.170915, lon:136.881537};
      function applyDummy(){ S.useDummy=true; setCurrentMarker(DUMMY.lat,DUMMY.lon,0); map.setView([DUMMY.lat,DUMMY.lon],16,{animate:false}); setStatus('ダミー位置を使用中') }

      /*** =========================
       *      ちょいテスト（変更禁止）
       * ========================= */
      (function(){
        function eq(n,a,b){ if(a!==b){ console.error('TEST FAIL',n,a,b) } else { console.log('TEST OK',n) } }
        eq('formatDist_500', formatDist(500), '500 m');
        eq('formatDist_1500', formatDist(1500), '1.50 km');
        eq('formatDuration_59m', formatDuration(59*60), '59分');
        eq('formatDuration_2h5m', formatDuration(2*3600+5*60), '2時間5分');
        const d=10000; const f=Math.round(etaSeconds(d,'foot')/60), b=Math.round(etaSeconds(d,'bike')/60), c=Math.round(etaSeconds(d,'driving')/60);
        if(!(f>b && b>c)) console.error('TEST FAIL eta order'); else console.log('TEST OK eta order');
      })();

      // 公開（デバッグ用）
      window._yuikichi = { state:S };

      /*** =========================
       *      Firebase 認証
       * ========================= */
      const firebaseConfig = {
        apiKey: 'YOUR_API_KEY',
        authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
        projectId: 'YOUR_PROJECT_ID',
      };
      try{ firebase.initializeApp(firebaseConfig) }catch(e){ /* already init in HMR */ }
      const auth = firebase.auth();
      const provider = new firebase.auth.GoogleAuthProvider();

      function updateAuthUI(){
        if(S.loggedIn){
          E.authChip.textContent = (S.user && S.user.displayName)? `ログイン中: ${S.user.displayName}` : 'ログイン中';
          E.btnAuth.style.display='none';
          E.btnLogout.style.display='inline-block';
          E.modal.style.display='none';
          E.authMsg.textContent='';
          setStatus('ログインしました');
        } else {
          E.authChip.textContent='未ログイン';
          E.btnAuth.style.display='inline-block';
          E.btnLogout.style.display='none';
        }
      }

      // Auth events
      E.btnAuth.addEventListener('click', ()=>{ E.modal.style.display='flex'; E.email.focus() })
      E.btnAuthCancel.addEventListener('click', ()=>{ E.modal.style.display='none' })
      E.btnLogout.addEventListener('click', async ()=>{ try{ await auth.signOut(); }catch(e){ console.warn(e) } })

      E.btnEmailLogin.addEventListener('click', async ()=>{
        try{
          const cred = await auth.signInWithEmailAndPassword(E.email.value.trim(), E.pass.value);
          S.loggedIn = true; S.user = cred.user; updateAuthUI();
        }catch(e){ E.authMsg.textContent = e && e.message ? e.message : 'ログインに失敗しました'; }
      })
      E.btnEmailSignup.addEventListener('click', async ()=>{
        try{
          const cred = await auth.createUserWithEmailAndPassword(E.email.value.trim(), E.pass.value);
          S.loggedIn = true; S.user = cred.user; updateAuthUI();
        }catch(e){ E.authMsg.textContent = e && e.message ? e.message : '新規登録に失敗しました'; }
      })
      E.btnGoogle.addEventListener('click', async ()=>{
        try{
          const result = await auth.signInWithPopup(provider);
          S.loggedIn = true; S.user = result.user; updateAuthUI();
        }catch(e){ E.authMsg.textContent = e && e.message ? e.message : 'Googleログインに失敗しました'; }
      })

      auth.onAuthStateChanged((user)=>{
        S.loggedIn = !!user; S.user = user||null; updateAuthUI();
      });

      // クリックでモーダル外を押したら閉じる
      E.modal.addEventListener('click', (ev)=>{ if(ev.target===E.modal){ E.modal.style.display='none' } });

    })();
  }
  </script>
</body>
</html>
