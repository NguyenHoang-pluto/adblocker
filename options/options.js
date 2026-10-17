const $ = (id) => document.getElementById(id);

function flash(el, text, isError = false) {
  el.textContent = text;
  el.classList.toggle('error', isError);
  clearTimeout(el._timer);
  el._timer = setTimeout(() => (el.textContent = ''), 4000);
}

function fill(settings) {
  $('enabled').checked = settings.enabled;
  $('blockTrackers').checked = settings.blockTrackers;
  $('whitelist').value = settings.whitelist.join('\n');
  $('blockedDomains').value = settings.blockedDomains.join('\n');
  $('customFilters').value = settings.customFilters;
}

/** Trả về các dòng bộ lọc có selector sai cú pháp. */
function invalidFilterLines(text) {
  const bad = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('!')) continue;
    const idx = line.indexOf('##');
    const selector = idx < 0 ? '' : line.slice(idx + 2).trim();
    let ok = AB.isSafeSelector(selector);
    if (ok) {
      try {
        document.createDocumentFragment().querySelector(selector);
      } catch {
        ok = false;
      }
    }
    if (!ok) bad.push(line);
  }
  return bad;
}

const savers = {
  async whitelist() {
    const list = AB.normalizeDomainList($('whitelist').value);
    await AB.setSettings({ whitelist: list });
    $('whitelist').value = list.join('\n');
    return `Đã lưu ${list.length} tên miền.`;
  },
  async blockedDomains() {
    const list = AB.normalizeDomainList($('blockedDomains').value);
    await AB.setSettings({ blockedDomains: list });
    $('blockedDomains').value = list.join('\n');
    return `Đã lưu ${list.length} tên miền.`;
  },
  async customFilters() {
    const text = $('customFilters').value.trim();
    await AB.setSettings({ customFilters: text });
    const bad = invalidFilterLines(text);
    if (bad.length) throw new Error(`Đã lưu, nhưng ${bad.length} dòng sai cú pháp sẽ bị bỏ qua: ${bad.slice(0, 3).join(' · ')}`);
    return 'Đã lưu bộ lọc.';
  },
};

document.querySelectorAll('[data-save]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const key = btn.dataset.save;
    const status = document.querySelector(`[data-saved-for="${key}"]`);
    try {
      flash(status, await savers[key]());
    } catch (err) {
      flash(status, err.message, true);
    }
  });
});

for (const key of ['enabled', 'blockTrackers']) {
  $(key).addEventListener('change', (e) => AB.setSettings({ [key]: e.target.checked }));
}

// Đồng bộ khi cài đặt thay đổi từ nơi khác (popup, công cụ chọn phần tử).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  for (const [key, { newValue }] of Object.entries(changes)) {
    const el = $(key);
    if (!el || document.activeElement === el) continue;
    if (el.type === 'checkbox') el.checked = !!newValue;
    else el.value = Array.isArray(newValue) ? newValue.join('\n') : newValue ?? '';
  }
});

// Sao lưu / khôi phục
$('exportBtn').addEventListener('click', async () => {
  const data = await AB.getSettings();
  const blob = new Blob([JSON.stringify({ app: 'adblocker', version: 1, settings: data }, null, 2)], {
    type: 'application/json',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `adblocker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('importBtn').addEventListener('click', () => $('importFile').click());
$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const src = parsed.settings ?? parsed;
    const next = {};
    if (typeof src.enabled === 'boolean') next.enabled = src.enabled;
    if (typeof src.blockTrackers === 'boolean') next.blockTrackers = src.blockTrackers;
    if (Array.isArray(src.whitelist)) next.whitelist = AB.normalizeDomainList(src.whitelist);
    if (Array.isArray(src.blockedDomains)) next.blockedDomains = AB.normalizeDomainList(src.blockedDomains);
    if (typeof src.customFilters === 'string') next.customFilters = src.customFilters;
    if (!Object.keys(next).length) throw new Error('Tệp không chứa cài đặt hợp lệ.');
    await AB.setSettings(next);
    fill(await AB.getSettings());
    flash($('backupStatus'), 'Đã khôi phục cài đặt.');
  } catch (err) {
    flash($('backupStatus'), `Không nhập được: ${err.message}`, true);
  }
});

// Số tên miền trong danh sách chặn tích hợp.
async function countDomains(path) {
  const rules = await (await fetch(chrome.runtime.getURL(path))).json();
  return rules.reduce((n, r) => n + (r.condition.requestDomains?.length ?? 1), 0);
}

(async () => {
  fill(await AB.getSettings());
  const [ads, trackers] = await Promise.all([countDomains('rules/ads.json'), countDomains('rules/trackers.json')]);
  $('summary').textContent = `v${chrome.runtime.getManifest().version} · ${ads} luật quảng cáo · ${trackers} luật chặn theo dõi`;
})();
