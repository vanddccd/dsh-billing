function makeFactory(require){var module={exports:{}},exports=module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// client/src/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  testHooks: () => testHooks
});
module.exports = __toCommonJS(index_exports);
var import_react3 = require("react");

// client/src/rolling.tsx
var import_react = require("react");

// node_modules/@number-flow/react/dist/index.mjs
var React2 = __toESM(require("react"), 1);

// node_modules/esm-env/true.js
var true_default = true;

// node_modules/esm-env/dev-fallback.js
var node_env = globalThis.process?.env?.NODE_ENV;
var dev_fallback_default = node_env && !node_env.toLowerCase().startsWith("prod");

// node_modules/number-flow/dist/ssr-DvIINv8w.mjs
var h = String.raw;
var m = String.raw;
var v = true_default && (() => {
  try {
    document.createElement("div").animate({ opacity: 0 }, { easing: "linear(0, 1)" });
  } catch {
    return false;
  }
  return true;
})();
var k = true_default && typeof CSS < "u" && CSS.supports && CSS.supports("line-height", "mod(1,1)");
var S = true_default && typeof matchMedia < "u" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
var d = "--_number-flow-d-opacity";
var g = "--_number-flow-d-width";
var c = "--_number-flow-dx";
var u = "--_number-flow-d";
var _ = (() => {
  try {
    return CSS.registerProperty({
      name: d,
      syntax: "<number>",
      inherits: false,
      initialValue: "0"
    }), CSS.registerProperty({
      name: c,
      syntax: "<length>",
      inherits: true,
      initialValue: "0px"
    }), CSS.registerProperty({
      name: g,
      syntax: "<number>",
      inherits: false,
      initialValue: "0"
    }), CSS.registerProperty({
      name: u,
      syntax: "<number>",
      inherits: true,
      initialValue: "0"
    }), true;
  } catch {
    return false;
  }
})();
var s = "round(nearest, calc(var(--number-flow-mask-height, 0.25em) / 2), 1px)";
var t = `calc(${s} * 2)`;
var p = "var(--number-flow-mask-width, 0.5em)";
var n = `calc(${p} / var(--scale-x))`;
var r = "#000 0, transparent 71%";
var x = m`:host{display:inline-block;direction:ltr;white-space:nowrap;isolation:isolate;line-height:1}.number,.number__inner{display:inline-block;transform-origin:left top}:host([data-will-change]) :is(.number,.number__inner,.section,.digit,.digit__num,.symbol){will-change:transform}.number{--scale-x:calc(1 + var(${g}) / var(--width));transform:translateX(var(${c})) scaleX(var(--scale-x));margin:0 calc(-1 * ${p});position:relative;-webkit-mask-image:linear-gradient(to right,transparent 0,#000 ${n},#000 calc(100% - ${n}),transparent ),linear-gradient(to bottom,transparent 0,#000 ${t},#000 calc(100% - ${t}),transparent 100% ),radial-gradient(at bottom right,${r}),radial-gradient(at bottom left,${r}),radial-gradient(at top left,${r}),radial-gradient(at top right,${r});-webkit-mask-size:100% calc(100% - ${t} * 2),calc(100% - ${n} * 2) 100%,${n} ${t},${n} ${t},${n} ${t},${n} ${t};-webkit-mask-position:center,center,top left,top right,bottom right,bottom left;-webkit-mask-repeat:no-repeat}.number__inner{padding:${s} ${p};transform:scaleX(calc(1 / var(--scale-x))) translateX(calc(-1 * var(${c})))}:host > :not(.number){z-index:5}.section,.symbol{display:inline-block;position:relative;isolation:isolate}.section::after{content:'\200b';display:inline-block}.section--justify-left{transform-origin:center left}.section--justify-right{transform-origin:center right}.section > [inert],.symbol > [inert]{margin:0 !important;position:absolute !important;z-index:-1}.digit{display:inline-block;position:relative;--c:var(--current) + var(${u})}.digit__num,.number .section::after{padding:${s} 0}.digit__num{display:inline-block;--offset-raw:mod(var(--length) + var(--n) - mod(var(--c),var(--length)),var(--length));--offset:calc( var(--offset-raw) - var(--length) * round(down,var(--offset-raw) / (var(--length) / 2),1) );--y:clamp(-100%,var(--offset) * 100%,100%);transform:translateY(var(--y))}.digit__num[inert]{position:absolute;top:0;left:50%;transform:translateX(-50%) translateY(var(--y))}.digit:not(.is-spinning) .digit__num[inert]{display:none}.symbol__value{display:inline-block;mix-blend-mode:plus-lighter;white-space:pre}.section--justify-left .symbol > [inert]{left:0}.section--justify-right .symbol > [inert]{right:0}.animate-presence{opacity:calc(1 + var(${d}))}`;
var M = true_default && typeof HTMLElement < "u" ? HTMLElement : class {
};
var y = m`:host{display:inline-block;direction:ltr;white-space:nowrap;line-height:1}span{display:inline-block}:host([data-will-change]) span{will-change:transform}.number,.digit{padding:${s} 0}.symbol{white-space:pre}`;
var b = (e) => `<span class="${e.type === "integer" || e.type === "fraction" ? "digit" : "symbol"}" part="${e.type === "integer" || e.type === "fraction" ? `digit ${e.type}-digit` : `symbol ${e.type}`}">${e.value}</span>`;
var i = (e, a) => `<span part="${a}">${e.reduce((l2, f2) => l2 + b(f2), "")}</span>`;
var $ = (e = "") => m`:where(number-flow${e}){line-height:1}number-flow${e} > span{font-kerning:none;display:inline-block;padding:${t} 0}`;
var V = (e, { nonce: a, elementSuffix: l2 } = {}) => (
  // shadowroot="open" non-standard attribute for old Chrome:
  h`<template shadowroot="open" shadowrootmode="open"
			><style${a ? ` nonce="${a}"` : ""}>${y}</style
			><span role="img" aria-label="${e.valueAsString}"
				>${i(e.pre, "left")}<span part="number" class="number"
					>${i(e.integer, "integer")}${i(e.fraction, "fraction")}</span
				>${i(e.post, "right")}</span
			></template
		><style${a ? ` nonce="${a}"` : ""}>${$(l2)}</style
		><span>${e.valueAsString}</span>`
);

