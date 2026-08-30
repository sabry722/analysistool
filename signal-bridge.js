/*
 * Deriv Analyzer Signal Bridge v1
 * Signal-only transport. It NEVER places trades and NEVER handles account tokens.
 *
 * Analyzer side:
 *   window.DerivSignalBridge.publish({ market, contract, prediction, confidence })
 *
 * Bot side:
 *   window.DerivSignalBridge.subscribe(signal => { ... })
 *
 * Transport: BroadcastChannel + localStorage fallback.
 * Signals expire after 15 seconds and receive a unique signal_id.
 */
(function (root) {
  'use strict';
  const CHANNEL = 'deriv-analyzer-signal-v1';
  const STORAGE_KEY = 'deriv.analyzer.latest.signal.v1';
  const TTL_MS = 15000;
  const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;
  const listeners = new Set();

  function now() { return Date.now(); }
  function cleanString(v) { return typeof v === 'string' ? v.trim() : ''; }
  function classify(c) {
    const n = Number(c);
    if (!Number.isFinite(n)) return { key: 'invalid', label: 'INVALID', eligible: false };
    const p = n <= 1 ? n * 100 : n;
    if (p >= 80) return { key: 'strong', label: 'STRONGEST', eligible: true };
    if (p >= 70) return { key: 'qualified', label: 'QUALIFIED', eligible: true };
    if (p >= 60) return { key: 'moderate', label: 'MODERATE', eligible: false };
    if (p >= 50) return { key: 'weak', label: 'WEAK', eligible: false };
    return { key: 'below', label: 'BELOW_50', eligible: false };
  }
  function normalize(input) {
    if (!input || typeof input !== 'object') throw new Error('Signal must be an object');
    const market = cleanString(input.market || input.symbol);
    const contract = cleanString(input.contract).toUpperCase();
    if (!market) throw new Error('Signal market is required');
    if (!contract) throw new Error('Signal contract is required');
    const confidence = Number(input.confidence);
    const tier = classify(confidence);
    if (tier.key === 'invalid') throw new Error('Signal confidence is invalid');
    const created = Number(input.generated_at) || now();
    return Object.freeze({
      version: 1,
      signal_id: cleanString(input.signal_id) || market + '-' + created + '-' + Math.random().toString(36).slice(2, 8),
      market,
      contract,
      prediction: input.prediction && typeof input.prediction === 'object' ? input.prediction : {},
      confidence: confidence <= 1 ? confidence : confidence / 100,
      confidence_percent: Number((confidence <= 1 ? confidence * 100 : confidence).toFixed(2)),
      confirmation: tier.label,
      eligible: tier.eligible,
      generated_at: created,
      expires_at: Number(input.expires_at) || created + TTL_MS,
      source: 'analysis-tool'
    });
  }
  function deliver(signal) {
    if (!signal || now() >= signal.expires_at) return false;
    listeners.forEach(fn => { try { fn(signal); } catch (_) {} });
    return true;
  }
  function publish(input) {
    const signal = normalize(input);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(signal)); } catch (_) {}
    if (bc) { try { bc.postMessage(signal); } catch (_) {} }
    deliver(signal);
    return signal;
  }
  function subscribe(fn) {
    if (typeof fn !== 'function') throw new Error('Subscriber must be a function');
    listeners.add(fn);
    return function unsubscribe() { listeners.delete(fn); };
  }
  function latest() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return s && now() < Number(s.expires_at) ? s : null;
    } catch (_) { return null; }
  }
  if (bc) bc.onmessage = e => deliver(e.data);
  root.addEventListener('storage', e => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try { deliver(JSON.parse(e.newValue)); } catch (_) {}
  });
  root.DerivSignalBridge = Object.freeze({ publish, subscribe, latest, TTL_MS, classify });
})(window);
