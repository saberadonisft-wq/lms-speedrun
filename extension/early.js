(function () {
  var pathIds = location.pathname.match(/\/chi-tiet\/[0-9a-f-]{36}\/([0-9a-f-]{36})/i);
  var hashIds = location.hash.match(/ghepId=([0-9a-f-]{36})/i);
  var wanted = (pathIds && pathIds[1]) || (hashIds && hashIds[1]) || "";
  if (!wanted) return;

  function rewrite(body) {
    if (!body || typeof body !== "object" || !body.data) return;
    body.data.lastContentId = wanted;
  }

  var open = XMLHttpRequest.prototype.open;
  var addEventListener = XMLHttpRequest.prototype.addEventListener;
  XMLHttpRequest.prototype.open = function () {
    this.__ghepUrl = String(arguments[1] || "");
    return open.apply(this, arguments);
  };
  XMLHttpRequest.prototype.addEventListener = function (type, listener, options) {
    var xhr = this;
    if ((type === "load" || type === "readystatechange") && String(xhr.__ghepUrl || "").indexOf("FrUserJoinClassNew") !== -1) {
      var wrapped = function () {
        if (xhr.readyState === 4 || type === "load") {
          try { rewrite(xhr.response); } catch (e) { /* bỏ qua */ }
        }
        return listener.apply(this, arguments);
      };
      return addEventListener.call(xhr, type, wrapped, options);
    }
    return addEventListener.apply(this, arguments);
  };
})();