// node_modules/number-flow/dist/lite.mjs
var f = (n2, t2, e) => {
  const i2 = document.createElement(n2), [s2, o] = Array.isArray(t2) ? [void 0, t2] : [t2, e];
  return s2 && Object.assign(i2, s2), o == null || o.forEach((a) => i2.appendChild(a)), i2;
};
var D = (n2, t2) => {
  var e;
  return t2 === "left" ? n2.offsetLeft : (((e = n2.offsetParent instanceof HTMLElement ? n2.offsetParent : null) == null ? void 0 : e.offsetWidth) ?? 0) - n2.offsetWidth - n2.offsetLeft;
};
var W = (n2) => n2.offsetWidth > 0 && n2.offsetHeight > 0;
var X = (n2, t2) => {
  true_default && typeof HTMLElement < "u" && typeof customElements < "u" && !customElements.get(n2) && customElements.define(n2, t2);
};
function k2(n2, t2, { reverse: e = false } = {}) {
  const i2 = n2.length;
  for (let s2 = e ? i2 - 1 : 0; e ? s2 >= 0 : s2 < i2; e ? s2-- : s2++)
    t2(n2[s2], s2);
}
function z(n2, t2, e, i2) {
  const s2 = t2.formatToParts(n2);
  e && s2.unshift({ type: "prefix", value: e }), i2 && s2.push({ type: "suffix", value: i2 });
  const o = [], a = [], r3 = [], d2 = [], c2 = {}, p2 = (l2) => `${l2}:${c2[l2] = (c2[l2] ?? -1) + 1}`;
  let u2 = "", m2 = false, g2 = false;
  for (const l2 of s2) {
    u2 += l2.value;
    const h4 = l2.type === "minusSign" || l2.type === "plusSign" ? "sign" : l2.type;
    h4 === "integer" ? (m2 = true, a.push(...l2.value.split("").map((_2) => ({ type: h4, value: parseInt(_2) })))) : h4 === "group" ? a.push({ type: h4, value: l2.value }) : h4 === "decimal" ? (g2 = true, r3.push({ type: h4, value: l2.value, key: p2(h4) })) : h4 === "fraction" ? r3.push(...l2.value.split("").map((_2) => ({
      type: h4,
      value: parseInt(_2),
      key: p2(h4),
      pos: -1 - c2[h4]
    }))) : (m2 || g2 ? d2 : o).push({
      type: h4,
      value: l2.value,
      key: p2(h4)
    });
  }
  const v2 = [];
  for (let l2 = a.length - 1; l2 >= 0; l2--) {
    const h4 = a[l2];
    v2.unshift(h4.type === "integer" ? {
      ...h4,
      key: p2(h4.type),
      pos: c2[h4.type]
    } : {
      ...h4,
      key: p2(h4.type)
    });
  }
  return {
    pre: o,
    integer: v2,
    fraction: r3,
    post: d2,
    valueAsString: u2,
    value: typeof n2 == "string" ? parseFloat(n2) : n2
  };
}
var E = k && v && _;
var B = class extends M {
  constructor() {
    super(), this.created = false, this.batched = false, this._preUpdated = false;
    const { animated: t2, ...e } = this.constructor.defaultProps;
    this._animated = this.computedAnimated = t2, Object.assign(this, e);
  }
  get animated() {
    return this._animated;
  }
  set animated(t2) {
    var e;
    this.animated !== t2 && (this._animated = t2, (e = this.shadowRoot) == null || e.getAnimations().forEach((i2) => i2.finish()));
  }
  /**
   * @internal
   */
  set data(t2) {
    var r3, d2;
    if (t2 == null || t2 === this._data)
      return;
    const { pre: e, integer: i2, fraction: s2, post: o, value: a } = t2;
    if (this.created) {
      const c2 = this._data;
      this._data = t2, this.computedTrend = typeof this.trend == "function" ? this.trend(c2.value, a) : this.trend, this.computedAnimated = E && this._animated && (!this.respectMotionPreference || !((r3 = S) != null && r3.matches)) && // https://github.com/barvian/number-flow/issues/9
      W(this) && // https://github.com/barvian/number-flow/issues/165
      this.ownerDocument.visibilityState === "visible", (d2 = this.plugins) == null || d2.forEach((p2) => {
        var u2;
        return (u2 = p2.onUpdate) == null ? void 0 : u2.call(p2, t2, c2, this);
      }), this.batched || this.willUpdate(), this._pre.update(e), this._num.update({ integer: i2, fraction: s2 }), this._post.update(o), this.batched || this.didUpdate();
    } else {
      this._data = t2, this.attachShadow({ mode: "open" });
      try {
        this._internals ?? (this._internals = this.attachInternals()), this._internals.role = "img";
      } catch {
      }
      const c2 = document.createElement("style");
      this.nonce && (c2.nonce = this.nonce), c2.textContent = x, this.shadowRoot.appendChild(c2), this._pre = new U(this, e, {
        justify: "right",
        part: "left"
      }), this.shadowRoot.appendChild(this._pre.el), this._num = new F(this, i2, s2), this.shadowRoot.appendChild(this._num.el), this._post = new U(this, o, {
        justify: "left",
        part: "right"
      }), this.shadowRoot.appendChild(this._post.el), this.created = true;
    }
    try {
      this._internals.ariaLabel = t2.valueAsString;
    } catch {
    }
  }
  /**
   * @internal
   */
  willUpdate() {
    var t2;
    this._preUpdated = E && this._animated && (!this.respectMotionPreference || !((t2 = S) != null && t2.matches)) && this.ownerDocument.visibilityState === "visible", this._preUpdated && (this._pre.willUpdate(), this._num.willUpdate(), this._post.willUpdate());
  }
  /**
   * @internal
   */
  didUpdate() {
    if (!this.computedAnimated || !this._preUpdated)
      return;
    this._abortAnimationsFinish ? this._abortAnimationsFinish.abort() : this.dispatchEvent(new Event("animationsstart")), this._pre.didUpdate(), this._num.didUpdate(), this._post.didUpdate();
    const t2 = new AbortController();
    Promise.all(this.shadowRoot.getAnimations().map((e) => e.finished)).then(() => {
      t2.signal.aborted || (this.dispatchEvent(new Event("animationsfinish")), this._abortAnimationsFinish = void 0);
    }), this._abortAnimationsFinish = t2;
  }
};
B.defaultProps = {
  transformTiming: {
    duration: 900,
    // Make sure to keep this minified:
    easing: "linear(0,.005,.019,.039,.066,.096,.129,.165,.202,.24,.278,.316,.354,.39,.426,.461,.494,.526,.557,.586,.614,.64,.665,.689,.711,.731,.751,.769,.786,.802,.817,.831,.844,.856,.867,.877,.887,.896,.904,.912,.919,.925,.931,.937,.942,.947,.951,.955,.959,.962,.965,.968,.971,.973,.976,.978,.98,.981,.983,.984,.986,.987,.988,.989,.99,.991,.992,.992,.993,.994,.994,.995,.995,.996,.996,.9963,.9967,.9969,.9972,.9975,.9977,.9979,.9981,.9982,.9984,.9985,.9987,.9988,.9989,1)"
  },
  spinTiming: void 0,
  opacityTiming: { duration: 450, easing: "ease-out" },
  animated: true,
  trend: (n2, t2) => Math.sign(t2 - n2),
  respectMotionPreference: true,
  plugins: void 0,
  digits: void 0
};
var F = class {
  constructor(t2, e, i2, { className: s2, ...o } = {}) {
    this.flow = t2, this._integer = new A(t2, e, {
      justify: "right",
      part: "integer"
    }), this._fraction = new A(t2, i2, {
      justify: "left",
      part: "fraction"
    }), this._inner = f("span", {
      className: "number__inner"
    }, [this._integer.el, this._fraction.el]), this.el = f("span", {
      ...o,
      part: "number",
      className: `number ${s2 ?? ""}`
    }, [this._inner]);
  }
  willUpdate() {
    this._prevWidth = this.el.offsetWidth, this._prevLeft = this.el.getBoundingClientRect().left, this._integer.willUpdate(), this._fraction.willUpdate();
  }
  update({ integer: t2, fraction: e }) {
    this._integer.update(t2), this._fraction.update(e);
  }
  didUpdate() {
    const t2 = this.el.getBoundingClientRect();
    this._integer.didUpdate(), this._fraction.didUpdate();
    const e = this._prevLeft - t2.left, i2 = this.el.offsetWidth, s2 = this._prevWidth - i2;
    this.el.style.setProperty("--width", String(i2)), this.el.animate({
      [c]: [`${e}px`, "0px"],
      [g]: [s2, 0]
    }, {
      ...this.flow.transformTiming,
      composite: "accumulate"
    });
  }
};
var R = class {
  constructor(t2, e, { justify: i2, className: s2, ...o }, a) {
    this.flow = t2, this.children = /* @__PURE__ */ new Map(), this.onCharRemove = (d2) => () => {
      this.children.delete(d2);
    }, this.justify = i2;
    const r3 = e.map((d2) => this.addChar(d2).el);
    this.el = f("span", {
      ...o,
      className: `section section--justify-${i2} ${s2 ?? ""}`
    }, a ? a(r3) : r3);
  }
  addChar(t2, { startDigitsAtZero: e = false, ...i2 } = {}) {
    const s2 = t2.type === "integer" || t2.type === "fraction" ? new C(this, t2.type, e ? 0 : t2.value, t2.pos, {
      ...i2,
      onRemove: this.onCharRemove(t2.key)
    }) : new I(this, t2.type, t2.value, {
      ...i2,
      onRemove: this.onCharRemove(t2.key)
    });
    return this.children.set(t2.key, s2), s2;
  }
  unpop(t2) {
    t2.el.removeAttribute("inert"), t2.el.style.top = "", t2.el.style[this.justify] = "";
  }
  pop(t2) {
    t2.forEach((e) => {
      e.el.style.top = `${e.el.offsetTop}px`, e.el.style[this.justify] = `${D(e.el, this.justify)}px`;
    }), t2.forEach((e) => {
      e.el.setAttribute("inert", ""), e.present = false;
    });
  }
  addNewAndUpdateExisting(t2) {
    const e = /* @__PURE__ */ new Map(), i2 = /* @__PURE__ */ new Map(), s2 = this.justify === "left", o = s2 ? "prepend" : "append";
    if (k2(t2, (a) => {
      let r3;
      this.children.has(a.key) ? (r3 = this.children.get(a.key), i2.set(a, r3), this.unpop(r3), r3.present = true) : (r3 = this.addChar(a, { startDigitsAtZero: true, animateIn: true }), e.set(a, r3)), this.el[o](r3.el);
    }, { reverse: s2 }), this.flow.computedAnimated) {
      const a = this.el.getBoundingClientRect();
      e.forEach((r3) => {
        r3.willUpdate(a);
      });
    }
    e.forEach((a, r3) => {
      a.update(r3.value);
    }), i2.forEach((a, r3) => {
      a.update(r3.value);
    });
  }
  willUpdate() {
    const t2 = this.el.getBoundingClientRect();
    this._prevOffset = t2[this.justify], this.children.forEach((e) => e.willUpdate(t2));
  }
  didUpdate() {
    const t2 = this.el.getBoundingClientRect();
    this.children.forEach((s2) => s2.didUpdate(t2));
    const e = t2[this.justify], i2 = this._prevOffset - e;
    i2 && this.children.size && this.el.animate({
      transform: [`translateX(${i2}px)`, "none"]
    }, {
      ...this.flow.transformTiming,
      composite: "accumulate"
    });
  }
};
var A = class extends R {
  update(t2) {
    const e = /* @__PURE__ */ new Map();
    this.children.forEach((i2, s2) => {
      t2.find((o) => o.key === s2) || e.set(s2, i2), this.unpop(i2);
    }), this.addNewAndUpdateExisting(t2), e.forEach((i2) => {
      i2 instanceof C && i2.update(0);
    }), this.pop(e);
  }
};
var U = class extends R {
  update(t2) {
    const e = /* @__PURE__ */ new Map();
    this.children.forEach((i2, s2) => {
      t2.find((o) => o.key === s2) || e.set(s2, i2);
    }), this.pop(e), this.addNewAndUpdateExisting(t2);
  }
};
var y2 = class {
  constructor(t2, e, { onRemove: i2, animateIn: s2 = false } = {}) {
    this.flow = t2, this.el = e, this._present = true, this._remove = () => {
      var o;
      this.el.remove(), (o = this._onRemove) == null || o.call(this);
    }, this.el.classList.add("animate-presence"), this.flow.computedAnimated && s2 && this.el.animate({
      [d]: [-0.9999, 0]
    }, {
      ...this.flow.opacityTiming,
      composite: "accumulate"
    }), this._onRemove = i2;
  }
  get present() {
    return this._present;
  }
  set present(t2) {
    if (this._present !== t2) {
      if (this._present = t2, t2 ? this.el.removeAttribute("inert") : this.el.setAttribute("inert", ""), !this.flow.computedAnimated) {
        t2 || this._remove();
        return;
      }
      this.el.style.setProperty("--_number-flow-d-opacity", t2 ? "0" : "-.999"), this.el.animate({
        [d]: t2 ? [-0.9999, 0] : [0.999, 0]
      }, {
        ...this.flow.opacityTiming,
        composite: "accumulate"
      }), t2 ? this.flow.removeEventListener("animationsfinish", this._remove) : this.flow.addEventListener("animationsfinish", this._remove, {
        once: true
      });
    }
  }
};
var x2 = class extends y2 {
  constructor(t2, e, i2, s2) {
    super(t2.flow, i2, s2), this.section = t2, this.value = e, this.el = i2;
  }
};
var C = class extends x2 {
  constructor(t2, e, i2, s2, o) {
    var c2, p2;
    const a = (((p2 = (c2 = t2.flow.digits) == null ? void 0 : c2[s2]) == null ? void 0 : p2.max) ?? 9) + 1, r3 = Array.from({ length: a }).map((u2, m2) => {
      const g2 = f("span", { className: "digit__num" }, [
        document.createTextNode(String(m2))
      ]);
      return m2 !== i2 && g2.setAttribute("inert", ""), g2.style.setProperty("--n", String(m2)), g2;
    }), d2 = f("span", {
      part: `digit ${e}-digit`,
      className: "digit"
    }, r3);
    d2.style.setProperty("--current", String(i2)), d2.style.setProperty("--length", String(a)), super(t2, i2, d2, o), this.pos = s2, this._onAnimationsFinish = () => {
      this.el.classList.remove("is-spinning");
    }, this._numbers = r3, this.length = a;
  }
  willUpdate(t2) {
    const e = this.el.getBoundingClientRect();
    this._prevValue = this.value;
    const i2 = e[this.section.justify] - t2[this.section.justify], s2 = e.width / 2;
    this._prevCenter = this.section.justify === "left" ? i2 + s2 : i2 - s2;
  }
  update(t2) {
    this.el.style.setProperty("--current", String(t2)), this._numbers.forEach((e, i2) => i2 === t2 ? e.removeAttribute("inert") : e.setAttribute("inert", "")), this.value = t2;
  }
  didUpdate(t2) {
    const e = this.el.getBoundingClientRect(), i2 = e[this.section.justify] - t2[this.section.justify], s2 = e.width / 2, o = this.section.justify === "left" ? i2 + s2 : i2 - s2, a = this._prevCenter - o;
    a && this.el.animate({
      transform: [`translateX(${a}px)`, "none"]
    }, {
      ...this.flow.transformTiming,
      composite: "accumulate"
    });
    const r3 = this.getDelta();
    r3 && (this.el.classList.add("is-spinning"), this.el.animate({
      [u]: [-r3, 0]
    }, {
      ...this.flow.spinTiming ?? this.flow.transformTiming,
      composite: "accumulate"
    }), this.flow.addEventListener("animationsfinish", this._onAnimationsFinish, { once: true }));
  }
  getDelta() {
    var i2;
    if (this.flow.plugins)
      for (const s2 of this.flow.plugins) {
        const o = (i2 = s2.getDelta) == null ? void 0 : i2.call(s2, this.value, this._prevValue, this);
        if (o != null)
          return o;
      }
    const t2 = this.value - this._prevValue, e = this.flow.computedTrend || Math.sign(t2);
    return e < 0 && this.value > this._prevValue ? this.value - this.length - this._prevValue : e > 0 && this.value < this._prevValue ? this.length - this._prevValue + this.value : t2;
  }
};
var I = class extends x2 {
  constructor(t2, e, i2, s2) {
    const o = f("span", {
      className: "symbol__value",
      textContent: i2
    });
    super(t2, i2, f("span", {
      part: `symbol ${e}`,
      className: "symbol"
    }, [o]), s2), this.type = e, this._children = /* @__PURE__ */ new Map(), this._onChildRemove = (a) => () => {
      this._children.delete(a);
    }, this._children.set(i2, new y2(this.flow, o, {
      onRemove: this._onChildRemove(i2)
    }));
  }
  willUpdate(t2) {
    if (this.type === "decimal")
      return;
    const e = this.el.getBoundingClientRect();
    this._prevOffset = e[this.section.justify] - t2[this.section.justify];
  }
  update(t2) {
    if (this.value !== t2) {
      const e = this._children.get(this.value);
      e && (e.present = false);
      const i2 = this._children.get(t2);
      if (i2)
        i2.present = true;
      else {
        const s2 = f("span", {
          className: "symbol__value",
          textContent: t2
        });
        this.el.appendChild(s2), this._children.set(t2, new y2(this.flow, s2, {
          animateIn: true,
          onRemove: this._onChildRemove(t2)
        }));
      }
    }
    this.value = t2;
  }
  didUpdate(t2) {
    if (this.type === "decimal")
      return;
    const i2 = this.el.getBoundingClientRect()[this.section.justify] - t2[this.section.justify], s2 = this._prevOffset - i2;
    s2 && this.el.animate({
      transform: [`translateX(${s2}px)`, "none"]
    }, { ...this.flow.transformTiming, composite: "accumulate" });
  }
};

