/*
 * Cài đặt & hàm tiện ích dùng chung cho background, content script, popup và options.
 */
const AB = {
  DEFAULTS: Object.freeze({
    enabled: true, // bật/tắt toàn bộ
    blockTrackers: true, // dùng thêm danh sách chặn trình theo dõi
    whitelist: [], // các tên miền KHÔNG chặn
    blockedDomains: [], // tên miền người dùng chặn thêm
    customFilters: '', // bộ lọc ẩn phần tử, mỗi dòng: "domain##selector" hoặc "##selector"
  }),

  async getSettings() {
    return chrome.storage.local.get(AB.DEFAULTS);
  },

  async setSettings(patch) {
    return chrome.storage.local.set(patch);
  },

  /** "https://www.Example.com/abc" -> "example.com". Trả về '' nếu không hợp lệ. */
  normalizeDomain(input) {
    let s = String(input || '').trim().toLowerCase();
    if (!s) return '';
    s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
    s = s.split(/[/?#]/)[0];
    s = s.replace(/:\d+$/, '').replace(/^\*\./, '').replace(/^www\./, '').replace(/\.$/, '');
    if (!s) return '';
    try {
      s = new URL('http://' + s).hostname; // chuyển tên miền tiếng Việt sang punycode
    } catch {
      return '';
    }
    return s.includes('.') || s === 'localhost' ? s : '';
  },

  /** Chuẩn hoá danh sách tên miền từ textarea / mảng, bỏ trùng. */
  normalizeDomainList(input) {
    const items = Array.isArray(input) ? input : String(input || '').split(/[\s,]+/);
    return [...new Set(items.map(AB.normalizeDomain).filter(Boolean))];
  },

  /** host có thuộc domain (hoặc tên miền con của domain) không. */
  hostMatches(host, domain) {
    host = String(host || '').toLowerCase().replace(/^www\./, '');
    domain = String(domain || '').toLowerCase().replace(/^www\./, '');
    if (!host || !domain) return false;
    return host === domain || host.endsWith('.' + domain);
  },

  isWhitelisted(host, whitelist) {
    return (whitelist || []).some((d) => AB.hostMatches(host, d));
  },

  /** Hostname của trang chính (kể cả khi script đang chạy trong iframe). */
  getTopHost() {
    try {
      if (window.top === window) return location.hostname;
    } catch {}
    try {
      const origins = location.ancestorOrigins;
      if (origins && origins.length) return new URL(origins[origins.length - 1]).hostname;
    } catch {}
    try {
      return window.top.location.hostname;
    } catch {}
    return location.hostname;
  },

  /** Selector có an toàn để chèn vào CSS không (chặn việc phá cấu trúc stylesheet). */
  isSafeSelector(selector) {
    return !!selector && !/[{}]|\/\*|<\/?style/i.test(selector);
  },

  /**
   * Lấy các selector trong bộ lọc tự tạo áp dụng cho host.
   *   example.com##.banner      -> chỉ example.com (và tên miền con)
   *   a.com,b.com##.ads         -> nhiều trang
   *   ##.quang-cao              -> mọi trang
   *   ! dòng chú thích
   */
  customSelectorsFor(text, host) {
    const out = [];
    for (const raw of String(text || '').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('!')) continue;
      const idx = line.indexOf('##');
      if (idx < 0) continue;
      const domains = line.slice(0, idx).trim();
      const selector = line.slice(idx + 2).trim();
      if (!AB.isSafeSelector(selector)) continue;
      if (domains) {
        const list = domains.split(',').map((d) => d.trim()).filter(Boolean);
        if (!list.some((d) => AB.hostMatches(host, d))) continue;
      }
      out.push(selector);
    }
    return out;
  },
};
