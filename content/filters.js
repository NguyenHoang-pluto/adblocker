/* Bộ lọc ẩn phần tử (cosmetic filter) tích hợp sẵn. */
const AB_FILTERS = {
  // Áp dụng cho mọi trang.
  generic: [
    // Google AdSense / Ad Manager
    'ins.adsbygoogle',
    '[id^="google_ads_iframe"]',
    '[id^="google_ads_frame"]',
    '[id^="div-gpt-ad"]',
    '[id^="gpt-ad-"]',
    '[id^="dfp-ad-"]',
    'div[data-google-query-id]',
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="googlesyndication.com"]',
    'iframe[src*="googleadservices.com"]',
    'a[href*="googleadservices.com/pagead/aclk"]',

    // Mạng quảng cáo khác
    'iframe[src*="amazon-adsystem.com"]',
    'iframe[src*="adnxs.com"]',
    'iframe[src*="criteo."]',
    'iframe[src*="admicro.vn"]',
    'iframe[src*="eclick.vn"]',
    '[id^="taboola-"]',
    '.trc_related_container',
    '.OUTBRAIN',
    '[id^="outbrain_widget"]',
    '[id^="mgid_"]',
    '[id^="MarketGid"]',
    '[id^="rc-widget"]',
    'amp-ad',
    'amp-sticky-ad',
    'amp-embed[type="taboola"]',
    'amp-embed[type="outbrain"]',

    // Tên class/id quảng cáo phổ biến
    '.ad-banner',
    '.ad-container',
    '.ad-wrapper',
    '.ad-slot',
    '.ad-unit',
    '.ad-placeholder',
    '.ad-leaderboard',
    '.ads-banner',
    '.ads-container',
    '.ads-wrapper',
    '.advertisement',
    '.banner-ad',
    '.banner-ads',
    '.sidebar-ad',
    '.sticky-ad',
    '.leaderboard-ad',
    '.sponsored-ad',
    '#ad-banner',
    '#ad-container',
    '#ad-wrapper',
    '#ads-container',

    // Trang tiếng Việt
    '[id^="admzone"]',
    ':not(html, body)[class*="quangcao"]',
    ':not(html, body)[id*="quangcao"]',
    ':not(html, body)[class*="quang-cao"]',
    ':not(html, body)[id*="quang-cao"]',
  ],

  // Áp dụng theo tên miền (bao gồm tên miền con).
  sites: {
    'youtube.com': [
      '#masthead-ad',
      '#player-ads',
      'ytd-ad-slot-renderer',
      'ytd-in-feed-ad-layout-renderer',
      'ytd-banner-promo-renderer',
      'ytd-statement-banner-renderer',
      'ytd-display-ad-renderer',
      'ytd-promoted-sparkles-web-renderer',
      'ytd-promoted-video-renderer',
      'ytd-companion-slot-renderer',
      'ytd-action-companion-ad-renderer',
      'ytd-player-legacy-desktop-watch-ads-renderer',
      'ytd-merch-shelf-renderer',
      'ytd-rich-item-renderer:has(ytd-ad-slot-renderer)',
      'ytd-rich-section-renderer:has(ytd-statement-banner-renderer)',
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
      '.ytp-ad-overlay-container',
      '.ytp-ad-overlay-slot',
      '.ytp-ad-message-container',
    ],
    'google.com': ['#tads', '#tadsb', '#bottomads'],
    'google.com.vn': ['#tads', '#tadsb', '#bottomads'],
  },

  /** Toàn bộ selector tích hợp áp dụng cho host. */
  selectorsFor(host) {
    const list = [...this.generic];
    for (const [domain, selectors] of Object.entries(this.sites)) {
      if (AB.hostMatches(host, domain)) list.push(...selectors);
    }
    return list;
  },
};