// node_modules/number-flow/dist/csp.mjs
var r2 = (s2) => [y, $(s2), x];

// node_modules/@number-flow/react/dist/NumberFlow-client-BGPmzcXX.mjs
var React = __toESM(require("react"), 1);
var REACT_MAJOR = parseInt(React.version.match(/^(\d+)\./)?.[1]);
var isReact19 = REACT_MAJOR >= 19;
var OBSERVED_ATTRIBUTES = [
  "data",
  "digits"
];
var NumberFlowElement = class extends B {
  attributeChangedCallback(attr, _oldValue, newValue) {
    this[attr] = JSON.parse(newValue);
  }
};
NumberFlowElement.observedAttributes = isReact19 ? [] : OBSERVED_ATTRIBUTES;
X("number-flow-react", NumberFlowElement);
var formatters = {};
function identity(v2) {
  return v2;
}
var serialize = isReact19 ? identity : JSON.stringify;
function splitProps(props) {
  const { transformTiming, spinTiming, opacityTiming, animated, respectMotionPreference, trend, plugins, ...rest } = props;
  return [
    {
      transformTiming,
      spinTiming,
      opacityTiming,
      animated,
      respectMotionPreference,
      trend,
      plugins
    },
    rest
  ];
}
var NumberFlowImpl = class extends React.Component {
  // Update the non-`data` props to avoid JSON serialization
  // Data needs to be set in render still:
  updateProperties(prevProps) {
    if (!this.el) return;
    this.el.batched = !this.props.isolate;
    const [nonData] = splitProps(this.props);
    Object.entries(nonData).forEach(([k3, v2]) => {
      this.el[k3] = v2 ?? NumberFlowElement.defaultProps[k3];
    });
    if (prevProps?.onAnimationsStart) this.el.removeEventListener("animationsstart", prevProps.onAnimationsStart);
    if (this.props.onAnimationsStart) this.el.addEventListener("animationsstart", this.props.onAnimationsStart);
    if (prevProps?.onAnimationsFinish) this.el.removeEventListener("animationsfinish", prevProps.onAnimationsFinish);
    if (this.props.onAnimationsFinish) this.el.addEventListener("animationsfinish", this.props.onAnimationsFinish);
  }
  componentDidMount() {
    this.updateProperties();
    if (isReact19 && this.el) {
      this.el.digits = this.props.digits;
      this.el.data = this.props.data;
    }
  }
  getSnapshotBeforeUpdate(prevProps) {
    this.updateProperties(prevProps);
    if (prevProps.data !== this.props.data) {
      if (this.props.group) {
        this.props.group.willUpdate();
        return () => this.props.group?.didUpdate();
      }
      if (!this.props.isolate) {
        this.el?.willUpdate();
        return () => this.el?.didUpdate();
      }
    }
    return null;
  }
  componentDidUpdate(_2, __, didUpdate) {
    didUpdate?.();
  }
  handleRef(el) {
    if (this.props.innerRef) this.props.innerRef.current = el;
    this.el = el;
  }
  render() {
    const [_2, { innerRef, className, data, nonce, willChange, isolate, group, digits, onAnimationsStart, onAnimationsFinish, ...rest }] = splitProps(this.props);
    return (
      // @ts-expect-error missing types
      /* @__PURE__ */ React.createElement("number-flow-react", {
        ref: this.handleRef,
        "data-will-change": willChange ? "" : void 0,
        // Have to rename this:
        class: className,
        nonce,
        ...rest,
        dangerouslySetInnerHTML: {
          __html: true_default ? "" : V(data, {
            nonce,
            elementSuffix: "-react"
          })
        },
        suppressHydrationWarning: true,
        digits: serialize(digits),
        // Make sure data is set last, everything else is updated:
        data: serialize(data)
      })
    );
  }
  constructor(props) {
    super(props);
    this.handleRef = this.handleRef.bind(this);
  }
};
var NumberFlow = /* @__PURE__ */ React.forwardRef(function NumberFlow2({ value, locales, format, prefix, suffix, ...props }, _ref) {
  React.useImperativeHandle(_ref, () => ref.current, []);
  const ref = React.useRef(void 0);
  const group = React.useContext(NumberFlowGroupContext);
  group?.useRegister(ref);
  const localesString = React.useMemo(() => locales ? JSON.stringify(locales) : "", [
    locales
  ]);
  const formatString = React.useMemo(() => format ? JSON.stringify(format) : "", [
    format
  ]);
  const data = React.useMemo(() => {
    const formatter = formatters[`${localesString}:${formatString}`] ??= new Intl.NumberFormat(locales, format);
    return z(value, formatter, prefix, suffix);
  }, [
    value,
    localesString,
    formatString,
    prefix,
    suffix
  ]);
  return /* @__PURE__ */ React.createElement(NumberFlowImpl, {
    ...props,
    group,
    data,
    innerRef: ref
  });
});
var NumberFlowGroupContext = /* @__PURE__ */ React.createContext(void 0);

