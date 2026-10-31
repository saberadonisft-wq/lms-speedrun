const STORAGE_KEY = "ghepWindowIds";

function layoutFor(count, bounds) {
  var cols = 1;
  var bestArea = 0;
  for (var c = 1; c <= count; c++) {
    var r = Math.ceil(count / c);
    var area = Math.floor(bounds.width / c) * Math.floor(bounds.height / r);
    if (area > bestArea) {
      bestArea = area;
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
    width: Math.max(120, x2 - x),
    height: Math.max(80, y2 - y)
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
