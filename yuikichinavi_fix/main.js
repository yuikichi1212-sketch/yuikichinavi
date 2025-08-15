// ===== メニュー開閉 =====
document.getElementById('menuToggle').addEventListener('click', () => {
  const sidebar = document.querySelector('.sidebar');
  sidebar.style.display = sidebar.style.display === 'block' ? 'none' : 'block';
});

// ===== コンパス修正版 =====
const compass = document.getElementById('compass');

if (window.DeviceOrientationEvent) {
  window.addEventListener('deviceorientationabsolute', (e) => {
    if (e.alpha != null) {
      compass.style.transform = `rotate(${e.alpha}deg)`; // 真北基準
    }
  });

  // フォールバック
  window.addEventListener('deviceorientation', (e) => {
    if (e.webkitCompassHeading != null) {
      compass.style.transform = `rotate(${e.webkitCompassHeading}deg)`;
    } else if (e.alpha != null) {
      compass.style.transform = `rotate(${360 - e.alpha}deg)`;
    }
  });
}
