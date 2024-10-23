import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

function App() {
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [path, setPath] = useState(null);

  // Function to handle click events on the map
  const handleMapClick = async (type, lat, lng) => {
    try {
      const response = await axios.post('http://127.0.0.1:8000/nearest-scats', {
        lat: lat,
        lng: lng,
      });

      const nearestScats = response.data.nearest_scats;

      if (type === 'start') {
        setStart(nearestScats);
      } else if (type === 'end') {
        setEnd(nearestScats);
        if (start) {
          // Request the path between start and end SCATS sites
          const pathResponse = await axios.post('http://127.0.0.1:8000/path', {
            start: start,
            end: nearestScats,
          });
          setPath(pathResponse.data.path); // Update the path
        }
      }
    } catch (error) {
      console.error('Error fetching SCATS site or path:', error);
    }
  };

  return (
    <div>
      <h1>SCATS Path Finder</h1>
      <MapContainer center={[-37.8136, 144.9631]} zoom={13} style={{ height: '500px', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {start && <Marker position={[start.lat, start.lng]} />}
        {end && <Marker position={[end.lat, end.lng]} />}
        {path && <Polyline positions={path.map(site => [site.lat, site.lng])} />}
        <MapEventsHandler onClick={handleMapClick} />
      </MapContainer>
      {path && <div>Shortest path includes {path.length} SCATS sites</div>}
    </div>
  );
}

// Handle map clicks to detect start and end points
function MapEventsHandler({ onClick }) {
  useMapEvents({
    click: (event) => {
      const { lat, lng } = event.latlng;
      // If start is not set, click sets start, else sets end
      onClick(!start ? 'start' : 'end', lat, lng);
    },
  });
  return null;
}

export default App;
