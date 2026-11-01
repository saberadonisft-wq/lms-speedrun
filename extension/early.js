(function () {
  function plain(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function readPath() {
    var raw = "";
    var fromQuery = location.search.match(/[?&]ghepPath=([^&]+)/);
    var fromHash = location.hash.match(/[#&]ghepPath=([^&]+)/);
    if (fromQuery) raw = fromQuery[1];
    else if (fromHash) raw = fromHash[1];
    if (!raw) return [];
    try { raw = decodeURIComponent(raw); } catch (e) { /* giữ nguyên */ }
    try { sessionStorage.setItem("ghep-path", raw); } catch (e) { /* bỏ qua */ }
    try {
      var path = JSON.parse(raw);
      return Array.isArray(path) ? path : [];
    } catch (e2) {
      return raw ? [raw] : [];
    }
  }

  var path = readPath();
  var pathIds = location.pathname.match(/\/chi-tiet\/[0-9a-f-]{36}\/([0-9a-f-]{36})/i);
  var wanted = pathIds ? pathIds[1].toLowerCase() : "";
  var leafTitle = path.length ? plain(path[path.length - 1]).toLowerCase() : "";

  var tracking = !!(wanted || leafTitle);

  function idText(value) {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number") return String(value).toLowerCase();
    try {
      if (typeof value.toString === "function") {
        var text = value.toString();
        if (text && text !== "[object Object]") return String(text).toLowerCase();
      }
    } catch (e) { /* bỏ qua */ }
    if (value.value) return String(value.value).toLowerCase();
    return "";
  }

  function expandTo(nodes, target) {
    if (!nodes || !nodes.length) return false;
    for (var i = 0; i < nodes.length; i++) {
      var item = nodes[i];
      if (item === target || idText(item.id) === idText(target.id)) {
        item.isView = 1;
        item.selected = true;
        return true;
      }
      if (expandTo(item.childrens || item.children, target)) {
        item.isView = 1;
        return true;
      }
    }
    return false;
  }

  var folderType = "42ee141a-f4dc-457e-a487-fc655fdc5506";
  var openedTitle = leafTitle;
  var openedOnce = false;

  function isFolderNode(node) {
    return !!(node && (node.isFolder || idText(node.typeId) === folderType));
  }

  function firstLesson(node) {
    if (!node || !isFolderNode(node)) return node;
    var children = node.childrens || node.children || [];
    for (var i = 0; i < children.length; i++) {
      var found = firstLesson(children[i]);
      if (found && !isFolderNode(found)) return found;
    }
    return null;
  }

  function choose(comp) {
    var list = comp.classContentFull || [];
    var byId = null;
    var byTitle = null;
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (wanted && idText(item.id) === wanted) byId = item;
      if (leafTitle && plain(item.title || item.name).toLowerCase() === leafTitle) byTitle = item;
    }
    var node = byId || byTitle;
    if (!node) return null;
    return isFolderNode(node) ? (firstLesson(node) || node) : node;
  }

  function showingLeaf() {
    if (!openedTitle) return false;
    var view = document.getElementById("tnContentView");
    if (!view) return false;
    var lines = String(view.innerText || "").split(/\n+/);
    for (var i = 0; i < lines.length && i < 12; i++) {
      if (plain(lines[i]).toLowerCase().indexOf(openedTitle) !== -1) return true;
    }
    return false;
  }

  function selectLesson(comp, lesson) {
    if (!lesson) return;
    var title = plain(lesson.title || lesson.name).toLowerCase();
    if (title) openedTitle = title;
    try { expandTo(comp.classContent, lesson); } catch (e) { /* cây không mở được thì vẫn tải bài */ }
    try { comp.contentFirst = lesson; comp.contentViewId = lesson.id; } catch (e2) { /* bỏ qua */ }
  }

  window.__ghepPick = function (comp) {
    try { window.__ghepComp = comp; } catch (e) { /* bỏ qua */ }
    var lesson = choose(comp);
    if (!lesson || isFolderNode(lesson)) return;
    selectLesson(comp, lesson);
    window.__ghepAwaitBegin = !comp.tabs;
  };

  function openOnce(comp) {
    if (openedOnce || showingLeaf()) return;
    var lesson = choose(comp);
    if (!lesson || isFolderNode(lesson)) return;
    if (!comp.cacHoatDong || typeof comp.cacHoatDong.begin !== "function") return;
    openedOnce = true;
    selectLesson(comp, lesson);
    try { if (typeof comp.cacHoatDong.onReturn === "function") comp.cacHoatDong.onReturn(); } catch (e) { /* bỏ qua */ }
    comp.cacHoatDong.begin(lesson);
  }

  function lessonRows(comp) {
    var out = [];
    function walk(nodes, depth, ancestors) {
      (nodes || []).forEach(function (node) {
        if (!node) return;
        var title = plain(node.title || node.name || "");
        var id = idText(node.id);
        var next = title ? ancestors.concat([title]) : ancestors.slice();
        if (title && /^[0-9a-f-]{36}$/i.test(id) && id !== "00000000-0000-0000-0000-000000000000") {
          out.push({ title: title.slice(0, 180), depth: depth, path: next, id: id });
        }
        walk(node.childrens || node.children, depth + 1, next);
      });
    }
    try { walk(comp && comp.classContent, 0, []); } catch (e) { /* cây chưa tải */ }
    return out;
  }

  document.addEventListener("ghep-need-tree", function () {
    var rows = [];
    try { rows = lessonRows(window.__ghepComp); } catch (e) { rows = []; }
    document.dispatchEvent(new CustomEvent("ghep-tree", { detail: rows }));
  });

  function patchModules(mods) {
    if (!mods) return;
    Object.keys(mods).forEach(function (id) {
      var fn = mods[id];
      if (typeof fn !== "function") return;
      var src = Function.prototype.toString.call(fn);
      if (src.indexOf("doViewContinue") === -1 && src.indexOf("classContentFull[u].id==") === -1) return;
      var next = src
        .replace(
          "if(null!=n.classContentId&&(n.classUser.lastContentId=n.classContentId)",
          "if(window.__ghepComp=n,null!=n.classContentId&&(n.classUser.lastContentId=n.classContentId)"
        )
        .replace(
          /l\.prototype\.doViewContinue=function\(\)\{var n=this/g,
          "l.prototype.doViewContinue=function(){try{window.__ghepComp=this;window.__ghepPick&&window.__ghepPick(this)}catch(ghepErr){}var n=this"
        );
      if (next === src) return;
      try { mods[id] = eval("(" + next + ")"); } catch (e) { /* giữ hàm gốc */ }
    });
  }

  try {
    var installed = window.webpackJsonp;
    Object.defineProperty(window, "webpackJsonp", {
      configurable: true,
      enumerable: true,
      get: function () { return installed; },
      set: function (value) {
        if (typeof value !== "function") { installed = value; return; }
        var original = value;
        installed = function (ids, mods, extra) {
          try { patchModules(mods); } catch (e) { /* chunk không liên quan */ }
          return original.call(this, ids, mods, extra);
        };
      }
    });
  } catch (e) { /* trang đã khóa webpackJsonp */ }

  if (tracking) window.addEventListener("load", function () {
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      var comp = window.__ghepComp;
      if (window.__ghepAwaitBegin && comp && comp.cacHoatDong && typeof comp.cacHoatDong.begin === "function") {
        window.__ghepAwaitBegin = false;
        try { openOnce(comp); } catch (e) { /* tab chưa có nên mở một lần */ }
        clearInterval(timer);
        return;
      }
      if ((comp && comp.tabs) || tries > 40) clearInterval(timer);
    }, 500);
  });
})();
