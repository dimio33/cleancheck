import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export type PermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable' | 'unknown';

const isNative = Capacitor.isNativePlatform();

// Default: center of Germany (Kassel area) — used until real GPS position arrives
const DEFAULT_LAT = 51.3127;
const DEFAULT_LNG = 9.4797;

interface GeoStore {
  lat: number;
  lng: number;
  loading: boolean;
  error: string | null;
  permissionState: PermissionState;
  permissionAsked: boolean;
  watchId: number | null;
  initialized: boolean;

  initGeo: () => Promise<void>;
  checkPermission: () => Promise<void>;
  requestPermission: () => Promise<PermissionState>;
  startWatching: () => void;
  stopWatching: () => void;
  setPermissionAsked: () => void;
}

// Track permission listener to avoid duplicates
let permissionListener: (() => void) | null = null;
let permissionResult: PermissionStatus | null = null;

export const useGeoStore = create<GeoStore>((set, get) => ({
  lat: DEFAULT_LAT,
  lng: DEFAULT_LNG,
  loading: true,
  error: null,
  permissionState: (localStorage.getItem('cleancheck_geo_permission') as PermissionState) || 'unknown',
  permissionAsked: localStorage.getItem('cleancheck_geo_asked') === 'true',
  watchId: null,
  initialized: false,

  initGeo: async () => {
    if (get().initialized) return;
    set({ initialized: true });
    await get().checkPermission();
    const perm = get().permissionState;
    if (perm === 'granted') {
      get().startWatching();
    } else if (perm === 'prompt' || perm === 'unknown') {
      // Auto-request on first launch
      await get().requestPermission();
    }
  },

  checkPermission: async () => {
    if (isNative) {
      try {
        const status = await Geolocation.checkPermissions();
        const state: PermissionState = status.location === 'granted' ? 'granted'
          : status.location === 'denied' ? 'denied'
          : 'prompt';
        set({ permissionState: state, loading: state !== 'granted' ? false : get().loading });
        localStorage.setItem('cleancheck_geo_permission', state);
        return;
      } catch {
        set({ loading: false });
        return;
      }
    }

    // Web: Try Permissions API (Chrome, Firefox — NOT Safari)
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        const state = result.state === 'granted' ? 'granted'
          : result.state === 'denied' ? 'denied'
          : 'prompt';
        set({ permissionState: state, loading: state !== 'granted' ? false : get().loading });
        localStorage.setItem('cleancheck_geo_permission', state);

        // Clean up old listener before adding new one
        if (permissionListener && permissionResult) {
          permissionResult.removeEventListener('change', permissionListener);
        }

        // Listen for changes (user toggles in browser settings while app is open)
        permissionListener = () => {
          const newState = result.state === 'granted' ? 'granted'
            : result.state === 'denied' ? 'denied'
            : 'prompt';
          set({ permissionState: newState });
          localStorage.setItem('cleancheck_geo_permission', newState);
          if (newState === 'granted' && !get().watchId) {
            get().startWatching();
          }
        };
        permissionResult = result;
        result.addEventListener('change', permissionListener);
        return;
      } catch {
        // Permissions API failed — fall through to localStorage
      }
    }

    // Fallback: read from localStorage (Safari, older browsers)
    const stored = localStorage.getItem('cleancheck_geo_permission') as PermissionState | null;
    if (stored) {
      set({ permissionState: stored, loading: stored !== 'granted' ? false : get().loading });
    } else {
      set({ loading: false });
    }
  },

  requestPermission: async () => {
    if (isNative) {
      try {
        const status = await Geolocation.requestPermissions({ permissions: ['location'] });
        if (status.location === 'granted') {
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
          set({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            loading: false,
            error: null,
            permissionState: 'granted',
          });
          localStorage.setItem('cleancheck_geo_permission', 'granted');
          get().startWatching();
          return 'granted';
        }
        const state: PermissionState = status.location === 'denied' ? 'denied' : 'prompt';
        set({ permissionState: state, loading: false });
        localStorage.setItem('cleancheck_geo_permission', state);
        return state;
      } catch {
        set({ permissionState: 'denied', loading: false, error: 'Permission denied' });
        localStorage.setItem('cleancheck_geo_permission', 'denied');
        return 'denied';
      }
    }

    // Web fallback
    if (!('geolocation' in navigator)) {
      set({ permissionState: 'unavailable', error: 'Geolocation not supported' });
      localStorage.setItem('cleancheck_geo_permission', 'unavailable');
      return 'unavailable';
    }

    return new Promise<PermissionState>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          set({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            loading: false,
            error: null,
            permissionState: 'granted',
          });
          localStorage.setItem('cleancheck_geo_permission', 'granted');
          get().startWatching();
          resolve('granted');
        },
        (err) => {
          if (err.code === 1) {
            set({ permissionState: 'denied', loading: false, error: 'Permission denied' });
            localStorage.setItem('cleancheck_geo_permission', 'denied');
            resolve('denied');
          } else {
            set({ permissionState: 'unavailable', loading: false, error: err.message });
            localStorage.setItem('cleancheck_geo_permission', 'unavailable');
            resolve('unavailable');
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  },

  startWatching: () => {
    if (get().watchId !== null) return;

    if (isNative) {
      Geolocation.watchPosition(
        { enableHighAccuracy: true },
        (position, err) => {
          if (position) {
            set({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              loading: false,
              error: null,
              permissionState: 'granted',
            });
            localStorage.setItem('cleancheck_geo_permission', 'granted');
          }
          if (err) {
            set({ error: err.message, loading: false });
          }
        }
      ).then(id => {
        set({ watchId: parseInt(id, 10) || 1 });
      });
      return;
    }

    // Web fallback
    if (!('geolocation' in navigator)) return;

    const id = navigator.geolocation.watchPosition(
      (position) => {
        set({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          loading: false,
          error: null,
          permissionState: 'granted',
        });
        localStorage.setItem('cleancheck_geo_permission', 'granted');
      },
      (err) => {
        set({ error: err.message, loading: false });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );

    set({ watchId: id });
  },

  stopWatching: () => {
    const { watchId } = get();
    if (watchId !== null) {
      if (isNative) {
        Geolocation.clearWatch({ id: String(watchId) });
      } else {
        navigator.geolocation.clearWatch(watchId);
      }
      set({ watchId: null });
    }
  },

  setPermissionAsked: () => {
    set({ permissionAsked: true });
    localStorage.setItem('cleancheck_geo_asked', 'true');
  },
}));
