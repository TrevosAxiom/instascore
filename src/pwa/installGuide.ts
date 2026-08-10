export type InstallPlatform =
  | 'ios-safari'
  | 'ios-browser'
  | 'android-chrome'
  | 'android-samsung'
  | 'android-firefox'
  | 'desktop-chromium'
  | 'desktop-safari'
  | 'desktop-firefox'
  | 'other';

export interface InstallGuide {
  platform: InstallPlatform;
  label: string;
  installSupported: boolean;
  requiresHomepage: boolean;
  steps: string[];
}

export function detectInstallGuide(userAgent = navigator.userAgent): InstallGuide {
  const ua = userAgent.toLowerCase();
  const ios = /iphone|ipad|ipod/.test(ua) || (/macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /android/.test(ua);
  const samsung = /samsungbrowser/.test(ua);
  const firefox = /firefox|fxios/.test(ua);
  const edge = /edg|edgios|edga/.test(ua);
  const chrome = /chrome|crios/.test(ua) && !edge;
  const safari = /safari/.test(ua) && !chrome && !edge && !firefox && !samsung;

  if (ios) {
    return {
      platform: safari ? 'ios-safari' : 'ios-browser',
      label: safari ? 'iPhone or iPad · Safari' : 'iPhone or iPad',
      installSupported: true,
      requiresHomepage: true,
      steps: [
        'Open InstaScore’s homepage before adding it.',
        'Tap Share — the square with the upward arrow.',
        'Choose “Add to Home Screen”, then tap Add.',
      ],
    };
  }
  if (android && samsung) {
    return {
      platform: 'android-samsung',
      label: 'Android · Samsung Internet',
      installSupported: true,
      requiresHomepage: true,
      steps: [
        'Open InstaScore’s homepage.',
        'Tap the menu (☰), then “Add page to”.',
        'Choose Home screen and confirm.',
      ],
    };
  }
  if (android && firefox) {
    return {
      platform: 'android-firefox',
      label: 'Android · Firefox',
      installSupported: true,
      requiresHomepage: true,
      steps: [
        'Open InstaScore’s homepage.',
        'Open the browser menu (⋮).',
        'Tap Install or “Add to Home screen” and confirm.',
      ],
    };
  }
  if (android) {
    return {
      platform: 'android-chrome',
      label: 'Android · Chrome or Edge',
      installSupported: true,
      requiresHomepage: false,
      steps: [
        'Tap Install below when available.',
        'Otherwise open the browser menu (⋮).',
        'Choose “Install app” and confirm.',
      ],
    };
  }
  if (firefox) {
    return {
      platform: 'desktop-firefox',
      label: 'Desktop · Firefox',
      installSupported: false,
      requiresHomepage: false,
      steps: [
        'Desktop Firefox does not currently install standard PWAs.',
        'Open InstaScore in Chrome, Edge, or Safari to install it as an app.',
      ],
    };
  }
  if (safari) {
    return {
      platform: 'desktop-safari',
      label: 'Mac · Safari',
      installSupported: true,
      requiresHomepage: true,
      steps: [
        'Open InstaScore’s homepage.',
        'Choose File → Add to Dock.',
        'Confirm the app name and click Add.',
      ],
    };
  }
  if (chrome || edge) {
    return {
      platform: 'desktop-chromium',
      label: `Desktop · ${edge ? 'Edge' : 'Chrome'}`,
      installSupported: true,
      requiresHomepage: false,
      steps: [
        'Click Install below when available.',
        'Otherwise select the install icon in the address bar.',
        'Confirm “Install InstaScore”.',
      ],
    };
  }
  return {
    platform: 'other',
    label: 'This browser',
    installSupported: true,
    requiresHomepage: true,
    steps: [
      'Open InstaScore’s homepage.',
      'Open your browser menu.',
      'Choose Install, “Add to Home screen”, or the equivalent option.',
    ],
  };
}

export function isStandaloneDisplay() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
