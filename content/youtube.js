/*
 * YouTube: quảng cáo video được phát từ cùng tên miền với video thật nên không thể chặn bằng luật mạng.
 * Khi trình phát đang ở chế độ quảng cáo: bấm "Bỏ qua", tắt tiếng và tua tới cuối quảng cáo.
 */
(() => {
  const host = location.hostname;
  if (!AB.hostMatches(host, 'youtube.com') && !AB.hostMatches(host, 'youtube-nocookie.com')) return;

  const SKIP_BUTTONS = [
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button-slot button',
    '.ytp-ad-overlay-close-button',
  ].join(',');
  const AD_SPEED = 16;

  let enabled = true;
  let player = null;
  let restore = null; // trạng thái âm thanh/tốc độ trước khi quảng cáo bắt đầu
  const observer = new MutationObserver(check);

  const pageHost = AB.getTopHost();
  const refresh = () =>
    AB.getSettings().then((s) => {
      enabled = s.enabled && !AB.isWhitelisted(pageHost, s.whitelist);
    });
  refresh();
  chrome.storage.onChanged.addListener((_c, area) => area === 'local' && refresh());

  function check() {
    const video = player?.querySelector('video');
    if (!video) return;
    const adShowing = enabled && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'));

    if (adShowing) {
      restore ??= { muted: video.muted, rate: video.playbackRate };
      player.querySelectorAll(SKIP_BUTTONS).forEach((btn) => btn.click());
      video.muted = true;
      if (video.playbackRate !== AD_SPEED) video.playbackRate = AD_SPEED;
      if (Number.isFinite(video.duration) && video.duration > 0 && video.currentTime < video.duration - 0.25) {
        video.currentTime = video.duration;
      }
    } else if (restore) {
      // Hết quảng cáo: trả lại âm thanh và tốc độ cho video chính.
      video.muted = restore.muted;
      if (video.playbackRate === AD_SPEED) video.playbackRate = restore.rate === AD_SPEED ? 1 : restore.rate;
      restore = null;
    }
  }

  // YouTube là SPA, trình phát có thể bị thay thế khi chuyển trang -> tìm lại định kỳ.
  setInterval(() => {
    const p = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
    if (p !== player) {
      observer.disconnect();
      player = p;
      if (p) observer.observe(p, { attributes: true, attributeFilter: ['class'] });
    }
    check();
  }, 500);
})();
