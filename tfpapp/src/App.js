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
  const [statusMessage, setStatusMessage] = useState('');
  const [pathCoordinates, setPathCoordinates] = useState([]);
  const [pathCost, setPathCost] = useState(null);

  const positionsWithLabels = [
    { position: [-37.865849, 145.09282], label: '970' },
    { position: [-37.850381, 145.094563], label: '2000' },
    { position: [-37.815031, 145.09938], label: '2200' },
    { position: [-37.792949, 145.03148], label: '2820' },
    { position: [-37.78661, 145.06202], label: '2825' },
    { position: [-37.784762, 145.006304], label: '2827' },
    { position: [-37.811399, 145.00983], label: '2846' },
    { position: [-37.8145649, 145.02221], label: '3001' },
    { position: [-37.813661, 145.02785], label: '3002' },
    { position: [-37.822272, 145.06570], label: '3120' },
    { position: [-37.8813661, 145.05858], label: '3122' },
    { position: [-37.822272, 145.09994], label: '3126' },
    { position: [-37.823725, 145.07922], label: '3127' },
    { position: [-37.794653, 145.08487], label: '3180' },
    { position: [-37.807452, 145.02895], label: '3662' },
    { position: [-37.836009, 145.09821], label: '3682' },
    { position: [-37.853330, 145.09512], label: '3685' },
    { position: [-37.832129, 145.06367], label: '3804' },
    { position: [-37.836016, 145.06217], label: '3812' },
    { position: [-37.793422, 145.06217], label: '4030' },
    { position: [-37.800782, 145.06253], label: '4032' },
    { position: [-37.810383, 145.06071], label: '4034' },
    { position: [-37.817341, 145.05926], label: '4035' },
    { position: [-37.810383, 145.05668], label: '4040' },
    { position: [-37.845688, 145.05396], label: '4043' },
    { position: [-37.792532, 145.07044], label: '4051' },
    { position: [-37.8049687, 145.0817598],label: '4057' },
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

  const handleMarkerClick = (label, position) => {
    if (selecting && !start) {
      setStart({ label, position });
      setStatusMessage('Now select your destination.');
    } else if (start && !target) {
      setTarget({ label, position });
      setSelecting(false);
      setStatusMessage('Start and destination selected! Click Submit to send.');
    }
  };

  const handleJourneyStart = () => {
    setStart(null);
    setTarget(null);
    setPathCoordinates([]);
    setPathCost(null);
    setSelecting(true);
    setStatusMessage('Please select your start point.');
  };

  const handleSubmit = async () => {
    if (start && target) {
      const dateTimeNow = new Date().toISOString();
      try {
        const response = await fetch('http://localhost:8000/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ start: start.label, target: target.label, datetime: dateTimeNow }),
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        console.log('Path Cost:', data.path_cost);
        console.log('Path:', data.path);

        // Set the path cost and map SCATS IDs to positions
        setPathCost(data.path_cost);
        const newPathCoordinates = data.path.map(scatsId => {
          const match = positionsWithLabels.find(item => item.label === scatsId.toString());
          return match ? match.position : null;
        }).filter(Boolean);

        setPathCoordinates(newPathCoordinates);
      } catch (error) {
        console.error('Error fetching journey data:', error);
      }
    } else {
      alert('Please select both a start and a destination.');
    }
  };

  const getMarkerColor = (label) => {
    if (start && label === start.label) return 'red';
    if (target && label === target.label) return 'green';
    return 'blue';
  };

  return (
    <>
      <div style={{ margin: '20px' }}>
        <button onClick={handleJourneyStart}>Start Journey</button>
        {start && target && <button onClick={handleSubmit}>Submit</button>}
        <p>{statusMessage}</p>
      </div>

      <MapContainer center={[-37.8238567, 145.0643933]} zoom={13} scrollWheelZoom={false} style={{ height: '100vh', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {positionsWithLabels.map((item, index) => (
          <Marker
            key={index}
            position={item.position}
            eventHandlers={{
              click: () => handleMarkerClick(item.label, item.position),
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
            <Popup>{item.label}</Popup>
          </Marker>
        ))}
        {pathCoordinates.length > 0 && (
          <Polyline positions={pathCoordinates} color="blue" />
        )}
      </MapContainer>

      {pathCost && (
        <div style={{ margin: '20px' }}>
          <strong>Path Cost:</strong> {pathCost} seconds
        </div>
      )}
    </>
  );
};

export default MyMap;
