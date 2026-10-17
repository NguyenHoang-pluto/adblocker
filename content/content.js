/* Content script: ẩn phần tử quảng cáo, trả số liệu cho popup, chạy công cụ chọn phần tử. */
(() => {
  if (!(document instanceof HTMLDocument)) return; // bỏ qua XML, SVG…

  const isTop = window === window.top;
  const pageHost = AB.getTopHost();
  const style = document.createElement('style');
  let activeSelectors = [];
  let lastContextTarget = null;

  const toCss = (selectors) => selectors.map((sel) => `${sel}{display:none!important}`).join('\n');

  // Chèn ngay bộ lọc tích hợp để quảng cáo không kịp hiện ra; sẽ gỡ nếu trang nằm trong danh sách trắng.
  style.textContent = toCss(AB_FILTERS.selectorsFor(pageHost));
  const attach = () => {
    if (!style.isConnected && document.documentElement) document.documentElement.appendChild(style);
  };
  attach();
  // Một số trang cố xoá stylesheet lạ -> gắn lại.
  if (document.documentElement) new MutationObserver(attach).observe(document.documentElement, { childList: true });

  function apply(settings) {
    const active = settings.enabled && !AB.isWhitelisted(pageHost, settings.whitelist);
    activeSelectors = active
      ? [...AB_FILTERS.selectorsFor(pageHost), ...AB.customSelectorsFor(settings.customFilters, pageHost)]
      : [];
    style.textContent = toCss(activeSelectors);
    return active;
  }

  const state = { active: true };
  const refresh = () => AB.getSettings().then((s) => (state.active = apply(s)));
  refresh();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') refresh();
  });

  function countHidden() {
    const found = new Set();
    for (const sel of activeSelectors) {
      try {
        document.querySelectorAll(sel).forEach((el) => found.add(el));
      } catch {} // selector không hợp lệ
    }
    return found.size;
  }

  async function addFilter(selector) {
    const host = pageHost.replace(/^www\./, '');
    const line = `${host}##${selector}`;
    const { customFilters } = await AB.getSettings();
    const lines = String(customFilters || '').split(/\r?\n/).filter((l) => l.trim());
    if (!lines.includes(line)) lines.push(line);
    await AB.setSettings({ customFilters: lines.join('\n') });
    return line;
  }

  // Ghi nhớ phần tử vừa bấm chuột phải để menu "Chặn phần tử này…" bắt đầu từ đó.
  document.addEventListener('contextmenu', (e) => (lastContextTarget = e.target), true);

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'getStats') {
      if (!isTop) return;
      sendResponse({
        host: location.hostname,
        active: state.active,
        hiddenCount: countHidden(),
        since: Math.floor(performance.timeOrigin), // để popup chỉ đếm request của lần tải trang này
      });
      return;
    }
    if (msg?.type === 'startPicker') {
      if (AB_PICKER.active) return;
      const initial = msg.useContextTarget && lastContextTarget?.isConnected ? lastContextTarget : null;
      AB_PICKER.start({
        initial,
        onPick: async (selector, el) => {
          el.style.setProperty('display', 'none', 'important');
          await addFilter(selector);
          AB_PICKER.toast(`Đã ẩn phần tử: ${selector}  (hoàn tác trong Cài đặt)`);
        },
      });
      sendResponse({ ok: true });
    }
  });
})();
