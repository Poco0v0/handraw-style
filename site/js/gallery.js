(() => {
  const catalog = Array.isArray(window.STYLE_CATALOG) ? window.STYLE_CATALOG : [];
  const GROUP_SHORT = {
    A: "A 社论漫画",
    B: "B 绘本",
    C: "C 现代平面",
    D: "D 日本",
    E: "E 中国",
    F: "F 网感媒介",
    G: "G 当代补充",
  };

  const grid = document.querySelector("#grid");
  const filters = document.querySelector("#group-filters");
  const countEl = document.querySelector("#filter-count");
  const searchWrap = document.querySelector("#search-wrap");
  const searchInput = document.querySelector("#search");
  const exploreBtn = document.querySelector("#explore-btn");
  const indexBtn = document.querySelector("#index-btn");
  const indexDialog = document.querySelector("#index-dialog");
  const indexGrid = document.querySelector("#index-grid");
  const indexClose = document.querySelector("#index-close");
  const toastEl = document.querySelector("#toast");
  const floatNav = document.querySelector(".float-nav");
  const copyDialog = document.querySelector("#copy-dialog");
  const copyText = document.querySelector("#copy-text");
  const copyClose = document.querySelector("#copy-close");

  const groups = [...new Map(catalog.map((item) => [item.group[0], item.group]))];

  const state = {
    group: parseGroupHash(location.hash),
    query: "",
  };

  function parseGroupHash(hash) {
    const key = decodeURIComponent((hash || "").replace(/^#/, "")).toUpperCase();
    return GROUP_SHORT[key] ? key : "all";
  }

  function groupTags(group) {
    const letter = group.slice(0, 1);
    const rest = group.slice(2).split("/").map((part) => part.trim()).filter(Boolean);
    return [`#${letter}`, ...rest.map((part) => `#${part}`)];
  }

  function buildPrompt(style) {
    const lines = [
      `风格名称：#${style.number} · ${style.generation_name}。`,
      `参考作者/风格名称：${style.reference}。`,
    ];
    if (style.traits) lines.push(style.traits);
    return lines.join("\n");
  }

  function visible(style) {
    if (state.group !== "all" && style.group[0] !== state.group) return false;
    const q = state.query.trim().toLowerCase();
    if (!q) return true;
    return `${style.number} ${style.generation_name} ${style.reference} ${style.group}`
      .toLowerCase()
      .includes(q);
  }

  function styleCard(style, eager) {
    const tags = groupTags(style.group);
    const article = document.createElement("article");
    article.className = "card";
    article.id = `style-${style.number}`;
    article.dataset.number = style.number;
    article.dataset.group = style.group[0];

    const button = document.createElement("button");
    button.className = "thumb";
    button.type = "button";
    button.setAttribute(
      "aria-label",
      `复制 #${style.number} ${style.generation_name} 的提示词`,
    );

    const img = document.createElement("img");
    img.src = style.image;
    img.alt = `#${style.number} ${style.generation_name}`;
    img.width = style.width || 314;
    img.height = style.height || 314;
    img.loading = eager ? "eager" : "lazy";
    img.decoding = "async";

    const meta = document.createElement("div");
    meta.className = "hover-meta";
    meta.setAttribute("aria-hidden", "true");
    meta.innerHTML = `
      <p>#${style.number}</p>
      <p class="meta-name">${escapeHtml(style.generation_name)}</p>
      <p class="meta-ref">${escapeHtml(style.reference)}</p>
      <p class="meta-tags">${tags.map(escapeHtml).join(" ")}</p>
    `;

    button.append(img, meta);
    button.addEventListener("mouseenter", () => button.classList.add("is-hover"));
    button.addEventListener("mouseleave", () => button.classList.remove("is-hover"));
    button.addEventListener("focus", () => button.classList.add("is-hover"));
    button.addEventListener("blur", () => button.classList.remove("is-hover"));
    button.addEventListener("click", () => copyPrompt(style));

    const title = document.createElement("h2");
    title.className = "card-title";
    title.textContent = style.generation_name;

    const tagRow = document.createElement("p");
    tagRow.className = "card-tags";
    tags.forEach((tag) => {
      const span = document.createElement("span");
      span.textContent = tag;
      tagRow.append(span);
    });

    article.append(button, title, tagRow);
    return article;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderFilters() {
    filters.replaceChildren();
    const all = document.createElement("button");
    all.className = "group-pill";
    all.type = "button";
    all.setAttribute("role", "tab");
    all.dataset.group = "all";
    all.textContent = "全部";
    all.title = "全部 group";
    all.setAttribute("aria-selected", state.group === "all" ? "true" : "false");
    all.addEventListener("click", () => setGroup("all"));
    filters.append(all);

    groups.forEach(([key, full]) => {
      const btn = document.createElement("button");
      btn.className = "group-pill";
      btn.type = "button";
      btn.setAttribute("role", "tab");
      btn.dataset.group = key;
      btn.textContent = GROUP_SHORT[key] || key;
      btn.title = full;
      btn.setAttribute("aria-selected", state.group === key ? "true" : "false");
      btn.addEventListener("click", () => setGroup(key));
      filters.append(btn);
    });
  }

  function renderGrid(options = {}) {
    const items = catalog.filter(visible);
    const fragment = document.createDocumentFragment();
    items.forEach((style, index) => fragment.append(styleCard(style, index < 12)));
    grid.replaceChildren(fragment);
    countEl.textContent = `${items.length} works`;
    if (options.pin) {
      document.querySelector("#work")?.scrollIntoView({ block: "start" });
    }
  }

  function renderIndex() {
    indexGrid.replaceChildren();
    catalog.forEach((style) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = style.number;
      btn.title = `${style.generation_name} · ${style.reference}`;
      btn.addEventListener("click", () => {
        setGroup("all");
        state.query = "";
        searchInput.value = "";
        renderGrid();
        indexDialog.close();
        const target = document.querySelector(`#style-${style.number}`);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      indexGrid.append(btn);
    });
  }

  function setGroup(group) {
    state.group = group;
    const nextHash = group === "all" ? "#work" : `#${group}`;
    if (location.hash !== nextHash) history.replaceState(null, "", nextHash);
    renderFilters();
    renderGrid({ pin: true });
    updateFloatNav();
  }

  function updateFloatNav() {
    const hash = location.hash || "#work";
    floatNav.querySelectorAll("a").forEach((link) => {
      const current = link.getAttribute("href") === hash || (hash === "" && link.getAttribute("href") === "#work");
      if (current) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  async function copyPrompt(style) {
    const text = buildPrompt(style);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopy(text);
      }
      showToast(`已复制 #${style.number} 提示词`);
    } catch {
      try {
        fallbackCopy(text);
        showToast(`已复制 #${style.number} 提示词`);
      } catch {
        openCopyDialog(text, style.number);
      }
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.width = "1px";
    ta.style.height = "1px";
    ta.style.opacity = "0";
    document.body.append(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    ta.remove();
    if (!ok) throw new Error("copy failed");
  }

  function openCopyDialog(text, number) {
    copyText.value = text;
    document.querySelector("#copy-title").textContent = `#${number} 提示词`;
    copyDialog.showModal();
    copyText.focus();
    copyText.select();
    showToast("请手动复制提示词");
  }

  let toastTimer = 0;
  function showToast(message) {
    toastEl.textContent = message;
    toastEl.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastEl.hidden = true;
    }, 1800);
  }

  exploreBtn.addEventListener("click", () => {
    const open = searchWrap.hidden;
    searchWrap.hidden = !open;
    exploreBtn.setAttribute("aria-pressed", open ? "true" : "false");
    if (open) searchInput.focus();
  });

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    renderGrid({ pin: true });
  });

  indexBtn.addEventListener("click", () => indexDialog.showModal());
  indexClose.addEventListener("click", () => indexDialog.close());
  indexDialog.addEventListener("click", (event) => {
    if (event.target === indexDialog) indexDialog.close();
  });
  copyClose.addEventListener("click", () => copyDialog.close());
  copyDialog.addEventListener("click", (event) => {
    if (event.target === copyDialog) copyDialog.close();
  });

  window.addEventListener("hashchange", () => {
    const next = parseGroupHash(location.hash);
    if ("ABCDEFG".includes((location.hash || "").replace(/^#/, "").toUpperCase())) {
      if (next !== state.group) setGroup(next);
      return;
    }
    updateFloatNav();
  });

  renderFilters();
  renderIndex();
  renderGrid();
  updateFloatNav();
})();
