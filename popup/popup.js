const $ = (id) => document.getElementById(id);

let tab = null;
let settings = null;
let pageInfo = null; // số liệu từ content script của trang; null nếu trang không hỗ trợ

function hostFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function showNotice(text, withReload) {
  $('notice').hidden = false;
  $('noticeText').textContent = text;
  $('reloadBtn').hidden = !withReload;
}

function render() {
  const enabled = settings.enabled;
  document.body.classList.toggle('off', !enabled);
  $('globalToggle').checked = enabled;
  $('globalStatus').textContent = enabled ? 'Đang bảo vệ' : 'Đã tắt trên mọi trang';

  if (!pageInfo) {
    $('siteCard').hidden = true;
    const isWeb = /^https?:/.test(tab?.url || '');
    showNotice(
      isWeb
        ? 'Trang này được mở trước khi cài AdBlocker. Tải lại trang để bắt đầu chặn.'
        : 'AdBlocker không hoạt động trên trang nội bộ của trình duyệt.',
      isWeb,
    );
    return;
  }

  const host = pageInfo.host;
  const whitelisted = AB.isWhitelisted(host, settings.whitelist);
  const active = enabled && !whitelisted;

  $('host').textContent = host;
  $('host').title = host;
  $('siteCard').classList.toggle('inactive', !active);

  const pill = $('sitePill');
  pill.textContent = active ? 'Đang chặn' : whitelisted ? 'Đã tắt ở trang này' : 'Đã tắt';
  pill.classList.toggle('off', !active);

  $('siteToggleText').textContent = whitelisted ? 'Bật lại chặn trên trang này' : 'Tắt chặn trên trang này';
  $('siteToggle').disabled = !enabled;
  $('pickBtn').disabled = !active;
  $('hiddenCount').textContent = active ? pageInfo.hiddenCount : 0;
}

async function loadBlockedCount() {
  try {
    const { rulesMatchedInfo } = await chrome.declarativeNetRequest.getMatchedRules({
      tabId: tab.id,
      minTimeStamp: pageInfo?.since,
    });
    // Bỏ qua luật "cho phép" của danh sách trắng (luật động id 1).
    const blocked = rulesMatchedInfo.filter((m) => !(m.rule.rulesetId === '_dynamic' && m.rule.ruleId === 1));
    $('blockedCount').textContent = blocked.length;
  } catch {
    $('blockedCount').textContent = '—'; // vượt giới hạn gọi API hoặc trang không hỗ trợ
  }
}

async function applyAndReload() {
  await chrome.runtime.sendMessage({ type: 'applyRules' }); // đợi luật chặn mạng cập nhật xong
  await chrome.tabs.reload(tab.id);
  window.close();
}

$('globalToggle').addEventListener('change', async (e) => {
  settings.enabled = e.target.checked;
  await AB.setSettings({ enabled: settings.enabled });
  render();
  if (pageInfo) showNotice('Tải lại trang để áp dụng thay đổi.', true);
});

$('siteToggle').addEventListener('click', async () => {
  const host = pageInfo.host;
  const whitelist = AB.isWhitelisted(host, settings.whitelist)
    ? settings.whitelist.filter((d) => !AB.hostMatches(host, d))
    : AB.normalizeDomainList([...settings.whitelist, host]);
  await AB.setSettings({ whitelist });
  await applyAndReload();
});

$('pickBtn').addEventListener('click', async () => {
  await chrome.tabs.sendMessage(tab.id, { type: 'startPicker' }, { frameId: 0 }).catch(() => {});
  window.close();
});

$('reloadBtn').addEventListener('click', applyAndReload);

$('optionsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

(async () => {
  $('version').textContent = 'v' + chrome.runtime.getManifest().version;
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  settings = await AB.getSettings();
  pageInfo = tab?.id
    ? await chrome.tabs.sendMessage(tab.id, { type: 'getStats' }, { frameId: 0 }).catch(() => null)
    : null;
  render();
  if (pageInfo) loadBlockedCount();
})();
