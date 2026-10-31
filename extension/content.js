(function () {
  if (document.getElementById("ghep-bai-launch")) return;

  function plain(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  function itemTitle(anchor) {
    var tile = anchor.querySelector(".sttile");
    return plain(tile ? tile.textContent : anchor.innerText || anchor.textContent);
  }

  function itemDepth(anchor) {
    var depth = 0;
    var parent = anchor.parentElement;
    while (parent && parent !== document.body) {
      var cls = parent.className;
      if (typeof cls !== "string") cls = "";
      if (cls.indexOf("class-lesson-child") !== -1 || cls.indexOf("__lesson-name-child") !== -1) depth += 1;
      parent = parent.parentElement;
    }
    return depth;
  }

  function lessonNodes() {
    return document.querySelectorAll(".__lesson-name a, .__lesson-name-child a, a.acursor");
  }

  function collect() {
    var nodes = lessonNodes();
    var items = [];
    var seen = {};
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].closest("#ghep-bai-panel, #ghep-bai-launch")) continue;
      var title = itemTitle(nodes[i]);
      if (title.length < 2) continue;
      var key = itemDepth(nodes[i]) + "|" + title;
      if (seen[key]) continue;
      seen[key] = true;
      items.push({ title: title.slice(0, 180), depth: itemDepth(nodes[i]) });
    }
    return items;
  }

  function flattenTree(nodes, depth, classId, out) {
    (nodes || []).forEach(function (node) {
      if (!node) return;
      var title = plain(node.title || node.name || "");
      var id = node.id ? String(node.id) : "";
      if (title && id && id !== "00000000-0000-0000-0000-000000000000") {
        out.push({
          title: title.slice(0, 180),
          depth: depth,
          url: location.origin + "/learn/lop-hoc/chi-tiet/" + classId + "/" + id + "#ghepId=" + id + "&ghep=" + encodeURIComponent(title)
        });
      }
      flattenTree(node.childrens || node.children || [], depth + 1, classId, out);
    });
  }

  function loadOutline() {
    var match = location.pathname.match(/\/lop-hoc\/chi-tiet\/([0-9a-f-]{36})/i);
    var token = "";
    try { token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token") || ""; } catch (e) { token = ""; }
    if (!match || !token) return Promise.resolve({ items: collect(), note: "Không thấy phiên đăng nhập để lấy mã bài." });
    return ask({ type: "tree", classId: match[1], token: token }).then(function (response) {
      var items = [];
      var nodes = response && response.nodes;
      if (nodes && !Array.isArray(nodes) && (nodes.childrens || nodes.children)) nodes = [nodes];
      if (nodes) flattenTree(nodes, 0, match[1], items);
      if (!items.length) return { items: collect(), note: response && response.error ? response.error : "Không đọc được mã từng bài." };
      var paths = {};
      items.forEach(function (item) { paths[item.url.split("#")[0]] = true; });
      return { items: items, note: items.length + " mục, " + Object.keys(paths).length + " địa chỉ khác nhau." };
    });
  }

  function lessonUrl(title) {
    var match = location.pathname.match(/\/lop-hoc\/chi-tiet\/([0-9a-f-]{36})/i);
    var base = match ? location.origin + "/learn/lop-hoc/chi-tiet/" + match[1] : location.href.split("#")[0];
    return base + "#ghep=" + encodeURIComponent(title);
  }

  function sameTitle(a, b) {
    a = plain(a).toLowerCase();
    b = plain(b).toLowerCase();
    if (!a || !b) return false;
    if (a === b) return true;
    return a.length > 12 && b.indexOf(a) !== -1 || b.length > 12 && a.indexOf(b) !== -1;
  }

  function openSavedLesson() {
    var found = location.hash.match(/[#&]ghep=([^&]+)/);
    if (!found) return;
    var title = found[1];
    try { title = decodeURIComponent(title); } catch (e) { /* giữ nguyên */ }
    var attempts = 0;
    var timer = setInterval(function () {
      attempts += 1;
      var nodes = lessonNodes();
      if (!nodes.length || attempts < 4) {
        if (attempts > 40) clearInterval(timer);
        return;
      }
      var exact = null;
      var loose = null;
      for (var i = 0; i < nodes.length; i++) {
        var current = itemTitle(nodes[i]);
        if (plain(current).toLowerCase() === plain(title).toLowerCase()) exact = nodes[i];
        else if (!loose && sameTitle(current, title)) loose = nodes[i];
      }
      var target = exact || loose;
      if (target) {
        target.click();
        clearInterval(timer);
      } else if (attempts > 40) clearInterval(timer);
    }, 500);
  }

  openSavedLesson();

  function ask(message) {
    return new Promise(function (resolve) {
      try {
        chrome.runtime.sendMessage(message, function (response) {
          if (chrome.runtime.lastError) resolve(null);
          else resolve(response || null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  function tile(urls) {
    return ask({
      type: "tile",
      urls: urls,
      screen: {
        left: screen.availLeft || 0,
        top: screen.availTop || 0,
        width: screen.availWidth || 1280,
        height: screen.availHeight || 800
      }
    }).then(function (response) {
      return response || { opened: 0, blocked: urls.length };
    });
  }

  function closeAll() {
    return ask({ type: "close" }).then(function (response) {
      return response && response.closed ? response.closed : 0;
    });
  }

  function css(node, styles) {
    Object.keys(styles).forEach(function (key) {
      node.style.setProperty(key, styles[key], "important");
    });
  }

  var launch = document.createElement("button");
  launch.id = "ghep-bai-launch";
  launch.type = "button";
  launch.textContent = "Ghép bài";
  css(launch, {
    position: "fixed",
    top: "12px",
    left: "12px",
    "z-index": "2147483646",
    border: "1px solid #08442f",
    background: "#08442f",
    color: "#f3faf6",
    padding: "8px 12px",
    cursor: "pointer",
    "font": "600 14px Segoe UI, Tahoma, sans-serif",
    "white-space": "nowrap",
    "border-radius": "2px"
  });
  document.documentElement.appendChild(launch);

  var closeAllButton = document.createElement("button");
  closeAllButton.id = "ghep-bai-close";
  closeAllButton.type = "button";
  closeAllButton.textContent = "Đóng hết";
  css(closeAllButton, {
    position: "fixed",
    top: "12px",
    left: "108px",
    "z-index": "2147483646",
    border: "1px solid #8d2f1b",
    background: "#8d2f1b",
    color: "#fffdfb",
    padding: "8px 12px",
    cursor: "pointer",
    "font": "600 14px Segoe UI, Tahoma, sans-serif",
    "white-space": "nowrap",
    "border-radius": "2px"
  });
  closeAllButton.addEventListener("click", function (event) {
    event.stopPropagation();
    event.preventDefault();
    closeAll();
  });
  document.documentElement.appendChild(closeAllButton);

  function closePanel() {
    var old = document.getElementById("ghep-bai-panel");
    if (old) old.remove();
  }

  function openPanel() {
    closePanel();
    var parts = collect();
    var panel = document.createElement("div");
    panel.id = "ghep-bai-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Ghép bài");
    css(panel, {
      position: "fixed",
      top: "52px",
      left: "12px",
      width: "min(360px, calc(100vw - 24px))",
      "max-height": "calc(100vh - 70px)",
      overflow: "auto",
      "z-index": "2147483646",
      background: "#f7f4ee",
      color: "#1c1916",
      border: "1px solid #d4cbc0",
      "box-shadow": "0 12px 32px rgba(28, 25, 22, 0.16)",
      "font-family": "Segoe UI, Tahoma, sans-serif",
      "font-size": "13px",
      "line-height": "1.4",
      "box-sizing": "border-box",
      padding: "12px"
    });

    var title = document.createElement("strong");
    title.textContent = "Đang lấy danh sách...";
    css(title, { display: "block", "margin-bottom": "8px", "font-size": "15px" });

    var list = document.createElement("div");
    css(list, {
      "max-height": "70vh",
      overflow: "auto",
      border: "1px solid #d4cbc0",
      background: "#fffdfb",
      padding: "4px 8px",
      "margin-bottom": "8px"
    });

    function renderParts(parts) {
      list.textContent = "";
      title.textContent = parts.length ? parts.length + " mục, mỗi mục một địa chỉ" : "Không thấy mục bài";
      parts.forEach(function (part) {
        var row = document.createElement("label");
        css(row, {
          display: "flex",
          gap: "8px",
          "align-items": "flex-start",
          padding: "4px 2px 4px " + (4 + part.depth * 14) + "px",
          cursor: "pointer"
        });
        var box = document.createElement("input");
        box.type = "checkbox";
        box.checked = false;
        box.dataset.title = part.title;
        box.dataset.url = part.url || "";
        css(box, { "margin-top": "2px", flex: "none" });
        var span = document.createElement("span");
        span.textContent = part.title;
        css(span, { "min-width": "0", "overflow-wrap": "anywhere" });
        row.append(box, span);
        list.appendChild(row);
      });
    }

    var go = document.createElement("button");
    go.type = "button";
    go.textContent = "Mở cửa sổ";
    css(go, {
      display: "block",
      width: "100%",
      border: "1px solid #08442f",
      background: "#08442f",
      color: "#f3faf6",
      padding: "8px 12px",
      cursor: "pointer",
      "font": "600 14px Segoe UI, Tahoma, sans-serif",
      "white-space": "nowrap"
    });

    var close = document.createElement("button");
    close.type = "button";
    close.textContent = "Đóng hết";
    css(close, {
      display: "block",
      width: "100%",
      border: "1px solid #d4cbc0",
      background: "#fffdfb",
      color: "#1c1916",
      padding: "8px 12px",
      cursor: "pointer",
      "font": "600 14px Segoe UI, Tahoma, sans-serif",
      "white-space": "nowrap",
      "margin-top": "8px"
    });

    var msg = document.createElement("p");
    msg.textContent = parts.length
      ? "Tick phần cần xem, rồi bấm Mở cửa sổ."
      : "Hãy mở mục bài giảng cho các video hiện ra, rồi bấm Ghép bài lần nữa.";
    css(msg, { margin: "8px 0 0", color: "#4f4942" });

    go.addEventListener("click", function () {
      var urls = Array.from(list.querySelectorAll("input:checked")).map(function (box) {
        return box.dataset.url || lessonUrl(box.dataset.title);
      });
      if (!urls.length) {
        msg.textContent = "Hãy tick ít nhất một phần.";
        return;
      }
      var paths = {};
      urls.forEach(function (url) { paths[url.split("#")[0]] = true; });
      if (Object.keys(paths).length < urls.length) {
        msg.textContent = "Link đã tick đang trùng nhau, nên cửa sổ sẽ mở cùng một bài.";
      }
      msg.textContent = "Đang xếp ô...";
      tile(urls).then(function (result) {
        msg.textContent = result.blocked
          ? "Đã mở " + result.opened + ", bị chặn " + result.blocked + "."
          : "Đã mở " + result.opened + " cửa sổ, khít màn hình.";
      });
    });

    close.addEventListener("click", function () {
      closeAll().then(function (closed) {
        msg.textContent = closed ? "Đã đóng " + closed + " cửa sổ." : "Không còn cửa sổ Ghép bài để đóng.";
      });
    });

    ["pointerdown", "click"].forEach(function (type) {
      panel.addEventListener(type, function (event) { event.stopPropagation(); });
    });
    panel.append(title, go, close, list, msg);
    document.documentElement.appendChild(panel);
    loadOutline().then(function (result) {
      var parts = result.items || [];
      renderParts(parts);
      msg.textContent = result.note || (parts.length
        ? "Tick đúng các bài cần xem. Mỗi cửa sổ sẽ mở một bài riêng."
        : "Không lấy được danh sách bài.");
    });
  }

  launch.addEventListener("click", function (event) {
    event.stopPropagation();
    event.preventDefault();
    if (document.getElementById("ghep-bai-panel")) closePanel();
    else openPanel();
  });
})();
