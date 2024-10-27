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

// Function to fetch alternate paths from the backend
async function fetchAlternatePaths(start, target, datetime, numPaths = 3) {
  try {
    const response = await fetch("http://localhost:8000/find_alternate_paths", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        start_scats: parseInt(start),  // Match the expected payload keys
        target_scats: parseInt(target),
        date_time: datetime,
        num_paths: numPaths
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Alternate paths:", data.alternate_paths);
    return data.alternate_paths;
  } catch (error) {
    console.error("Error fetching alternate paths:", error);
  }
}

const MyMap = () => {
  const [start, setStart] = useState(null);
  const [target, setTarget] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [pathCoordinates, setPathCoordinates] = useState([]);
  const [pathCost, setPathCost] = useState(null);
  const [pathLabels, setPathLabels] = useState([]);
  const [alternatePaths, setAlternatePaths] = useState([]); // State for alternate paths

  // Colors for alternative paths
  const colors = ["orange", "purple", "green"];

  const positionsWithLabels = [
    { position: [-37.865704, 145.092782], label: '970' },
    { position: [-37.850432, 145.095693], label: '2000' },
    { position: [-37.815014, 145.099383], label: '2200' },
    { position: [-37.792898, 145.031484], label: '2820' },
    { position: [-37.784762, 145.063002], label: '2825' },
    { position: [-37.780186, 145.078652], label: '2827' },
    { position: [-37.860067, 145.059063], label: '2846' },
    { position: [-37.813200, 145.023426], label: '3001' },
    { position: [-37.813657, 145.027884], label: '3002' },
    { position: [-37.821402, 145.058585], label: '3120' },
    { position: [-37.822289, 145.065691], label: '3122' },
    { position: [-37.826262, 145.099918], label: '3126' },
    { position: [-37.823763, 145.079242], label: '3127' },
    { position: [-37.794666, 145.084869], label: '3180' },
    { position: [-37.807465, 145.028910], label: '3662' },
    { position: [-37.835996, 145.098209], label: '3682' },
    { position: [-37.853343, 145.095114], label: '3685' },
    { position: [-37.832150, 145.063699], label: '3804' },
    { position: [-37.836024, 145.062179], label: '3812' },
    { position: [-37.793464, 145.063967], label: '4030' },
    { position: [-37.800795, 145.062529], label: '4032' },
    { position: [-37.810383, 145.060690], label: '4034' },
    { position: [-37.817358, 145.059325], label: '4035' },
    { position: [-37.831383, 145.056684], label: '4040' },
    { position: [-37.845713, 145.053974], label: '4043' },
    { position: [-37.792524, 145.070455], label: '4051' },
    { position: [-37.803506, 145.083143], label: '4057' },
    { position: [-37.812843, 145.081336], label: '4063' },
    { position: [-37.820108, 145.016480], label: '4262' },
    { position: [-37.821537, 145.026401], label: '4263' },
    { position: [-37.822586, 145.035347], label: '4264' },
    { position: [-37.823743, 145.044788], label: '4266' },
    { position: [-37.828746, 145.034231], label: '4270' },
    { position: [-37.830336, 145.047684], label: '4272' },
    { position: [-37.845437, 145.044991], label: '4273' },
    { position: [-37.799329, 145.050664], label: '4321' },
    { position: [-37.807709, 145.038152], label: '4324' },
    { position: [-37.804952, 145.035883], label: '4335' },
    { position: [-37.827277, 145.017032], label: '4812' },
    { position: [-37.811416, 145.009825], label: '4821' }
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
    setPathLabels([]);
    setAlternatePaths([]); // Reset alternate paths on new journey start
  };

  const handleSubmit = async () => {
    if (start && target) {
      const dateTimeNow = new Date().toISOString();
      setStatusMessage('Calculating the Shortest Path...');
      try {
        const response = await fetch('http://localhost:8000/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ start: start.label, target: target.label, datetime: dateTimeNow }),
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        setStatusMessage('Shortest Path Calculated!');
        const data = await response.json();
        console.log('Path Cost:', data.path_cost);
        console.log('Path:', data.path);

        setPathCost(data.path_cost);

        const newPathCoordinates = data.path.map(scatsId => {
          const match = positionsWithLabels.find(item => item.label === scatsId.toString());
          return match ? match.position : null;
        }).filter(Boolean);

        setPathLabels(data.path);
        setPathCoordinates(newPathCoordinates);
      } catch (error) {
        console.error('Error fetching journey data:', error);
      }
    } else {
      alert('Please select both a start and a destination.');
    }
  };

  // Fetch and display alternate paths
  const handleGetAlternatePaths = async () => {
    if (start && target) {
      const dateTimeNow = new Date().toISOString();
      const pathsData = await fetchAlternatePaths(start.label, target.label, dateTimeNow, 3);
      setStatusMessage('Calculating alternative paths..');
      if (pathsData) {
        // Filter out the first path and keep the rest
        const newAlternatePaths = pathsData.slice(1).map((pathObj, index) => {
          const coordinates = pathObj.path.map(scatsId => {
            const match = positionsWithLabels.find(item => item.label === scatsId.toString());
            return match ? match.position : null;
          }).filter(Boolean);
          
          return { 
            coordinates, 
            travelTime: (pathObj.path_cost / 60).toFixed(2), // Convert travel time to minutes
            pathLabels: pathObj.path, // Include the path labels
            color: colors[index % colors.length] // Assign color
          };
        });
  
        setAlternatePaths(newAlternatePaths);
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
        {start && target && <button onClick={handleGetAlternatePaths}>Get Alternate Paths</button>}
        <p>{statusMessage}</p>

        {pathLabels.length > 0 && (
          <div>
            <strong>Optimal Route:</strong> {pathLabels.join(' >> ')}
            <div><strong>Total Travel Time:</strong> {(pathCost / 60).toFixed(2)} minutes</div>
          </div>
        )}

        {alternatePaths.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h4>Alternate Routes</h4>
            {alternatePaths.map((pathObj, index) => (
              <div key={index} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: '15px',
                    height: '15px',
                    backgroundColor: pathObj.color,
                    marginRight: '8px',
                    borderRadius: '50%',
                  }} />
                  <strong>Route {index + 1}:</strong> {pathObj.pathLabels.join(' >> ')}
                </div>
                <div><strong>Total Travel Time:</strong> {pathObj.travelTime} minutes</div>
              </div>
            ))}
          </div>
        )}
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
        {alternatePaths.map((pathObj, index) => (
          <Polyline key={index} positions={pathObj.coordinates} color={pathObj.color} />
        ))}
      </MapContainer>
    </>
  );
};

export default MyMap;
