/**
 * Florida Best Realty — cookie consent manager
 * Google Consent Mode v2: analytics/marketing stay denied until the visitor opts in.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "fbr_cookie_consent";
  var COOKIE_NAME = "fbr_cookie_consent";
  var COOKIE_MAX_AGE = 395 * 86400;
  var CONSENT_VERSION = 1;

  function readCookie(name) {
    var match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function writeCookie(name, value, maxAge) {
    var secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie =
      name +
      "=" +
      encodeURIComponent(value) +
      "; Path=/; Max-Age=" +
      maxAge +
      "; SameSite=Lax" +
      secure;
  }

  function loadStoredConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY) || readCookie(COOKIE_NAME);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed.version !== CONSENT_VERSION) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function saveConsent(consent) {
    var payload = {
      version: CONSENT_VERSION,
      essential: true,
      analytics: Boolean(consent.analytics),
      marketing: Boolean(consent.marketing),
      timestamp: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      /* localStorage blocked */
    }
    writeCookie(COOKIE_NAME, JSON.stringify(payload), COOKIE_MAX_AGE);
    return payload;
  }

  function ensureGtagStub() {
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
    }
  }

  function setConsentMode(consent) {
    ensureGtagStub();
    window.gtag("consent", "update", {
      analytics_storage: consent.analytics ? "granted" : "denied",
      ad_storage: consent.marketing ? "granted" : "denied",
      ad_user_data: consent.marketing ? "granted" : "denied",
      ad_personalization: consent.marketing ? "granted" : "denied",
    });
  }

  function applyConsent(consent) {
    setConsentMode(consent);
    document.dispatchEvent(new CustomEvent("fbr-consent-update", { detail: consent }));
  }

  function buildBanner() {
    if (document.getElementById("fbr-cc-root")) return;

    var root = document.createElement("div");
    root.id = "fbr-cc-root";
    root.hidden = true;
    root.innerHTML =
      '<div id="fbr-cc-banner" role="dialog" aria-labelledby="fbr-cc-title" aria-describedby="fbr-cc-desc">' +
      '<div class="fbr-cc-inner">' +
      '<div>' +
      '<p class="fbr-cc-title" id="fbr-cc-title">We use cookies</p>' +
      '<p class="fbr-cc-desc" id="fbr-cc-desc">We use essential cookies to remember your choices. With your permission we also use analytics (Google Tag Manager) to understand how visitors use the site. See our <a href="/cookie-policy.html">Cookie Policy</a>.</p>' +
      "</div>" +
      '<div class="fbr-cc-actions">' +
      '<button type="button" class="fbr-cc-btn fbr-cc-btn-primary" data-cc="accept">Accept all</button>' +
      '<button type="button" class="fbr-cc-btn fbr-cc-btn-secondary" data-cc="reject">Reject non-essential</button>' +
      '<button type="button" class="fbr-cc-btn fbr-cc-btn-secondary" data-cc="customize">Cookie settings</button>' +
      "</div>" +
      "</div>" +
      "</div>" +
      '<div id="fbr-cc-panel" role="dialog" aria-labelledby="fbr-cc-panel-title" aria-modal="true" hidden>' +
      '<div class="fbr-cc-panel-inner">' +
      '<p class="fbr-cc-title" id="fbr-cc-panel-title">Manage cookie preferences</p>' +
      '<p class="fbr-cc-desc">Choose which optional cookies we may set. Essential cookies are always on.</p>' +
      '<div class="fbr-cc-toggles">' +
      '<label class="fbr-cc-toggle fbr-cc-toggle-locked"><input type="checkbox" checked disabled> Essential (required)</label>' +
      '<label class="fbr-cc-toggle"><input type="checkbox" id="fbr-cc-analytics"> Analytics</label>' +
      '<label class="fbr-cc-toggle"><input type="checkbox" id="fbr-cc-marketing"> Marketing</label>' +
      "</div>" +
      '<div class="fbr-cc-actions">' +
      '<button type="button" class="fbr-cc-btn fbr-cc-btn-primary" data-cc="save">Save preferences</button>' +
      '<button type="button" class="fbr-cc-btn fbr-cc-btn-secondary" data-cc="close-panel">Cancel</button>' +
      "</div>" +
      "</div>" +
      "</div>";

    document.body.appendChild(root);
    bindEvents(root);
  }

  function showBanner() {
    var root = document.getElementById("fbr-cc-root");
    if (!root) return;
    root.hidden = false;
    var banner = document.getElementById("fbr-cc-banner");
    var panel = document.getElementById("fbr-cc-panel");
    if (banner) banner.hidden = false;
    if (panel) panel.hidden = true;
  }

  function showPanel() {
    var root = document.getElementById("fbr-cc-root");
    if (!root) return;
    root.hidden = false;
    var banner = document.getElementById("fbr-cc-banner");
    var panel = document.getElementById("fbr-cc-panel");
    if (banner) banner.hidden = true;
    if (panel) panel.hidden = false;
    var stored = loadStoredConsent();
    var analyticsEl = document.getElementById("fbr-cc-analytics");
    var marketingEl = document.getElementById("fbr-cc-marketing");
    if (analyticsEl) analyticsEl.checked = stored ? stored.analytics : false;
    if (marketingEl) marketingEl.checked = stored ? stored.marketing : false;
    var firstBtn = panel.querySelector("[data-cc=save]");
    if (firstBtn) firstBtn.focus();
  }

  function hideAll() {
    var root = document.getElementById("fbr-cc-root");
    if (root) root.hidden = true;
  }

  function acceptAll() {
    var consent = saveConsent({ analytics: true, marketing: true });
    applyConsent(consent);
    hideAll();
  }

  function rejectAll() {
    var consent = saveConsent({ analytics: false, marketing: false });
    applyConsent(consent);
    hideAll();
  }

  function saveCustom() {
    var analyticsEl = document.getElementById("fbr-cc-analytics");
    var marketingEl = document.getElementById("fbr-cc-marketing");
    var consent = saveConsent({
      analytics: analyticsEl ? analyticsEl.checked : false,
      marketing: marketingEl ? marketingEl.checked : false,
    });
    applyConsent(consent);
    hideAll();
  }

  function bindEvents(root) {
    root.addEventListener("click", function (e) {
      var actionEl = e.target.closest("[data-cc]");
      if (!actionEl) return;
      var action = actionEl.getAttribute("data-cc");
      if (action === "accept") acceptAll();
      if (action === "reject") rejectAll();
      if (action === "customize") showPanel();
      if (action === "save") saveCustom();
      if (action === "close-panel") {
        var stored = loadStoredConsent();
        if (stored) hideAll();
        else showBanner();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var panel = document.getElementById("fbr-cc-panel");
      if (panel && !panel.hidden) {
        var stored = loadStoredConsent();
        if (stored) hideAll();
        else showBanner();
      }
    });
  }

  function bindSettingsTriggers() {
    document.addEventListener("click", function (e) {
      var trigger = e.target.closest("[data-cc-settings]");
      if (!trigger) return;
      e.preventDefault();
      buildBanner();
      showPanel();
    });
  }

  function init() {
    ensureGtagStub();
    buildBanner();
    bindSettingsTriggers();

    var stored = loadStoredConsent();
    if (stored) {
      applyConsent(stored);
      hideAll();
      return;
    }

    showBanner();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.FBRConsent = {
    openSettings: function () {
      buildBanner();
      showPanel();
    },
    getConsent: loadStoredConsent,
  };
})();
