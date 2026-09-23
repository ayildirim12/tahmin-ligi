/**
 * Detects whether the current page is running inside an in-app browser / webview
 * (such as WhatsApp, Instagram, Facebook, Telegram, Twitter, etc.)
 * where third-party OAuth popups and redirects often fail or are blocked.
 */
export function isInAppBrowser(customUserAgent?: string): boolean {
  if (typeof window === 'undefined' && !customUserAgent) return false
  const ua = customUserAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '')
  if (!ua) return false

  // Known in-app browser signatures:
  // - WhatsApp
  // - Instagram
  // - Facebook (FBAN, FBAV, FB_IAB)
  // - Twitter/X (Twitter)
  // - Telegram (Telegram)
  // - TikTok (musical_ly, ByteLocale, Bytedance)
  // - LinkedIn (LinkedInApp)
  // - Line (Line)
  // - Snapchat (Snapchat)
  // - WeChat (MicroMessenger)
  const knownInAppRegex = /WhatsApp|Instagram|FBAN|FBAV|FB_IAB|Twitter|Telegram|musical_ly|ByteLocale|Bytedance|LinkedInApp|Line\/|Snapchat|MicroMessenger/i
  if (knownInAppRegex.test(ua)) return true

  // iOS WebViews:
  // Standard Mobile Safari has "Safari" and "Mobile" without custom app tokens.
  // WebViews (UIWebView / WKWebView) often have "AppleWebKit" and "Mobile" but lack "Safari",
  // or explicitly include "WebView".
  const isIos = /iPhone|iPad|iPod/i.test(ua)
  if (isIos) {
    const isSafari = /Safari/i.test(ua)
    const isExplicitWebView = /WebView/i.test(ua)
    if (!isSafari || isExplicitWebView) {
      return true
    }
  }

  // Android WebViews:
  // Usually contain "wv" or "Version/X.X Chrome" without regular Chrome standalone signature.
  const isAndroid = /Android/i.test(ua)
  if (isAndroid && (/;\s*wv\b/i.test(ua) || /Version\/[\d.]+.*Chrome/i.test(ua))) {
    return true
  }

  return false
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || '')
}
