import { useState, useEffect, useCallback } from 'react';

/**
 * useSensors hook — handles DeviceMotionEvent for real-time telemetry.
 * Primarily handles iOS permission requests and converts m/s² to G's.
 */
export function useSensors() {
  const [accelerometer, setAccelerometer] = useState({ x: 0, y: 0, z: 0, gForce: 0 });
  const [gyroscope, setGyroscope] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState('');

  const handleMotion = useCallback((event) => {
    // 1. Accelerometer (Impact)
    const acc = event.accelerationIncludingGravity;
    if (acc && acc.x !== null) {
      // Calculate total G-Force (√(x² + y² + z²) / 9.81)
      const gForce = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2) / 9.81;
      
      setAccelerometer({
        x: (acc.x / 9.81).toFixed(2), // Converted to G's
        y: (acc.y / 9.81).toFixed(2),
        z: (acc.z / 9.81).toFixed(2),
        gForce: gForce.toFixed(2)
      });
    }

    // 2. Gyroscope (Rotation/Tumble)
    const gyro = event.rotationRate;
    if (gyro && gyro.alpha !== null) {
      setGyroscope({
        alpha: gyro.alpha.toFixed(2), // Z-axis rotation (Yaw)
        beta: gyro.beta.toFixed(2),   // X-axis rotation (Pitch)
        gamma: gyro.gamma.toFixed(2)  // Y-axis rotation (Roll)
      });
    }
  }, []);

  // Function to request permission (Required for iOS, auto-passes on Android)
  const requestAccess = async () => {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const permissionState = await DeviceMotionEvent.requestPermission();
        if (permissionState === 'granted') {
          window.addEventListener('devicemotion', handleMotion);
          setPermissionGranted(true);
          return true;
        } else {
          setError('Sensor access denied by user.');
          return false;
        }
      } catch (err) {
        setError('Error requesting sensor access.');
        console.error(err);
        return false;
      }
    } else {
      // Non-iOS devices usually don't need explicit permission
      window.addEventListener('devicemotion', handleMotion);
      setPermissionGranted(true);
      return true;
    }
  };

  // Cleanup listener when component unmounts
  useEffect(() => {
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [handleMotion]);

  return { accelerometer, gyroscope, permissionGranted, requestAccess, error };
}
