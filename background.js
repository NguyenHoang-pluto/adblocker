/* Service worker: đồng bộ cài đặt -> luật chặn mạng, icon, menu chuột phải. */
importScripts('shared/settings.js');

const RULESETS = { ads: 'ads', trackers: 'trackers' };
const RULE_WHITELIST = 1; // luật động: cho phép mọi request trên trang trong danh sách trắng
const RULE_USER_BLOCK = 2; // luật động: tên miền người dùng chặn thêm
const MENU_PICK = 'ab-pick-element';

const ICONS_ON = { 16: 'icons/icon16.png', 32: 'icons/icon32.png' };
const ICONS_OFF = { 16: 'icons/icon16-off.png', 32: 'icons/icon32-off.png' };

// Các lần áp dụng luật được xếp hàng tuần tự để không ghi đè lẫn nhau.
let applyQueue = Promise.resolve();
function scheduleApply() {
  applyQueue = applyQueue.then(applyRules).catch((err) => console.error('[AdBlocker] applyRules:', err));
  return applyQueue;
}

async function applyRules() {
  const s = await AB.getSettings();

  const enable = [];
  const disable = [];
  if (s.enabled) {
    enable.push(RULESETS.ads);
    (s.blockTrackers ? enable : disable).push(RULESETS.trackers);
  } else {
    disable.push(RULESETS.ads, RULESETS.trackers);
  }
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enable,
    disableRulesetIds: disable,
  });

  const whitelist = AB.normalizeDomainList(s.whitelist);
  const blocked = AB.normalizeDomainList(s.blockedDomains);
  const addRules = [];
  if (s.enabled && whitelist.length) {
    addRules.push({
      id: RULE_WHITELIST,
      priority: 100,
      action: { type: 'allowAllRequests' },
      condition: { requestDomains: whitelist, resourceTypes: ['main_frame'] },
    });
  }
  if (s.enabled && blocked.length) {
    addRules.push({
      id: RULE_USER_BLOCK,
      priority: 2,
      action: { type: 'block' },
      condition: { requestDomains: blocked },
    });
  }
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [RULE_WHITELIST, RULE_USER_BLOCK],
    addRules,
  });

  await updateActionUi(s.enabled);
}

async function updateActionUi(enabled) {
  await chrome.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: enabled });
  await chrome.action.setIcon({ path: enabled ? ICONS_ON : ICONS_OFF });
  await chrome.action.setBadgeBackgroundColor({ color: enabled ? '#dc2626' : '#6b7280' });
  await chrome.action.setBadgeText({ text: enabled ? '' : 'OFF' });
  await chrome.action.setTitle({ title: enabled ? 'AdBlocker – đang chặn quảng cáo' : 'AdBlocker – đã tắt' });
}

chrome.runtime.onInstalled.addListener(async () => {
  // Giữ cài đặt cũ khi cập nhật, chỉ bổ sung khoá còn thiếu.
  const current = await chrome.storage.local.get(null);
  const missing = {};
  for (const [key, value] of Object.entries(AB.DEFAULTS)) {
    if (!(key in current)) missing[key] = value;
  }
  if (Object.keys(missing).length) await chrome.storage.local.set(missing);

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_PICK,
      title: 'Chặn phần tử này…',
      contexts: ['all'],
      documentUrlPatterns: ['http://*/*', 'https://*/*'],
    });
  });

  scheduleApply();
});

chrome.runtime.onStartup.addListener(scheduleApply);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (['enabled', 'blockTrackers', 'whitelist', 'blockedDomains'].some((k) => k in changes)) {
    scheduleApply();
  }
});

// Popup/options yêu cầu áp dụng luật ngay (vd: trước khi tải lại trang).
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'applyRules') return;
  scheduleApply().then(() => sendResponse({ ok: true }));
  return true; // trả lời bất đồng bộ
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_PICK || !tab?.id) return;
  chrome.tabs
    .sendMessage(tab.id, { type: 'startPicker', useContextTarget: true }, { frameId: info.frameId ?? 0 })
    .catch(() => {}); // trang chưa có content script (vd: mở trước khi cài extension)
});
