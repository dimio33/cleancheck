export type Platform = 'ios-safari' | 'android-chrome' | 'desktop-chrome' | 'desktop-safari' | 'firefox' | 'generic';

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua);
  const isFirefox = /Firefox/.test(ua);

  if (isIOS && isSafari) return 'ios-safari';
  if (isAndroid && isChrome) return 'android-chrome';
  if (isFirefox) return 'firefox';
  if (isSafari) return 'desktop-safari';
  if (isChrome) return 'desktop-chrome';
  return 'generic';
}
