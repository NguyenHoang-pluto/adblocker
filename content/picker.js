/*
 * Công cụ chọn phần tử để ẩn.
 *   Di chuột: tô sáng phần tử · Click / Enter: ẩn · ↑ / ↓: chọn phần tử cha / con · Esc: thoát
 */
const AB_PICKER = (() => {
  let session = null;

  const UI_CSS = `
    :host { all: initial; }
    .box {
      position: fixed; pointer-events: none; box-sizing: border-box;
      background: rgba(220, 38, 38, .18); outline: 2px solid #dc2626; border-radius: 2px;
      transition: all .06s ease-out; display: none;
    }
    .tag {
      position: fixed; pointer-events: none; display: none; max-width: 60vw;
      padding: 2px 6px; border-radius: 4px; background: #dc2626; color: #fff;
      font: 600 11px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .bar {
      position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%);
      pointer-events: auto; display: flex; align-items: center; gap: 8px;
      width: max-content; max-width: calc(100vw - 24px); box-sizing: border-box;
      padding: 8px 8px 8px 14px; border-radius: 12px;
      background: #111827; color: #f9fafb; box-shadow: 0 10px 30px rgba(0,0,0,.35);
      font: 13px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    }
    .hint { opacity: .85; margin-right: 4px; min-width: 0; }
    kbd {
      font: 600 11px ui-monospace, Consolas, monospace; padding: 1px 5px; border-radius: 4px;
      background: #374151; color: #f9fafb;
    }
    button {
      all: unset; cursor: pointer; padding: 6px 12px; border-radius: 8px; flex: none; white-space: nowrap;
      font: 600 13px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: #374151; color: #f9fafb;
    }
    button:hover { background: #4b5563; }
    button.primary { background: #dc2626; }
    button.primary:hover { background: #b91c1c; }
    button:disabled { opacity: .45; cursor: default; }
  `;

  /** Sinh CSS selector ngắn gọn, ổn định cho phần tử. */
  function buildSelector(el) {
    // Bỏ qua id/class sinh tự động (thay đổi mỗi lần tải trang): số dài, mã hash, CSS-in-JS…
    const looksRandom = (s) => /\d{4,}|[0-9a-f]{8,}|^(css|sc|jsx)-|__[\w-]{5}$/i.test(s);
    const unique = (sel) => {
      try {
        return document.querySelectorAll(sel).length === 1;
      } catch {
        return false;
      }
    };

    if (el.id && !looksRandom(el.id)) {
      const sel = '#' + CSS.escape(el.id);
      if (unique(sel)) return sel;
    }

    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.body && cur !== document.documentElement) {
      if (cur !== el && cur.id && !looksRandom(cur.id)) {
        parts.unshift('#' + CSS.escape(cur.id));
        break;
      }
      let part = cur.localName;
      const classes = [...cur.classList].filter((c) => !looksRandom(c) && c.length <= 40).slice(0, 3);
      if (classes.length) {
        part += classes.map((c) => '.' + CSS.escape(c)).join('');
      } else if (cur.parentElement) {
        const same = [...cur.parentElement.children].filter((n) => n.localName === cur.localName);
        if (same.length > 1) part += `:nth-of-type(${same.indexOf(cur) + 1})`;
      }
      parts.unshift(part);
      const sel = parts.join(' > ');
      if (unique(sel) || parts.length >= 5) return sel;
      cur = cur.parentElement;
    }
    return parts.join(' > ') || el.localName;
  }

  function isPickable(el) {
    return el && el.nodeType === 1 && el !== document.body && el !== document.documentElement;
  }

  function start({ initial = null, onPick } = {}) {
    if (session) return;

    const host = document.createElement('div');
    host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = `
      <style>${UI_CSS}</style>
      <div class="box"></div>
      <div class="tag"></div>
      <div class="bar">
        <span class="hint">Click vào phần tử cần ẩn · <kbd>↑</kbd> phần tử cha · <kbd>Esc</kbd> thoát</span>
        <button data-act="parent" title="Chọn phần tử cha (↑)">↑ Cha</button>
        <button data-act="ok" class="primary" disabled>Ẩn phần tử</button>
        <button data-act="cancel">Hủy</button>
      </div>`;
    const box = root.querySelector('.box');
    const tag = root.querySelector('.tag');
    const okBtn = root.querySelector('[data-act="ok"]');
    (document.body || document.documentElement).appendChild(host);

    // `base` là phần tử dưới con trỏ; `current` là base hoặc một phần tử cha của nó.
    session = { host, base: null, current: null, history: [] };

    const setCurrent = (el) => {
      session.current = isPickable(el) ? el : null;
      okBtn.disabled = !session.current;
      draw();
    };

    const draw = () => {
      const el = session?.current;
      if (!el || !el.isConnected) {
        box.style.display = tag.style.display = 'none';
        return;
      }
      const r = el.getBoundingClientRect();
      Object.assign(box.style, {
        display: 'block',
        left: r.left + 'px',
        top: r.top + 'px',
        width: r.width + 'px',
        height: r.height + 'px',
      });
      const label = el.localName + (el.id ? '#' + el.id : '') + [...el.classList].slice(0, 2).map((c) => '.' + c).join('');
      tag.textContent = `${label}  ${Math.round(r.width)}×${Math.round(r.height)}`;
      tag.style.display = 'block';
      tag.style.left = Math.max(4, r.left) + 'px';
      tag.style.top = (r.top > 24 ? r.top - 22 : r.bottom + 4) + 'px';
    };

    const goParent = () => {
      const el = session.current;
      if (el && isPickable(el.parentElement)) {
        session.history.push(el);
        setCurrent(el.parentElement);
      }
    };
    const goChild = () => {
      const prev = session.history.pop();
      if (prev) setCurrent(prev);
    };
    const confirm = () => {
      const el = session.current;
      if (!el) return;
      const selector = buildSelector(el);
      stop();
      onPick?.(selector, el);
    };

    const onMove = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || el === host || el === session.base) return;
      session.base = el;
      session.history = [];
      setCurrent(el);
    };
    // Chặn mọi tương tác với trang (bấm link, mở quảng cáo…) khi đang chọn.
    const swallow = (e) => {
      if (e.target === host) return; // click vào thanh công cụ
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.type === 'click') confirm();
    };
    const onKey = (e) => {
      const map = { Escape: stop, ArrowUp: goParent, ArrowDown: goChild, Enter: confirm };
      const fn = map[e.key];
      if (!fn) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      fn();
    };
    const onScroll = () => requestAnimationFrame(draw);

    root.addEventListener('click', (e) => {
      const act = e.target.closest?.('button')?.dataset.act;
      if (act === 'parent') goParent();
      else if (act === 'ok') confirm();
      else if (act === 'cancel') stop();
    });

    const listeners = [
      ['mousemove', onMove],
      ['mousedown', swallow],
      ['mouseup', swallow],
      ['pointerdown', swallow],
      ['pointerup', swallow],
      ['click', swallow],
      ['dblclick', swallow],
      ['contextmenu', swallow],
      ['keydown', onKey],
      ['scroll', onScroll],
      ['resize', onScroll],
    ];
    for (const [type, fn] of listeners) window.addEventListener(type, fn, true);
    session.cleanup = () => {
      for (const [type, fn] of listeners) window.removeEventListener(type, fn, true);
      host.remove();
    };

    if (initial) {
      session.base = initial;
      setCurrent(initial);
    }
  }

  function stop() {
    if (!session) return;
    session.cleanup();
    session = null;
  }

  /** Thông báo nhỏ góc dưới màn hình. */
  function toast(message) {
    const host = document.createElement('div');
    host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;left:50%;bottom:24px;transform:translateX(-50%);';
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = `
      <style>
        div { padding: 10px 16px; border-radius: 10px; background: #111827; color: #f9fafb;
              font: 13px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
              box-shadow: 0 10px 30px rgba(0,0,0,.35); max-width: 80vw; }
      </style>
      <div></div>`;
    root.querySelector('div').textContent = message;
    (document.body || document.documentElement).appendChild(host);
    setTimeout(() => host.remove(), 3000);
  }

  return { start, stop, toast, buildSelector, get active() { return !!session; } };
})();