// node_modules/@number-flow/react/dist/index.mjs
var styles = r2("-react");

// client/src/rolling.tsx
function Rolling({
  value,
  placeholder = "\u2026",
  prefix,
  suffix,
  fractionDigits,
  locales = "en-US",
  className,
  onAnimationsFinish
}) {
  const format = (0, import_react.useMemo)(
    () => fractionDigits == null ? {} : { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits },
    [fractionDigits]
  );
  if (value === null) return (0, import_react.createElement)("span", { className }, placeholder);
  return (0, import_react.createElement)(NumberFlow, {
    className,
    value,
    locales,
    format,
    prefix,
    suffix,
    onAnimationsFinish
  });
}

// client/src/rpc.ts
async function rpc(endpoint, args) {
  let response;
  try {
    response = await fetch(`/billing/${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "client-request",
        rpcId: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `billing-${Date.now()}-${Math.random()}`,
        method: endpoint,
        payload: args === void 0 ? {} : { args }
      })
    });
  } catch (error) {
    throw new Error(`billing/${endpoint} \u7F51\u7EDC\u9519\u8BEF\uFF1A${error instanceof Error ? error.message : String(error)}`);
  }
  const body = await response.json().catch(() => ({}));
  if (body.result?.ok) return body.result.value;
  throw new Error(body.result?.error?.message ?? `billing/${endpoint} HTTP ${response.status}`);
}

// client/src/format.ts
function costFractionDigits(cost) {
  if (!Number.isFinite(cost) || cost <= 0) return 2;
  if (cost < 0.01) return 4;
  if (cost < 1) return 3;
  return 2;
}
function fmtCost(cost) {
  if (!Number.isFinite(cost) || cost <= 0) return "0.00";
  return cost.toFixed(costFractionDigits(cost));
}
function toNumber(raw) {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") {
    const n2 = Number.parseFloat(raw.replace(/,/g, ""));
    return Number.isFinite(n2) ? n2 : null;
  }
  return null;
}

// client/src/tide.ts
var DEFAULT_TZ_OFFSET_MINUTES = 480;
var DEFAULT_WINDOWS = [[9, 12], [14, 18]];
var DAY_MS = 24 * 3600 * 1e3;
var FALLBACK_HOLIDAYS = [
  // 中秋 2026-09-25 ~ 09-27
  "2026-09-25",
  "2026-09-26",
  "2026-09-27",
  // 国庆 2026-10-01 ~ 10-07
  "2026-10-01",
  "2026-10-02",
  "2026-10-03",
  "2026-10-04",
  "2026-10-05",
  "2026-10-06",
  "2026-10-07"
];
function zonedParts(date, rules) {
  const offset = rules?.timezoneOffsetMinutes ?? DEFAULT_TZ_OFFSET_MINUTES;
  const zoned = new Date(date.getTime() + offset * 60 * 1e3);
  const month = String(zoned.getUTCMonth() + 1).padStart(2, "0");
  const day = String(zoned.getUTCDate()).padStart(2, "0");
  return {
    weekday: zoned.getUTCDay(),
    minutes: zoned.getUTCHours() * 60 + zoned.getUTCMinutes(),
    dateKey: `${zoned.getUTCFullYear()}-${month}-${day}`
  };
}
function rulesOf(rules) {
  return {
    windows: rules?.windowsHours?.length ? rules.windowsHours : DEFAULT_WINDOWS,
    weekendOffPeak: rules?.weekendOffPeak ?? true,
    holidayOffPeak: rules?.holidayOffPeak ?? true,
    holidays: rules?.holidays ?? FALLBACK_HOLIDAYS
  };
}
function isPeakAt(date, rules) {
  const { windows, weekendOffPeak, holidayOffPeak, holidays } = rulesOf(rules);
  const { weekday, minutes, dateKey } = zonedParts(date, rules);
  if (weekendOffPeak && (weekday === 0 || weekday === 6)) return false;
  if (holidayOffPeak && holidays.includes(dateKey)) return false;
  return windows.some(([start, end]) => minutes >= start * 60 && minutes < end * 60);
}
function nextChangeHours(date, rules) {
  const start = date.getTime();
  const current = isPeakAt(date, rules);
  const limit = start + 3 * DAY_MS;
  for (let t2 = start + 60 * 1e3; t2 < limit; t2 += 60 * 1e3) {
    if (isPeakAt(new Date(t2), rules) !== current) return (t2 - start) / 36e5;
  }
  return 72;
}
function computeTide(date, rules) {
  return { isPeak: isPeakAt(date, rules), nextChangeHours: nextChangeHours(date, rules) };
}
function fmtRemain(hours) {
  if (hours < 1) {
    const m2 = Math.max(1, Math.round(hours * 60));
    return `${m2} \u5206\u949F`;
  }
  const r3 = Math.round(hours * 10) / 10;
  return `${Number.isInteger(r3) ? r3 : r3.toFixed(1)} \u5C0F\u65F6`;
}

// client/src/pills.css
var pills_default = "/* dsh-billing \u80F6\u56CA\u4E0E\u60AC\u505C\u6D6E\u5C42\u6837\u5F0F\u3002\n   \u989C\u8272\u53D6\u81EA DSH design token\uFF08packages/client/ui-theme/src/styles/design-platform.css\uFF09\uFF1A\n   - \u80F6\u56CA\u672C\u4F53\u968F\u4E3B\u9898\uFF1A--dsw-alias-*\n   - \u6D6E\u5C42\u6052\u4E3A\u6697\u5E95\uFF08\u6CBF\u7528 DSH tooltip \u8BED\u8A00\uFF09\uFF1A--dsw-alias-tooltip-bg + --dsw-static-*\n   \u52A8\u6548\u53D6\u81EA transitions.dev \u7684 motion token \u4E0E 17-tooltip \u914D\u65B9 \u2014\u2014 **\u4EC5\u7528\u4E8E\u6D6E\u5C42**\u3002\n   \u6570\u5B57\u52A8\u6548\u662F NumberFlow \u7684\u65E2\u6709\u5B9E\u73B0\uFF08\u9010\u4F4D\u6EDA\u52A8 + \u91D1\u989D\u5148\u6EDA\u3001tokens \u968F\u540E\uFF09\uFF0C\u4E00\u5F8B\u4E0D\u78B0\u3002 */\n\n/* \u2500\u2500 \u52A8\u6548 token\uFF08transitions.dev \u7684 motion scale\uFF0C\u7EDF\u4E00\u52A0 --dsb- \u524D\u7F00\u907F\u514D\u4E0E\u5BBF\u4E3B\u51B2\u7A81\uFF09\u2500\u2500 */\n:root {\n  --dsb-duration-quick: 150ms;\n  --dsb-ease-out: ease-out;\n  --dsb-ease-smooth-out: cubic-bezier(0.22, 1, 0.36, 1);\n  /* 17-tooltip\uFF1A\u8FDB\u6709\u5EF6\u8FDF + fade/scale\uFF0C\u51FA\u7ACB\u5373 */\n  --dsb-tt-in-dur: 150ms;\n  --dsb-tt-out-dur: 50ms;\n  --dsb-tt-delay: 80ms;\n  --dsb-tt-scale: 0.98;\n}\n\n.billing-pills { display: inline-flex; align-items: center; gap: 2px; }\n.billing-pill {\n  /* \u6D6E\u5C42\u7684\u5B9A\u4F4D\u57FA\u51C6\uFF08\u540C\u65F6\u4E5F\u662F\u5B83\u7684 hover \u76EE\u6807\uFF0C\u89C1\u4E0B\uFF09 */\n  position: relative;\n  display: inline-flex; align-items: center; gap: 3px;\n  min-height: 28px; padding: 3px 8px; border: 0; border-radius: 6px;\n  background: transparent; color: var(--dsw-alias-label-secondary);\n  font-size: 12px; line-height: 18px; white-space: nowrap; cursor: pointer;\n  transition: background var(--dsb-duration-quick) var(--dsb-ease-out),\n              color var(--dsb-duration-quick) var(--dsb-ease-out);\n}\n.billing-pill:hover,\n.billing-pill:focus-visible { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }\n.billing-pill:focus-visible { outline: 2px solid var(--dsw-alias-label-caption); outline-offset: 1px; }\n.billing-num {\n  font-weight: 600; font-variant-numeric: tabular-nums;\n  transition: opacity var(--dsb-duration-quick) var(--dsb-ease-out);\n}\n/* \u8BF7\u6C42\u8FDB\u884C\u4E2D\uFF1A\u6570\u5B57\u533A\u964D\u900F\u660E\u5EA6\uFF08\u300C\u6B63\u5728\u53D6\u6570\u300D\uFF09 */\n.billing-pill.is-refreshing .billing-num { opacity: 0.4; }\n\n/* \u72B6\u6001\u8272 = \u5B98\u65B9 state token\uFF08\u968F\u660E\u6697\u4E3B\u9898\u81EA\u52A8\u5207\u6362\uFF09 */\n.billing-ok { color: var(--dsw-alias-state-success-primary); }\n.billing-warn { color: var(--dsw-alias-state-warn-label); }\n/* \u4F4E\u4F59\u989D\uFF1A\u4F4E\u4E8E LOW_BALANCE_CNY\uFF08\u89C1 index.tsx\uFF09\u65F6\u6807\u7EA2 */\n.billing-low { color: var(--dsw-alias-state-error-primary); }\n\n/* NumberFlow \u6E32\u67D3\u4E3A <number-flow-react> \u81EA\u5B9A\u4E49\u5143\u7D20\uFF0C\u5185\u90E8\u662F open shadow DOM\uFF1A\n   CSS \u81EA\u5B9A\u4E49\u5C5E\u6027\u4E0E\u53EF\u7EE7\u627F\u5C5E\u6027\uFF08color / font-*\uFF09\u90FD\u80FD\u7A7F\u900F\uFF0C\u4F46 shadow \u5185 :host \u8BBE\u4E86\n   line-height:1 \u2014\u2014 light DOM \u89C4\u5219\u4F18\u5148\u7EA7\u66F4\u9AD8\uFF0C\u8FD9\u91CC\u628A\u884C\u9AD8\u62C9\u56DE\u80F6\u56CA\u7684 18px\u3002 */\n.billing-num number-flow-react { line-height: inherit; }\n\n/* \u91D1\u989D\u69FD\uFF1A\u56FA\u5B9A\u6700\u5C0F\u5BBD\u5EA6 + \u53F3\u5BF9\u9F50\u3002\u4F4D\u6570\u5207\u6362\uFF08\xA50.0234 \u2194 \xA50.023\uFF09\u65F6\u53EA\u5728\u69FD\u5185\u6536\u7F29\uFF0C\n   \u4E0D\u63A8\u52A8\u53F3\u4FA7 tokens\u30027.2ch \u8986\u76D6 \xA50.0000 \u4E0E \xA5123.45 \u4E24\u79CD\u6700\u957F\u5F62\u6001\u3002 */\n.billing-money-slot { display: inline-flex; justify-content: flex-end; min-width: 7.2ch; }\n/* tokens \u69FD\uFF1A\u53F3\u5BF9\u9F50\uFF1Btokens \u5355\u8C03\u589E\u957F\uFF0C\u65E0\u9700\u515C\u5E95\u5BBD\u5EA6\u3002 */\n.billing-tokens-slot { display: inline-flex; justify-content: flex-end; }\n.billing-amount { display: inline-flex; align-items: baseline; }\n\n/* \u2500\u2500 \u60AC\u505C\u6D6E\u5C42\uFF08transitions.dev 17-tooltip \u914D\u65B9\uFF09\u2500\u2500\n   \u7EAF CSS \u9A71\u52A8\uFF0C\u6CA1\u6709 JS \u5B9A\u65F6\u5668\uFF1A\n   \xB7 \u8FDB\u573A\u5EF6\u8FDF\u4E0E\u65F6\u957F\u53EA\u5199\u5728 hover/focus \u89C4\u5219\u91CC \u2014\u2014 \u79BB\u5F00\u65F6\u5EF6\u8FDF\u5F52\u96F6\uFF0C\u6D88\u5931\u7ACB\u5373\u64AD\u653E\uFF0C\u4E0D\u7C98\u624B\uFF1B\n   \xB7 .billing-pop \u662F\u300C\u8FC7\u6E21 + \u6865\u63A5\u300D\u7684\u8F7D\u4F53\uFF1Apadding-top \u6491\u51FA\u7684 8px \u65E2\u662F\u89C6\u89C9\u95F4\u9699\uFF0C\n     \u4E5F\u4ECD\u662F hover \u533A\u57DF\uFF0C\u6307\u9488\u4ECE\u80F6\u56CA\u79FB\u5411\u6D6E\u5C42\u4E0D\u4F1A\u7ECF\u8FC7\u975E hover \u533A\u800C\u95EA\u65AD\uFF1B\n   \xB7 \u770B\u5F97\u89C1\u7684\u5361\u7247\u662F\u5185\u5C42 .billing-pop-card\u3002 */\n.billing-pop {\n  position: absolute; top: 100%; left: -8px; z-index: 40;\n  display: block; padding-top: 8px;\n  opacity: 0; pointer-events: none;\n  transform: scale(var(--dsb-tt-scale));\n  transform-origin: 50% 0;\n  transition: opacity var(--dsb-tt-out-dur) var(--dsb-ease-out),\n              transform var(--dsb-tt-out-dur) var(--dsb-ease-out);\n}\n/* \u6700\u53F3\u90A3\u9897\u80F6\u56CA\uFF08\u5CF0\u8C37\uFF09\u6539\u4E3A\u53F3\u5BF9\u9F50\uFF0C\u907F\u514D\u6D6E\u5C42\u6EA2\u51FA\u89C6\u53E3\u53F3\u7F18\u3002 */\n.billing-pill:last-child .billing-pop { left: auto; right: -8px; }\n\n.billing-pill:hover .billing-pop,\n.billing-pill:focus-visible .billing-pop {\n  opacity: 1; pointer-events: auto;\n  transform: scale(1);\n  transition-duration: var(--dsb-tt-in-dur);\n  transition-delay: var(--dsb-tt-delay);\n}\n\n.billing-pop-card {\n  display: block; width: 322px; padding: 12px 14px 11px;\n  background: var(--dsw-alias-tooltip-bg);\n  border-radius: 8px;\n  /* \u8F7B\u9634\u5F71\uFF1A\u771F\u5B9E\u9875\u9762\u91CC\u6D6E\u5C42\u4F1A\u538B\u5728\u6D88\u606F\u6D41\u4E0A\uFF0C\u6697\u5E95\u4E0E\u6DF1\u8272\u5185\u5BB9\u76F8\u90BB\u65F6\u9700\u8981\u4E00\u5C42\u5206\u79BB */\n  box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.35);\n  font-size: 12px; line-height: 1.55; font-weight: 400;\n  text-align: left; white-space: normal;\n}\n\n.billing-pop-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }\n.billing-pop-label { color: var(--dsw-static-neutral-bluish-500); font-size: 11px; }\n.billing-pop-amt {\n  font-size: 18px; font-weight: 600; letter-spacing: -0.015em;\n  color: var(--dsw-static-neutral-bluish-50); font-variant-numeric: tabular-nums;\n}\n.billing-pop-tk { margin-left: 7px; font-size: 11px; color: var(--dsw-static-neutral-bluish-500); font-variant-numeric: tabular-nums; }\n.billing-pop-bad { font-size: 11px; color: var(--dsw-static-amber-400); }\n.billing-pop-warn { color: var(--dsw-static-amber-400); }\n.billing-pop-hit { color: var(--dsw-static-green-400); }\n\n/* \u5360\u6BD4\uFF1A3px \u5806\u53E0\u6761\uFF0C\u65E0\u5706\u89D2\u65E0\u5BB9\u5668\uFF1B\u5355\u6A21\u578B\u65F6\u4E0D\u6E32\u67D3 */\n.billing-pop-share-wrap { display: block; margin-top: 11px; }\n.billing-pop-share { display: flex; height: 3px; gap: 2px; margin-bottom: 7px; }\n.billing-seg { display: block; height: 100%; }\n.billing-seg-0 { background: var(--dsw-static-deepseek-450); }\n.billing-seg-1 { background: rgba(255, 255, 255, 0.3); }\n.billing-seg-2 { background: rgba(255, 255, 255, 0.46); }\n.billing-seg-3 { background: rgba(255, 255, 255, 0.62); }\n.billing-pop-lg {\n  display: flex; flex-wrap: wrap; gap: 5px 14px;\n  font-size: 11px; color: var(--dsw-static-neutral-bluish-500); font-variant-numeric: tabular-nums;\n}\n.billing-pop-lg > span { display: inline-flex; align-items: baseline; gap: 5px; }\n.billing-dot { display: inline-block; width: 6px; height: 6px; border-radius: 1px; }\n\n.billing-pop-rule { display: block; height: 1px; background: rgba(255, 255, 255, 0.13); margin: 11px 0; }\n\n.billing-pop-model { display: block; }\n.billing-pop-mrow { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }\n.billing-pop-mname {\n  color: var(--dsw-static-neutral-bluish-50);\n  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;\n}\n.billing-pop-mamt { font-weight: 600; color: var(--dsw-static-neutral-bluish-50); font-variant-numeric: tabular-nums; }\n.billing-pop-msub {\n  display: block; margin: 2px 0 9px;\n  font-size: 11px; color: var(--dsw-static-neutral-bluish-500); font-variant-numeric: tabular-nums;\n}\n.billing-pop-model:last-of-type .billing-pop-msub { margin-bottom: 0; }\n\n/* \u7F13\u5B58\u8282\u7701\uFF08\u63A8\u7B97\u503C\uFF09\uFF1A\u5BBF\u4E3B\u7B97\u597D\u4E0B\u53D1\u2014\u2014\u5BA2\u6237\u7AEF\u6CA1\u6709\u5355\u4EF7\uFF0C\u7B97\u4E0D\u51FA\u6765 */\n.billing-pop-save { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }\n.billing-pop-save-lbl { font-size: 11px; color: var(--dsw-static-neutral-bluish-300); }\n.billing-pop-save-val { font-weight: 600; color: var(--dsw-static-green-400); font-variant-numeric: tabular-nums; }\n.billing-pop-save-sub { margin-left: 8px; font-size: 11px; color: var(--dsw-static-neutral-bluish-500); font-variant-numeric: tabular-nums; }\n\n.billing-pop-foot {\n  display: flex; align-items: baseline; justify-content: space-between; gap: 10px;\n  margin-top: 10px; font-size: 11px; color: var(--dsw-static-neutral-bluish-500);\n}\n.billing-pop-source { display: block; margin-top: 3px; font-size: 11px; color: var(--dsw-static-neutral-bluish-600); }\n.billing-pop-note { display: block; font-size: 11px; color: var(--dsw-static-neutral-bluish-400); }\n\n/* \u4F59\u989D\u6D6E\u5C42 */\n.billing-pop-bal { display: block; margin-top: 9px; }\n.billing-pop-bal-head {\n  display: flex; align-items: baseline; justify-content: space-between; gap: 12px;\n  color: var(--dsw-static-neutral-bluish-300);\n}\n.billing-pop-bal-total { font-weight: 600; color: var(--dsw-static-neutral-bluish-50); font-variant-numeric: tabular-nums; }\n.billing-pop-bal-sub { display: block; font-size: 11px; color: var(--dsw-static-neutral-bluish-500); font-variant-numeric: tabular-nums; }\n\n/* \u5CF0\u8C37\u6D6E\u5C42 */\n.billing-pop-tide-line { display: block; margin-top: 9px; color: var(--dsw-static-neutral-bluish-300); }\n.billing-pop-tide-rule { display: block; font-size: 11px; line-height: 1.6; color: var(--dsw-static-neutral-bluish-400); }\n\n/* \u2500\u2500 \u70B9\u51FB\u5237\u65B0\u7684\u53CD\u9988 \u2500\u2500\n   \u503C\u53D8\u4E86\u65F6 NumberFlow \u4F1A\u9010\u4F4D\u6EDA\u52A8\uFF0C\u672C\u8EAB\u5C31\u662F\u53CD\u9988\uFF1B\u503C\u6CA1\u53D8\u65F6\u5C4F\u5E55\u9759\u6B62\uFF0C\u6240\u4EE5\u8865\u4E00\u4E2A\u300C\u52A0\u8F7D\u6001\u300D\uFF1A\n   \u8BF7\u6C42\u671F\u95F4\u6570\u5B57\u533A\u964D\u900F\u660E\u5EA6\uFF08\u89C1\u4E0A\u65B9 .billing-pill.is-refreshing\uFF09\u3002\n   \u523B\u610F**\u4E0D**\u505A\u300C\u5237\u65B0\u540E pop \u4E00\u4E0B\u300D\u2014\u2014 \u90A3\u9700\u8981\u8BA9\u6570\u5B57\u5B50\u6811\u91CD\u6302\u8F7D\u624D\u80FD\u91CD\u64AD\u52A8\u753B\uFF0C\n   \u800C\u91CD\u6302\u8F7D\u4F1A\u6253\u65AD NumberFlow\u300C\u91D1\u989D\u5148\u6EDA\u3001tokens \u968F\u540E\u300D\u7684\u94FE\u6761\u65F6\u5E8F\u3002\u6570\u5B57\u52A8\u6548\u4FDD\u6301\u539F\u6837\u662F\u786C\u7EA6\u675F\u3002 */\n\n@media (prefers-reduced-motion: reduce) {\n  .billing-pill,\n  .billing-num,\n  .billing-pop { transition: none; }\n  /* \u52A8\u6548\u5173\u6389\u540E\uFF0C\u6D6E\u5C42\u4ECD\u987B\u80FD\u663E\u793A \u2014\u2014 \u53EA\u662F\u4E0D\u518D\u6709\u8FC7\u6E21 */\n  .billing-pill:hover .billing-pop,\n  .billing-pill:focus-visible .billing-pop { opacity: 1; pointer-events: auto; transform: scale(1); }\n}\n";

// client/src/index.tsx
var BILLING_CSS_ID = "dsh-billing-pills";
var TOKENS_FALLBACK_MS = 800;
var LOW_BALANCE_CNY = 5;
var REFRESH_DIM_MIN_MS = 220;
if (typeof document !== "undefined") {
  let tag = document.querySelector(`style[data-plugin-css="${BILLING_CSS_ID}"]`);
  if (!tag) {
    tag = document.createElement("style");
    tag.setAttribute("data-plugin", "dsh-billing");
    tag.setAttribute("data-plugin-css", BILLING_CSS_ID);
    document.head.appendChild(tag);
  }
  tag.textContent = pills_default;
}
function SessionAmount({
  costData,
  costFailed,
  sessionId
}) {
  const hasData = costData != null;
  const currentTokens = hasData && !costFailed ? costData.totalTokens : 0;
  const [tokensShown, setTokensShown] = (0, import_react3.useState)(0);
  const pendingTokens = (0, import_react3.useRef)(0);
  const lastSession = (0, import_react3.useRef)(sessionId);
  (0, import_react3.useEffect)(() => {
    if (lastSession.current !== sessionId) {
      lastSession.current = sessionId;
      pendingTokens.current = 0;
      setTokensShown(0);
      return;
    }
    pendingTokens.current = currentTokens;
    const cost2 = hasData ? costData.cost : 0;
    if (costFailed || !hasData || !(cost2 > 0)) {
      setTokensShown(0);
      return;
    }
    const timer = window.setTimeout(() => setTokensShown(pendingTokens.current), TOKENS_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [costData, costFailed, sessionId]);
  const cost = hasData ? costData.cost : 0;
  const amount = costFailed ? null : !hasData || !(cost > 0) ? 0 : cost;
  const digits = amount === null ? 2 : costFractionDigits(amount);
  return /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-amount" }, /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-money-slot" }, /* @__PURE__ */ (0, import_react3.createElement)(
    Rolling,
    {
      value: amount,
      placeholder: "\u2014",
      prefix: "\xA5",
      fractionDigits: digits,
      locales: "zh-CN",
      onAnimationsFinish: () => setTokensShown(pendingTokens.current)
    }
  )), /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-tokens-slot" }, /* @__PURE__ */ (0, import_react3.createElement)(
    Rolling,
    {
      value: costFailed ? null : tokensShown,
      placeholder: "",
      prefix: "(",
      suffix: ")",
      locales: "en-US"
    }
  )));
}
function useTide(sessionId) {
  const [rules, setRules] = (0, import_react3.useState)(null);
  const [now, setNow] = (0, import_react3.useState)(() => Date.now());
  (0, import_react3.useEffect)(() => {
    let alive = true;
    rpc("tide").then((value) => {
      if (!alive || !value) return;
      setRules({
        windowsHours: value.windowsHours,
        weekendOffPeak: value.weekendOffPeak,
        timezoneOffsetMinutes: value.timezoneOffsetMinutes
      });
    }).catch(() => {
    });
    return () => {
      alive = false;
    };
  }, [sessionId]);
  (0, import_react3.useEffect)(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60 * 1e3);
    return () => window.clearInterval(timer);
  }, []);
  return computeTide(new Date(now), rules ?? void 0);
}
function Popover({ body }) {
  return /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop" }, /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-card", role: "tooltip" }, body));
}
function hitRate(m2) {
  const denom = m2.inputTokens + m2.cacheReadTokens;
  if (!Number.isFinite(denom) || denom <= 0) return null;
  return m2.cacheReadTokens / denom * 100;
}
function shortModel(model) {
  const bare = model.includes(":") ? model.slice(model.lastIndexOf(":") + 1) : model;
  const short = bare.replace(/^deepseek-/, "").replace(/^v\d+(?:\.\d+)?-/, "");
  return short.length > 20 ? short.slice(0, 19) + "\u2026" : short;
}
function relTime(ts) {
  const secs = Math.max(0, Math.round((Date.now() - ts) / 1e3));
  if (secs < 10) return "\u521A\u521A";
  if (secs < 60) return `${secs} \u79D2\u524D`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} \u5206\u949F\u524D`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} \u5C0F\u65F6\u524D`;
  return new Date(ts).toLocaleDateString();
}
function ShareBar({ models, total }) {
  const pct = (m2) => total > 0 ? m2.cost / total * 100 : 0;
  return /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-share-wrap" }, /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-share" }, models.map((m2, i2) => /* @__PURE__ */ (0, import_react3.createElement)("i", { key: m2.model + i2, className: `billing-seg billing-seg-${Math.min(i2, 3)}`, style: { width: `${pct(m2)}%` } }))), /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-lg" }, models.map((m2, i2) => /* @__PURE__ */ (0, import_react3.createElement)("span", { key: m2.model + i2 }, /* @__PURE__ */ (0, import_react3.createElement)("i", { className: `billing-dot billing-seg-${Math.min(i2, 3)}` }), shortModel(m2.model), " ", pct(m2).toFixed(1), "%"))));
}
function ModelRow({ m: m2 }) {
  const hit = hitRate(m2);
  return /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-model" }, /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-mrow" }, /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-mname" }, m2.model, m2.priced ? "" : "\uFF08\u672A\u914D\u7F6E\u5355\u4EF7\uFF0C\u6309\u515C\u5E95\u4EF7\u4F30\u7B97\uFF09"), /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-mamt" }, "\xA5", fmtCost(m2.cost))), /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-msub" }, typeof m2.steps === "number" ? `${m2.steps} \u6B21\u8BF7\u6C42` : "\u8BF7\u6C42\u6B21\u6570\u672A\u77E5", hit === null ? null : /* @__PURE__ */ (0, import_react3.createElement)(import_react3.Fragment, null, " \xB7 \u7F13\u5B58\u547D\u4E2D ", /* @__PURE__ */ (0, import_react3.createElement)("b", { className: "billing-pop-hit" }, hit.toFixed(1), "%"))));
}
function CostPopoverBody({ data }) {
  const models = data.models ?? [];
  if (models.length === 0) {
    return /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-note" }, "\u672C\u4F1A\u8BDD\u6682\u65E0\u5DF2\u8BB0\u8D26\u7684\u6A21\u578B\u7528\u91CF\u3002");
  }
  const multi = models.length > 1;
  const total = data.cost;
  const saved = data.cacheSaved ?? 0;
  const subagents = data.subagentSessions ?? 0;
  const failed = data.failedSessions ?? 0;
  const missing = data.missingSessions ?? 0;
  const updated = typeof data.updatedAt === "number" ? relTime(data.updatedAt) : null;
  const source = data.pricingSource === "online" ? `\u5355\u4EF7\u6765\u6E90\uFF1A\u5B98\u65B9\u5728\u7EBF\u540C\u6B65${data.pricingSyncedAt ? `\uFF08${new Date(data.pricingSyncedAt).toLocaleString()}\uFF09` : ""}` : data.pricingSource === "builtin" ? "\u5355\u4EF7\u6765\u6E90\uFF1A\u5185\u7F6E\u9ED8\u8BA4\uFF08\u5728\u7EBF\u540C\u6B65\u4E0D\u53EF\u7528\uFF0C\u82E5\u5B98\u65B9\u6539\u4EF7\u53EF\u80FD\u5931\u51C6\uFF09" : "\u5355\u4EF7\u6765\u6E90\uFF1A\u5F85\u5BBF\u4E3B\u4E0A\u62A5\uFF08\u82E5\u521A\u66F4\u65B0\u8FC7\u63D2\u4EF6\uFF0C\u8BF7\u91CD\u542F dsh web \u540E\u5237\u65B0\u9875\u9762\uFF09";
  return /* @__PURE__ */ (0, import_react3.createElement)(import_react3.Fragment, null, /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-head" }, /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-label" }, multi ? `\u672C\u4F1A\u8BDD\u8D39\u7528 \xB7 ${models.length} \u4E2A\u6A21\u578B` : "\u672C\u4F1A\u8BDD\u8D39\u7528"), /* @__PURE__ */ (0, import_react3.createElement)("span", null, /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-amt" }, "\xA5", fmtCost(total)), /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-tk" }, data.totalTokens.toLocaleString(), " tk"))), multi ? /* @__PURE__ */ (0, import_react3.createElement)(ShareBar, { models, total }) : null, /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-rule" }), models.map((m2, i2) => /* @__PURE__ */ (0, import_react3.createElement)(ModelRow, { key: m2.model + i2, m: m2 })), saved > 0 ? /* @__PURE__ */ (0, import_react3.createElement)(import_react3.Fragment, null, /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-rule" }), /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-save" }, /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-save-lbl" }, "\u7F13\u5B58\u8282\u7701"), /* @__PURE__ */ (0, import_react3.createElement)("span", null, /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-save-val" }, "\xA5", fmtCost(saved)), /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-save-sub" }, "\u672A\u547D\u4E2D\u5219\u9700 \xA5", fmtCost(total + saved))))) : null, /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-foot" }, /* @__PURE__ */ (0, import_react3.createElement)("span", null, subagents > 0 ? `\u542B ${subagents} \u4E2A\u5B50\u4EE3\u7406\u4F1A\u8BDD` : "\u4EC5\u672C\u4F1A\u8BDD", failed > 0 ? ` \xB7 \u26A0\uFE0F ${failed} \u4E2A\u4F1A\u8BDD\u4E8B\u4EF6\u65E5\u5FD7\u8BFB\u53D6\u5931\u8D25` : ""), /* @__PURE__ */ (0, import_react3.createElement)("span", null, updated ? `${updated}\u66F4\u65B0` : "")), /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-source" }, source, missing > 0 ? `\u3000\xB7\u3000\u53E6\u6709 ${missing} \u4E2A\u4F1A\u8BDD\u672A\u80FD\u8BA1\u5165\uFF08fork \u5B50\u4EE3\u7406\u4F1A\u8BDD\u65E0\u6CD5\u56DE\u8BFB\uFF09` : ""));
}
function BalancePopoverBody({ balData, cny, usd }) {
  const row = (label, info, symbol) => /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-bal", key: label }, /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-bal-head" }, /* @__PURE__ */ (0, import_react3.createElement)("span", null, label), /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-bal-total" }, symbol, info.totalBalance)), /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-bal-sub" }, "\u5145\u503C ", symbol, info.toppedUpBalance, " \xB7 \u8D60\u91D1 ", symbol, info.grantedBalance));
  return /* @__PURE__ */ (0, import_react3.createElement)(import_react3.Fragment, null, /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-head" }, /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-label" }, "\u8D26\u6237\u4F59\u989D"), balData?.isAvailable === false ? /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-bad" }, "\u5F53\u524D\u4E0D\u53EF\u7528") : null), cny ? row("\u4EBA\u6C11\u5E01 (CNY)", cny, "\xA5") : /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-note" }, "\u672A\u8FD4\u56DE\u4EBA\u6C11\u5E01\u4F59\u989D\u3002"), usd ? row("\u7F8E\u5143 (USD)", usd, "$") : null, /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-foot" }, /* @__PURE__ */ (0, import_react3.createElement)("span", null, "\u70B9\u51FB\u80F6\u56CA\u7ACB\u5373\u5237\u65B0")));
}
function TidePopoverBody({ tide, tideRemain }) {
  return /* @__PURE__ */ (0, import_react3.createElement)(import_react3.Fragment, null, /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-head" }, /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-label" }, "DeepSeek API \u5CF0\u8C37\u5B9A\u4EF7"), /* @__PURE__ */ (0, import_react3.createElement)("span", { className: tide.isPeak ? "billing-pop-warn" : "billing-pop-hit" }, tide.isPeak ? "\u9AD8\u5CF0\u65F6\u6BB5" : "\u4F4E\u8C37\u65F6\u6BB5")), /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-tide-line" }, tide.isPeak ? `\u8DDD\u8F6C\u4F4E\u8C37\u8FD8\u6709 ${tideRemain}` : `\u8DDD\u8F6C\u9AD8\u5CF0\u8FD8\u6709 ${tideRemain}`), /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-rule" }), /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-tide-rule" }, "\u9AD8\u5CF0\uFF1A\u5468\u4E00\u81F3\u5468\u4E94\uFF08\u4E0D\u542B\u4E2D\u56FD\u6CD5\u5B9A\u8282\u5047\u65E5\uFF0909:00\u201312:00\u300114:00\u201318:00\uFF08\u5317\u4EAC\u65F6\u95F4\uFF09", /* @__PURE__ */ (0, import_react3.createElement)("br", null), "\u5176\u4F59\u65F6\u6BB5\uFF08\u542B\u5468\u672B\u5168\u5929\u3001\u4E2D\u56FD\u6CD5\u5B9A\u8282\u5047\u65E5\u5168\u5929\u3001\u8C03\u4F11\u4E0A\u73ED\u7684\u5468\u672B\uFF09\u4E3A\u7A7A\u95F2\uFF1B", /* @__PURE__ */ (0, import_react3.createElement)("br", null), "\u7A7A\u95F2\u4EF7 = \u9AD8\u5CF0\u4EF7\u7684\u4E00\u534A\u3002"), /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pop-foot" }, /* @__PURE__ */ (0, import_react3.createElement)("span", null, "\u70B9\u51FB\u80F6\u56CA\u7ACB\u5373\u5237\u65B0")));
}
function BillingPills(props) {
  const sessionId = props.sessionId;
  const [costData, setCostData] = (0, import_react3.useState)(null);
  const [balData, setBalData] = (0, import_react3.useState)(null);
  const [costFailed, setCostFailed] = (0, import_react3.useState)(false);
  const [balFailed, setBalFailed] = (0, import_react3.useState)(false);
  const costEpochRef = (0, import_react3.useRef)(0);
  const balEpochRef = (0, import_react3.useRef)(0);
  const [refreshing, setRefreshing] = (0, import_react3.useState)(false);
  const refreshCost = (0, import_react3.useCallback)(async () => {
    if (!sessionId) return;
    const epoch = ++costEpochRef.current;
    try {
      const value = await rpc("cost", { sessionId });
      if (epoch !== costEpochRef.current) return;
      setCostData(value);
      setCostFailed(false);
    } catch {
      if (epoch === costEpochRef.current) setCostFailed(true);
    }
  }, [sessionId]);
  const refreshBalance = (0, import_react3.useCallback)(async () => {
    const epoch = ++balEpochRef.current;
    try {
      const value = await rpc("balance");
      if (epoch !== balEpochRef.current) return;
      setBalData(value);
      setBalFailed(false);
    } catch {
      if (epoch === balEpochRef.current) setBalFailed(true);
    }
  }, []);
  const refreshQuiet = (0, import_react3.useCallback)(() => {
    refreshCost();
    refreshBalance();
  }, [refreshCost, refreshBalance]);
  const refreshByClick = (0, import_react3.useCallback)(async () => {
    setRefreshing(true);
    const startedAt = Date.now();
    try {
      await Promise.all([refreshCost(), refreshBalance()]);
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < REFRESH_DIM_MIN_MS) {
        await new Promise((resolve) => setTimeout(resolve, REFRESH_DIM_MIN_MS - elapsed));
      }
      setRefreshing(false);
    }
  }, [refreshCost, refreshBalance]);
  (0, import_react3.useEffect)(() => {
    setCostData(null);
    setCostFailed(false);
    refreshQuiet();
  }, [sessionId]);
  const running = typeof props.useSession === "function" ? props.useSession((s2) => s2.running) : false;
  const prevRunningRef = (0, import_react3.useRef)(running);
  (0, import_react3.useEffect)(() => {
    const wasRunning = prevRunningRef.current;
    prevRunningRef.current = running;
    if (wasRunning && !running) refreshQuiet();
  }, [running, refreshQuiet]);
  (0, import_react3.useEffect)(() => {
    const onVisibility = () => {
      if (!document.hidden) refreshQuiet();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refreshQuiet]);
  const cny = balData && balData.infos ? balData.infos.find((i2) => i2.currency === "CNY") : void 0;
  const usd = balData && balData.infos ? balData.infos.find((i2) => i2.currency === "USD") : void 0;
  const tide = useTide(sessionId);
  const tideLabel = tide.isPeak ? "\u9AD8\u5CF0\u65F6\u6BB5" : "\u4F4E\u8C37\u65F6\u6BB5";
  const tideRemain = fmtRemain(tide.nextChangeHours);
  const tideMinutes = tide.nextChangeHours < 1;
  const tideValue = tideMinutes ? Math.max(1, Math.round(tide.nextChangeHours * 60)) : Math.round(tide.nextChangeHours * 10) / 10;
  const tideSuffix = tideMinutes ? "m" : "h";
  const tideDigits = !tideMinutes && !Number.isInteger(tideValue) ? 1 : 0;
  const cnyValue = cny ? toNumber(cny.totalBalance) : null;
  const balUnavailable = balData?.isAvailable === false;
  const balLow = !balUnavailable && cnyValue !== null && cnyValue < LOW_BALANCE_CNY;
  const balClass = "billing-num" + (balUnavailable ? "" : cnyValue === null ? "" : balLow ? " billing-low" : " billing-ok");
  const aria = (label, detail) => `${label}\u3002\u60AC\u505C\u67E5\u770B\u660E\u7EC6\uFF0C\u70B9\u51FB\u7ACB\u5373\u5237\u65B0\u3002${detail}`;
  return /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-pills" }, /* @__PURE__ */ (0, import_react3.createElement)(
    "span",
    {
      className: "billing-pill" + (refreshing ? " is-refreshing" : ""),
      onClick: () => refreshByClick(),
      tabIndex: 0,
      role: "button",
      "aria-label": aria("DeepSeek \u8D26\u6237\u4F59\u989D", cny ? `\u4EBA\u6C11\u5E01\u603B\u4F59\u989D \xA5${cny.totalBalance}` : "")
    },
    "\u4F59\u989D",
    " ",
    balUnavailable ? /* @__PURE__ */ (0, import_react3.createElement)("b", { className: "billing-num billing-warn" }, "\u4E0D\u53EF\u7528") : /* @__PURE__ */ (0, import_react3.createElement)("b", { className: balClass }, /* @__PURE__ */ (0, import_react3.createElement)("span", { className: "billing-money-slot" }, /* @__PURE__ */ (0, import_react3.createElement)(
      Rolling,
      {
        value: balFailed ? null : cnyValue ?? 0,
        placeholder: "\u2014",
        prefix: "\xA5",
        fractionDigits: 2,
        locales: "zh-CN"
      }
    ))),
    balData ? /* @__PURE__ */ (0, import_react3.createElement)(Popover, { body: /* @__PURE__ */ (0, import_react3.createElement)(BalancePopoverBody, { balData, cny, usd }) }) : null
  ), /* @__PURE__ */ (0, import_react3.createElement)(
    "span",
    {
      className: "billing-pill" + (refreshing ? " is-refreshing" : ""),
      onClick: () => refreshByClick(),
      tabIndex: 0,
      role: "button",
      "aria-label": aria("\u672C\u4F1A\u8BDD API \u8D39\u7528", costData ? `\xA5${fmtCost(costData.cost)}` : ""),
      style: costFailed ? { opacity: 0.45 } : void 0
    },
    "\u4F1A\u8BDD",
    " ",
    /* @__PURE__ */ (0, import_react3.createElement)("b", { className: "billing-num" }, /* @__PURE__ */ (0, import_react3.createElement)(SessionAmount, { costData, costFailed, sessionId })),
    costData ? /* @__PURE__ */ (0, import_react3.createElement)(Popover, { body: /* @__PURE__ */ (0, import_react3.createElement)(CostPopoverBody, { data: costData }) }) : null
  ), /* @__PURE__ */ (0, import_react3.createElement)(
    "span",
    {
      className: "billing-pill" + (refreshing ? " is-refreshing" : ""),
      onClick: () => refreshByClick(),
      tabIndex: 0,
      role: "button",
      "aria-label": aria(tideLabel, `\u8DDD\u5207\u6362 ${tideRemain}`)
    },
    tideLabel,
    " \xB7",
    " ",
    /* @__PURE__ */ (0, import_react3.createElement)("b", { className: "billing-num " + (tide.isPeak ? "billing-warn" : "billing-ok") }, /* @__PURE__ */ (0, import_react3.createElement)(
      Rolling,
      {
        value: tideValue,
        placeholder: "\u2014",
        suffix: tideSuffix,
        fractionDigits: tideDigits,
        locales: "en-US"
      }
    )),
    /* @__PURE__ */ (0, import_react3.createElement)(Popover, { body: /* @__PURE__ */ (0, import_react3.createElement)(TidePopoverBody, { tide, tideRemain }) })
  ));
}
function apply(ctx) {
  ctx.slots.inject(
    "conversation.session.header.actions",
    () => ctx.slots.register(
      { name: "conversation.session.header.actions", id: "billing-pills", order: -10 },
      BillingPills
    )
  );
}
var inject = ["slots"];
var testHooks = {
  computeTide,
  hitRate,
  shortModel,
  relTime,
  CostPopoverBody,
  BalancePopoverBody,
  TidePopoverBody
};
return module.exports;};window.__ModuleLoader__.load({id:'dsh-billing',factory:makeFactory});
