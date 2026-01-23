import { useState, useEffect } from "react";

export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [city, setCity] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    const handleSuccess = (position) => {
      const { latitude, longitude } = position.coords;
      setLocation({ latitude, longitude });
    };

    const handleError = (error) => {
      setError(error.message);
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError);
  }, []);

  // Reverse Geocoding: Fetch city name when location is available
  useEffect(() => {
    if (!location) return;

    const fetchCity = async () => {
      try {
        // Using OpenStreetMap Nominatim API (Free, no key required for low usage)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}`
        );
        const data = await response.json();

        if (data.address) {
          // Prioritize city, then town, village, etc.
          const cityName =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.hamlet ||
            "Unknown Location";
          setCity(cityName);
        }
      } catch (err) {
        console.error("Failed to fetch city name:", err);
      }
    };

    fetchCity();
  }, [location]);

  return { location, city, error };
};
