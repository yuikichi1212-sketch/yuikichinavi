<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>フルナビアプリ</title>
<style>
  body, html { margin:0; padding:0; height:100%; font-family: Arial, sans-serif; }
  #loginContainer, #appContainer { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
  #loginContainer { flex-direction: column; }
  #map { width: 80%; height: 60%; margin-top: 20px; }
  #sidebar { position: absolute; top:0; right:0; width: 300px; height: 100%; background:#f1f1f1; padding:10px; overflow-y: auto; }
  input, button { margin: 5px 0; padding: 8px; width: 100%; }
</style>
</head>
<body>

<div id="loginContainer">
  <h1>ログイン</h1>
  <input type="email" id="email" placeholder="メール">
  <input type="password" id="password" placeholder="パスワード">
  <button id="loginBtn">ログイン</button>
  <button id="googleLoginBtn">Googleでログイン</button>
</div>

<div id="appContainer" style="display:none; flex-direction: column; align-items: center;">
  <h1>ナビアプリ</h1>
  <div id="map"></div>
  <div id="controls">
    <input type="text" id="start" placeholder="出発地">
    <input type="text" id="end" placeholder="目的地">
    <select id="mode">
      <option value="DRIVING">車</option>
      <option value="WALKING">徒歩</option>
      <option value="BICYCLING">自転車</option>
      <option value="TRANSIT">公共交通</option>
    </select>
    <button id="routeBtn">ルート検索</button>
    <button id="voiceBtn">音声案内ON/OFF</button>
  </div>
  <div id="sidebar">
    <h2>履歴</h2>
    <ul id="historyList"></ul>
  </div>
</div>

<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-database-compat.js"></script>
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places"></script>

<script>
  // Firebase初期化（サンプル用）
  const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID"
  };
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.database();

  const loginContainer = document.getElementById('loginContainer');
  const appContainer = document.getElementById('appContainer');
  const loginBtn = document.getElementById('loginBtn');
  const googleLoginBtn = document.getElementById('googleLoginBtn');

  loginBtn.onclick = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      await auth.signInWithEmailAndPassword(email, password);
      initApp();
    } catch(e) { alert(e.message); }
  };

  googleLoginBtn.onclick = async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await auth.signInWithPopup(provider);
      initApp();
    } catch(e) { alert(e.message); }
  };

  function initApp() {
    loginContainer.style.display = 'none';
    appContainer.style.display = 'flex';
    initMap();
    loadHistory();
  }

  // 地図とルート検索
  let map, directionsService, directionsRenderer, speechOn = false;
  function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
      center: {lat: 35.681236, lng: 139.767125}, // 東京駅
      zoom: 14
    });
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);

    // 現在地取得
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        map.setCenter({lat: pos.coords.latitude, lng: pos.coords.longitude});
      });
    }
  }

  document.getElementById('routeBtn').onclick = () => {
    const start = document.getElementById('start').value;
    const end = document.getElementById('end').value;
    const mode = document.getElementById('mode').value;
    if(!start || !end) { alert("出発地と目的地を入力"); return; }
    directionsService.route({
      origin: start,
      destination: end,
      travelMode: google.maps.TravelMode[mode]
    }, (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);
        saveHistory(start, end);
        if(speechOn) speakRoute(result);
      } else { alert('ルート検索失敗: ' + status); }
    });
  };

  document.getElementById('voiceBtn').onclick = () => {
    speechOn = !speechOn;
    alert('音声案内: ' + (speechOn ? 'ON' : 'OFF'));
  };

  function speakRoute(result) {
    const steps = result.routes[0].legs[0].steps.map(s => s.instructions.replace(/<[^>]+>/g,''));
    const utter = new SpeechSynthesisUtterance(steps.join('. '));
    speechSynthesis.speak(utter);
  }

  // 履歴保存と表示
  function saveHistory(start, end) {
    const uid = auth.currentUser.uid;
    const ref = db.ref('users/' + uid + '/history');
    ref.push({start,end,time:new Date().toISOString()});
    loadHistory();
  }

  function loadHistory() {
    const uid = auth.currentUser.uid;
    const ref = db.ref('users/' + uid + '/history');
    ref.once('value', snapshot => {
      const historyList = document.getElementById('historyList');
      historyList.innerHTML = '';
      snapshot.forEach(child => {
        const li = document.createElement('li');
        li.textContent = `${child.val().start} → ${child.val().end}`;
        historyList.appendChild(li);
      });
    });
  }
</script>
</body>
</html>
