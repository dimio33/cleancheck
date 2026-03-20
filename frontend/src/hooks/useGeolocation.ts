import { useState, useEffect } from 'react';

interface GeolocationState {
  lat: number;
  lng: number;
  loading: boolean;
  error: string | null;
}

// Default: Stuttgart city center
const DEFAULT_LAT = 48.7758;
const DEFAULT_LNG = 9.1829;

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Geolocation is not supported',
      }));
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          loading: false,
          error: null,
        });
      },
      (error) => {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return state;
}

/**
 * One-shot high-accuracy position request for critical moments
 * (e.g., rating verification). Never returns cached data.
 */
export function getHighAccuracyPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
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
        maximumAge: 0,
        timeout: 10000,
      }
    );
  });
}
