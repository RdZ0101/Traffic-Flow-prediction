import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for missing marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MyMap = () => {
  const [start, setStart] = useState(null);
  const [target, setTarget] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState('start');
  const [pathCoordinates, setPathCoordinates] = useState([]); // Store path coordinates for polyline
  const [pathCost, setPathCost] = useState(null); // Store path cost

  const positionsWithLabels = [
    { position: [-37.8673031, 145.0915114], label: '970' },
    { position: [-37.8519228, 145.0943244], label: '2000' },
    { position: [-37.81654, 145.0980472], label: '2200' },
    { position: [-37.7947848, 145.0304651], label: '2820' },
    { position: [-37.78661, 145.06202], label: '2825' },
    { position: [-37.7817393, 145.0773314], label: '2827' },
    { position: [-37.8613043, 145.0578745], label: '2846' },
    { position: [-37.8145649, 145.02221], label: '3001' },
    { position: [-37.8151625, 145.0265725], label: '3002' },
    { position: [-37.822895, 145.0572875], label: '3120' },
    { position: [-37.8238567, 145.0643933], label: '3122' },
    { position: [-37.8278467, 145.0985767], label: '3126' },
    { position: [-37.8252267, 145.0779467], label: '3127' },
    { position: [-37.7962133, 145.0835067], label: '3180' },
    { position: [-37.8089525, 145.0274575], label: '3662' },
    { position: [-37.837475, 145.0968675], label: '3682' },
    { position: [-37.8548714, 145.0939236], label: '3685' },
    { position: [-37.8336425, 145.0623925], label: '3804' },
    { position: [-37.83749, 145.060865], label: '3812' },
    { position: [-37.79533, 145.0616067], label: '4030' },
    { position: [-37.8022975, 145.06123], label: '4032' },
    { position: [-37.81185, 145.059405], label: '4034' },
    { position: [-37.8181564, 145.0581226], label: '4035' },
    { position: [-37.8328717, 145.0554233], label: '4040' },
    { position: [-37.84716, 145.0526275], label: '4043' },
    { position: [-37.7941433, 145.0693333], label: '4051' },
    { position: [-37.8049687, 145.0817598], label: '4057' },
    { position: [-37.8143725, 145.080005], label: '4063' },
    { position: [-37.82155, 145.01503], label: '4262' },
    { position: [-37.8230562, 145.024958], label: '4263' },
    { position: [-37.8241054, 145.0340062], label: '4264' },
    { position: [-37.82529, 145.04387], label: '4266' },
    { position: [-37.8302275, 145.032815], label: '4270' },
    { position: [-37.8318833, 145.0463933], label: '4272' },
    { position: [-37.84659, 145.04443], label: '4273' },
    { position: [-37.8008379, 145.049119], label: '4321' },
    { position: [-37.8093323, 145.0368477], label: '4324' },
    { position: [-37.806215, 145.03525], label: '4335' },
    { position: [-37.8289133, 145.0155867], label: '4812' },
    { position: [-37.812965, 145.00847], label: '4821' }
  ];

  const handleMarkerClick = (label) => {
    if (!selecting) return; 
    if (selected === 'start') {
      setStart(label);
      setSelected('target');
    } else if (selected === 'target') {
      setTarget(label);
      setSelecting(false);
    }
  };

  const handleJourneyStart = () => {
    setStart(null);
    setTarget(null);
    setSelecting(true);
    setSelected('start');
    setPathCoordinates([]); // Clear any existing path
    setPathCost(null); // Reset path cost
  };

  const handleSubmit = async () => {
    if (start && target) {
      const dateTimeNow = new Date().toISOString();
      try {
        const response = await fetch('http://localhost:8000/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ start, target, datetime: dateTimeNow }),
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        console.log('Path Cost:', data.path_cost);
        console.log('Path:', data.path);

        // Set the path cost
        setPathCost(data.path_cost);

        // Map SCATS IDs (in data.path) to actual positions
        const newPathCoordinates = data.path.map(scatsId => {
          const match = positionsWithLabels.find(item => item.label === scatsId.toString());
          return match ? match.position : null;
        }).filter(Boolean); // Remove any null values

        setPathCoordinates(newPathCoordinates); // Set path coordinates for polyline

      } catch (error) {
        console.error('Error fetching journey data:', error);
      }
    } else {
      alert('Please select both a start and a target marker.');
    }
  };

  const getMarkerColor = (label) => {
    if (label === start) return 'blue';
    if (label === target) return 'green';
    return 'red';
  };

  return (
    <>
      {!selecting && (
        <button onClick={handleJourneyStart} style={{ margin: '20px' }}>Start Journey</button>
      )}
      {start && target && (
        <button onClick={handleSubmit} style={{ margin: '20px' }}>Submit</button>
      )}
      {pathCost && (
        <div style={{ margin: '20px' }}>
          <strong>Path Cost:</strong> {pathCost} seconds
        </div>
      )}
      <MapContainer center={positionsWithLabels[0].position} zoom={13} scrollWheelZoom={false} style={{ height: "100vh", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {positionsWithLabels.map((item, index) => (
          <Marker
            key={index}
            position={item.position}
            eventHandlers={{
              click: () => handleMarkerClick(item.label),
            }}
            icon={L.icon({
              iconUrl: `https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png`,
              shadowUrl: `https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png`,
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41],
              className: getMarkerColor(item.label),
            })}
          >
            <Popup>
              {item.label} <br /> Latitude: {item.position[0]}, Longitude: {item.position[1]}
            </Popup>
          </Marker>
        ))}
        {/* Plot the path using Polyline if path coordinates are available */}
        {pathCoordinates.length > 0 && (
          <Polyline positions={pathCoordinates} color="blue" />
        )}
      </MapContainer>
    </>
  );
};

export default MyMap;