"use client";

import { useState, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function EventMap({ events, center }) {
  const [viewState, setViewState] = useState({
    longitude: center?.longitude || -74.0060,
    latitude: center?.latitude || 40.7128,
    zoom: 12
  });
  const [popupInfo, setPopupInfo] = useState(null);

  // Update view when center prop changes
  useEffect(() => {
    if (center) {
      setViewState(prev => ({
        ...prev,
        longitude: center.longitude,
        latitude: center.latitude,
        zoom: 12
      }));
    }
  }, [center]);

  return (
    <Map
      {...viewState}
      onMove={evt => setViewState(evt.viewState)}
      mapLib={maplibregl}
      style={{ width: '100%', height: '100%' }}
      // Using Carto's free Voyager style which works well without an API key
      mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
    >
      <NavigationControl position="top-right" />

      {events.map((event) => {
        const venue = event._embedded?.venues?.[0];
        const lat = venue?.location?.latitude;
        const lng = venue?.location?.longitude;

        if (!lat || !lng) return null;

        return (
          <Marker
            key={event.id}
            longitude={parseFloat(lng)}
            latitude={parseFloat(lat)}
            anchor="bottom"
          >
            <div
              className="text-2xl cursor-pointer hover:scale-110 transition-transform filter drop-shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                setPopupInfo(event);
              }}
            >
              📍
            </div>
          </Marker>
        );
      })}

      {popupInfo && (
        <Popup
          anchor="top"
          longitude={parseFloat(popupInfo._embedded?.venues?.[0]?.location?.longitude)}
          latitude={parseFloat(popupInfo._embedded?.venues?.[0]?.location?.latitude)}
          onClose={() => setPopupInfo(null)}
          maxWidth="300px"
        >
          <div className="p-1">
            <h3 className="font-bold text-sm mb-1 text-gray-900">{popupInfo.name}</h3>
            <p className="text-xs text-gray-600 mb-2">{popupInfo._embedded?.venues?.[0]?.name}</p>
            {popupInfo.images?.[0] && (
              <img src={popupInfo.images[0].url} alt={popupInfo.name} className="w-full h-24 object-cover rounded mb-2" />
            )}
            <a href={popupInfo.url} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors">
              {popupInfo.priceRanges ? "Get Tickets" : "View Details"}
            </a>
          </div>
        </Popup>
      )}
    </Map>
  );
}