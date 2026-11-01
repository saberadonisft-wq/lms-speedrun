const STORAGE_KEY = "ghepWindowIds";

function layoutFor(count, bounds) {
  var cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  var best = Infinity;
  for (var c = 1; c <= count; c++) {
    var r = Math.ceil(count / c);
    var cellW = bounds.width / c;
    var cellH = bounds.height / r;
    var ratio = cellW > cellH ? cellW / cellH : cellH / cellW;
    var score = ratio + (cellH < 220 ? (220 - cellH) / 40 : 0);
    if (score < best) {
      best = score;
      cols = c;
    }
  }
  return {
    cols: cols,
    rows: Math.ceil(count / cols),
    left: bounds.left,
    top: bounds.top,
    width: bounds.width,
    height: bounds.height
  };
}

function cellBox(index, layout) {
  var col = index % layout.cols;
  var row = Math.floor(index / layout.cols);
  var x = layout.left + Math.round((col * layout.width) / layout.cols);
  var x2 = layout.left + Math.round(((col + 1) * layout.width) / layout.cols);
  var y = layout.top + Math.round((row * layout.height) / layout.rows);
  var y2 = layout.top + Math.round(((row + 1) * layout.height) / layout.rows);
  return {
    left: x,
    top: y,
    width: Math.max(1, x2 - x),
    height: Math.max(1, y2 - y)
  };
}

function isLessonPopup(win) {
  if (!win || win.type !== "popup" || !win.tabs || !win.tabs.length) return false;
  var url = win.tabs[0].url || "";
  return url.indexOf("lms.vnu.edu.vn/learn/lop-hoc/chi-tiet") !== -1;
}

async function closeLessonPopups() {
  var wins = await chrome.windows.getAll({ populate: true });
  var closed = 0;
  for (var i = 0; i < wins.length; i++) {
    if (!isLessonPopup(wins[i])) continue;
    try {
      await chrome.windows.remove(wins[i].id);
      closed += 1;
    } catch (e) { /* cửa sổ đã đóng */ }
  }
  await chrome.storage.local.set({ ghepWindowIds: [] });
  return closed;
}

async function wait(ms) {
  await new Promise(function (resolve) { setTimeout(resolve, ms); });
}

async function forceLesson(tabId, url) {
  var path = String(url).match(/\/chi-tiet\/[0-9a-f-]{36}\/([0-9a-f-]{36})/i);
  var hash = String(url).match(/[#&]ghep=([^&]+)/);
  var contentId = path ? path[1] : "";
  var title = "";
  if (hash) {
    try { title = decodeURIComponent(hash[1]); } catch (e) { title = hash[1]; }
  }
  if (!tabId || (!contentId && !title)) return;
  await wait(2500);
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: "MAIN",
      args: [contentId, title],
      func: function (contentId, title) {
        function plain(text) {
          return String(text || "").replace(/\s+/g, " ").trim().toLowerCase();
        }
        function wantedId(value) {
          if (!value) return "";
          if (typeof value === "string") return value;
          if (typeof value === "object") return String(value.value || value.id || "");
          return String(value);
        }
        function findComp(root) {
          var stack = [root];
          while (stack.length) {
            var el = stack.pop();
            var names = [];
            try { names = Object.keys(el); } catch (e) { names = []; }
            for (var i = 0; i < names.length; i++) {
              var value;
              try { value = el[names[i]]; } catch (e) { continue; }
              var comp = value && value.component ? value.component : value;
              if (comp && typeof comp.doViewContent === "function" && comp.classContentFull) return comp;
            }
            var children = el.children || [];
            for (var c = 0; c < children.length; c++) stack.push(children[c]);
          }
          return null;
        }
        var comp = findComp(document.documentElement);
        if (comp) {
          var node = null;
          for (var i = 0; i < comp.classContentFull.length; i++) {
            var item = comp.classContentFull[i];
            if (contentId && wantedId(item.id) === contentId) { node = item; break; }
            if (!node && title && plain(item.title || item.name) === plain(title)) node = item;
          }
          if (node) {
            try { comp.doViewContent(node, node.typeId); return; } catch (e) { /* thử bấm */ }
          }
        }
        var wanted = plain(title);
        var anchors = document.querySelectorAll(".__lesson-name a, .__lesson-name-child a, a.acursor");
        for (var a = 0; a < anchors.length; a++) {
          var text = plain(anchors[a].innerText);
          if (!wanted || !text) continue;
          if (text === wanted || text.indexOf(wanted) !== -1 || wanted.indexOf(text) !== -1) {
            anchors[a].click();
            return;
          }
        }
      }
    });
  } catch (e) { /* tab đã đóng hoặc chưa sẵn sàng */ }
}

async function tile(urls, bounds) {
  await closeLessonPopups();
  var layout = layoutFor(urls.length, bounds);
  var ids = [];
  var opened = 0;
  var blocked = 0;
  for (var i = 0; i < urls.length; i++) {
    var box = cellBox(i, layout);
    try {
      var win = await chrome.windows.create({
        url: urls[i],
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        type: "popup",
        focused: false
      });
      await chrome.windows.update(win.id, {
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        state: "normal",
        focused: false
      });
      ids.push(win.id);
      opened += 1;
      if (i < urls.length - 1) await wait(800);
    } catch (e) {
      blocked += 1;
    }
  }
  await chrome.storage.local.set({ ghepWindowIds: ids });
  return { opened: opened, blocked: blocked };
}

async function lessonTree(classId, token) {
  var url = "https://vnu.dttt.vn/dhqg.lms.api/api/v1/LmsClassContent/frGetByClassId/" + encodeURIComponent(classId);
  var res = await fetch(url, {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json"
    }
  });
  if (!res.ok) return { nodes: [], error: "API " + res.status };
  var json = await res.json();
  var nodes = Array.isArray(json) ? json : (json && (json.data || json.Data)) || [];
  if (nodes && !Array.isArray(nodes)) nodes = nodes.childrens || nodes.children || [];
  return { nodes: nodes };
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message && message.type === "tree") {
    lessonTree(message.classId, message.token).then(function (result) {
      sendResponse(result);
    }).catch(function () {
      sendResponse({ nodes: [] });
    });
    return true;
  }
  if (!message || message.type === "close") {
    closeLessonPopups().then(function (closed) {
      sendResponse({ closed: closed });
    });
    return true;
  }
  if (message.type === "tile") {
    tile(message.urls || [], message.screen).then(function (result) {
      sendResponse(result);
    });
    return true;
  }
  return false;
});
