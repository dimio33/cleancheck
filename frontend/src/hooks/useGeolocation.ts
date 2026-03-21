import { useGeoStore, type PermissionState } from '../stores/geoStore';

interface GeolocationState {
  lat: number;
  lng: number;
  loading: boolean;
  error: string | null;
  permissionState: PermissionState;
}

export function useGeolocation(): GeolocationState {
  const { lat, lng, loading, error, permissionState } = useGeoStore();
  return { lat, lng, loading, error, permissionState };
}

/**
 * One-shot high-accuracy position request.
 * Used for geo-verification before rating submission.
 */
export function getHighAccuracyPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}
