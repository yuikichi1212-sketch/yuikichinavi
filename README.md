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
