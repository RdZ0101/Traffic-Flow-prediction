import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import './App.css';

function App() {
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const [eta, setEta] = useState('');
  const [path, setPath] = useState([]); // To store coordinates for the shortest path

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    try {
      // Call the ML model or an API to get the shortest path and ETA
      const response = await axios.post('http://your-api-url/shortest-path', {
        start,
        destination,
      });

      // Assuming the response contains ETA and a list of coordinates for the shortest path
      const { eta, path } = response.data;
      setEta(eta);
      setPath(path); // Assuming the path is an array of lat/lng coordinates
    } catch (error) {
      console.error('Error fetching data', error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Shortest Path Finder</h1>
        <form onSubmit={handleFormSubmit}>
          <div>
            <label>Start Location: </label>
            <input
              type="text"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              placeholder="Enter start location"
            />
          </div>
          <div>
            <label>Destination: </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Enter destination"
            />
          </div>
          <button type="submit">Find Shortest Path</button>
        </form>

        {eta && <p>Estimated Time of Arrival (ETA): {eta} minutes</p>}

        {path.length > 0 && (
          <MapContainer
            center={path[0]} // Center the map on the start location
            zoom={13}
            style={{ height: '400px', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker position={path[0]} /> {/* Start marker */}
            <Marker position={path[path.length - 1]} /> {/* Destination marker */}
            <Polyline positions={path} color="blue" /> {/* Shortest path */}
          </MapContainer>
        )}
      </header>
    </div>
  );
}

export default App;
