import { describe, expect, it } from 'vitest'
import { isInAppBrowser } from './inAppBrowser'

describe('isInAppBrowser', () => {
  it('detects WhatsApp on iOS', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko; compatible; WhatsApp/10.0.2.1) Version/19.7 Mobile/15E148 Safari/604.1'
    expect(isInAppBrowser(ua)).toBe(true)
  })

  it('detects Instagram on iOS', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 320.0.0.18.109'
    expect(isInAppBrowser(ua)).toBe(true)
  })

  it('detects Facebook in-app browser on iOS', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.4;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]'
    expect(isInAppBrowser(ua)).toBe(true)
  })

  it('detects Telegram on iOS', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Telegram/10.9.1'
    expect(isInAppBrowser(ua)).toBe(true)
  })

  it('detects Android WebView with ; wv', () => {
    const ua =
      'Mozilla/5.0 (Linux; U; Android 14; tr-tr; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.6261.64 Mobile Safari/537.36'
    expect(isInAppBrowser(ua)).toBe(true)
  })

  it('does NOT flag regular Safari on iOS', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
    expect(isInAppBrowser(ua)).toBe(false)
  })

  it('does NOT flag regular Chrome on Android', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.119 Mobile Safari/537.36'
    expect(isInAppBrowser(ua)).toBe(false)
  })

  it('does NOT flag regular Chrome on macOS', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    expect(isInAppBrowser(ua)).toBe(false)
  })

  it('does NOT flag regular Safari on macOS', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15'
    expect(isInAppBrowser(ua)).toBe(false)
  })
})
