/* dc-lite : petit moteur de rendu autonome pour les pages au format « Design Component »
   (x-dc, {{trous}}, sc-if, sc-for, dc-import, renderVals / setState). Aucune dépendance. */
(function () {
  'use strict';
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var ONE = /^\{\{\s*([^}]+?)\s*\}\}$/;

  function lookup(path, ctx) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    var parts = path.split('.'), v = ctx;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }
  function str(v) { return v == null || v === false ? '' : String(v); }
  function interp(s, ctx) {
    var m = ONE.exec(s);
    if (m) return lookup(m[1], ctx);
    return s.replace(HOLE, function (_, p) { return str(lookup(p, ctx)); });
  }

  /* ---------- modèle -> nœuds virtuels ---------- */
  function build(tplNodes, ctx, comps) {
    var out = [];
    for (var i = 0; i < tplNodes.length; i++) {
      var n = tplNodes[i];
      if (n.nodeType === 3) {
        var t = n.data;
        out.push({ k: 'text', text: t.indexOf('{{') < 0 ? t : str(interp(t, ctx)) });
      } else if (n.nodeType === 1) {
        var name = n.localName;
        if (name === 'sc-if') {
          var ok = interp(n.getAttribute('value') || '', ctx);
          out.push({ k: 'group', kids: ok ? build(n.childNodes, ctx, comps) : [] });
        } else if (name === 'sc-for') {
          var list = interp(n.getAttribute('list') || '', ctx) || [];
          var as = n.getAttribute('as') || 'item';
          var items = [];
          for (var j = 0; j < list.length; j++) {
            var c2 = Object.create(ctx); c2[as] = list[j];
            items.push({ k: 'group', kids: build(n.childNodes, c2, comps) });
          }
          out.push({ k: 'group', kids: items });
        } else if (name === 'dc-import') {
          var cn = n.getAttribute('name'), props = {};
          for (var a = 0; a < n.attributes.length; a++) {
            var at = n.attributes[a];
            if (at.name === 'name' || at.name.indexOf('hint-') === 0) continue;
            props[at.name] = interp(at.value, ctx);
          }
          var C = comps[cn];
          if (!C) { out.push({ k: 'group', kids: [] }); continue; }
          var inst = new C.Logic(props);
          out.push({ k: 'group', kids: build(C.tpl.childNodes, inst.renderVals() || {}, comps) });
        } else {
          var attrs = {};
          for (var b = 0; b < n.attributes.length; b++) {
            var at2 = n.attributes[b];
            if (at2.name.indexOf('hint-') === 0) continue;
            attrs[at2.name] = at2.value.indexOf('{{') < 0 ? at2.value : interp(at2.value, ctx);
          }
          out.push({ k: 'el', tag: name, svg: n.namespaceURI === SVG_NS, attrs: attrs, kids: build(n.childNodes, ctx, comps) });
        }
      }
    }
    return out;
  }

  /* ---------- nœuds virtuels -> DOM ---------- */
  function setAttr(el, name, v, old) {
    if (name.slice(0, 2) === 'on' && name.length > 2) {
      el['on' + name.slice(2).toLowerCase()] = typeof v === 'function' ? v : null;
      return;
    }
    if (v == null || (v === false && name.slice(0, 5) !== 'aria-')) { el.removeAttribute(name); return; }
    el.setAttribute(name, v === true && name.slice(0, 5) !== 'aria-' ? '' : String(v));
  }
  function create(v) {
    if (v.k === 'text') return (v.dom = document.createTextNode(v.text));
    if (v.k === 'group') {
      var f = document.createDocumentFragment();
      for (var i = 0; i < v.kids.length; i++) f.appendChild(create(v.kids[i]));
      return f;
    }
    var el = v.svg ? document.createElementNS(SVG_NS, v.tag) : document.createElement(v.tag);
    for (var a in v.attrs) setAttr(el, a, v.attrs[a]);
    for (var k = 0; k < v.kids.length; k++) el.appendChild(create(v.kids[k]));
    return (v.dom = el);
  }
  function firstDom(v) {
    if (!v) return null;
    if (v.k !== 'group') return v.dom;
    for (var i = 0; i < v.kids.length; i++) { var d = firstDom(v.kids[i]); if (d) return d; }
    return null;
  }
  function remove(v) {
    if (v.k === 'group') { for (var i = 0; i < v.kids.length; i++) remove(v.kids[i]); return; }
    if (v.dom && v.dom.parentNode) v.dom.parentNode.removeChild(v.dom);
  }
  function same(o, n) {
    return o.k === n.k && (o.k !== 'el' || (o.tag === n.tag && o.svg === n.svg));
  }
  function patchList(parent, olds, news, after) {
    var next = after;
    var len = Math.max(olds.length, news.length);
    for (var i = len - 1; i >= 0; i--) {
      var o = olds[i], n = news[i];
      if (n && o && same(o, n)) {
        if (n.k === 'group') patchList(parent, o.kids, n.kids, next);
        else if (n.k === 'text') { n.dom = o.dom; if (o.text !== n.text) o.dom.data = n.text; }
        else {
          var el = (n.dom = o.dom);
          for (var a in n.attrs) if (n.attrs[a] !== o.attrs[a]) setAttr(el, a, n.attrs[a], o.attrs[a]);
          for (var b in o.attrs) if (!(b in n.attrs)) setAttr(el, b, null);
          patchList(el, o.kids, n.kids, null);
        }
      } else {
        if (o) remove(o);
        if (n) parent.insertBefore(create(n), next);
      }
      if (n) { var d = firstDom(n); if (d) next = d; }
    }
  }

  /* ---------- composants ---------- */
  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (u, cb) {
    var s = typeof u === 'function' ? u(this.state, this.props) : u;
    var changed = false;
    if (s) for (var k in s) if (this.state[k] !== s[k]) { changed = true; break; }
    if (changed) this.state = Object.assign({}, this.state, s);
    if (cb) (this._cbs = this._cbs || []).push(cb);
    if (this._mounted && !this._queued && (changed || cb || u === FORCE)) {
      this._queued = true;
      var self = this, run = function () { if (!self._queued) return; self._queued = false; self._render(); };
      if (document.hidden) setTimeout(run, 16); else { requestAnimationFrame(run); setTimeout(run, 100); }
    }
  };
  var FORCE = {};
  DCLogic.prototype.forceUpdate = function () { this.setState(FORCE); };
  window.DCLogic = DCLogic;

  function compile(tplEl, scriptEl) {
    var Logic = new Function('DCLogic', scriptEl.textContent + '\n;return Component;')(DCLogic);
    var props = {};
    try {
      var decl = JSON.parse(scriptEl.getAttribute('data-props') || '{}');
      for (var k in decl) if (k.charAt(0) !== '$' && decl[k] && 'default' in decl[k]) props[k] = decl[k].default;
    } catch (e) {}
    return { Logic: Logic, tpl: tplEl.content, props: props };
  }

  function mount(root, main, comps) {
    var inst = new main.Logic(Object.assign({}, main.props));
    var vtree = { k: 'group', kids: [] };
    inst._render = function () {
      window.__dcRenders=(window.__dcRenders||0)+1;
      var vals;
      try { vals = inst.renderVals() || {}; } catch (e) { console.error(e); return; }
      var next = { k: 'group', kids: build(main.tpl.childNodes, vals, comps) };
      patchList(root, vtree.kids, next.kids, null);
      vtree = next;
      var cbs = inst._cbs; inst._cbs = null;
      if (inst._mounted && inst.componentDidUpdate) { try { inst.componentDidUpdate(); } catch (e) { console.error(e); } }
      if (cbs) cbs.forEach(function (f) { try { f(); } catch (e) {} });
    };
    inst._render();
    inst._mounted = true;
    if (inst.componentDidMount) { try { inst.componentDidMount(); } catch (e) { console.error(e); } }
    window.addEventListener('pagehide', function () { if (inst.componentWillUnmount) try { inst.componentWillUnmount(); } catch (e) {} });
    return inst;
  }

  function boot() {
    var comps = {};
    document.querySelectorAll('template[data-dc-name]').forEach(function (t) {
      var s = document.querySelector('script[data-dc-for="' + t.getAttribute('data-dc-name') + '"]');
      comps[t.getAttribute('data-dc-name')] = compile(t, s);
    });
    var mainName = document.body.getAttribute('data-dc-main');
    var root = document.getElementById('dc-root');
    window.__dc = mount(root, comps[mainName], comps);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
