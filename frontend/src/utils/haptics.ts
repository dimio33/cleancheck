import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const isNative = Capacitor.isNativePlatform();

export async function hapticLight() {
  if (isNative) {
    await Haptics.impact({ style: ImpactStyle.Light });
  } else if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

export async function hapticSuccess() {
  if (isNative) {
    await Haptics.notification({ type: NotificationType.Success });
  } else if ('vibrate' in navigator) {
    navigator.vibrate([50, 30, 50]);
  }
}

export async function hapticCelebration() {
  if (isNative) {
    await Haptics.impact({ style: ImpactStyle.Heavy });
    await new Promise(r => setTimeout(r, 150));
    await Haptics.impact({ style: ImpactStyle.Heavy });
    await new Promise(r => setTimeout(r, 100));
    await Haptics.impact({ style: ImpactStyle.Medium });
  } else if ('vibrate' in navigator) {
    navigator.vibrate([80, 50, 80, 50, 40]);
  }
}
