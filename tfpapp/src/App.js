import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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
  // Array with positions and labels
  const positionsWithLabels = [
    { position: [-37.8673031, 145.0915114], label: 'Position 1: SCATS Location 970' },
    { position: [-37.8519228, 145.0943244], label: 'Position 2: SCATS Location 2000' },
    { position: [-37.81654, 145.0980472], label: 'Position 3: SCATS Location 2200' },
    { position: [-37.7947848, 145.0304651], label: 'Position 4: SCATS Location 2820' },
    { position: [-37.78661, 145.06202], label: 'Position 5: SCATS Location 2825' },
    { position: [-37.7817393, 145.0773314], label: 'Position 6: SCATS Location 2827' },
    { position: [-37.8613043, 145.0578745], label: 'Position 7: SCATS Location 2846' },
    { position: [-37.8145649, 145.02221], label: 'Position 8: SCATS Location 3001' },
    { position: [-37.8151625, 145.0265725], label: 'Position 9: SCATS Location 3002' },
    { position: [-37.822895, 145.0572875], label: 'Position 10: SCATS Location 3120' },
    { position: [-37.8238567, 145.0643933], label: 'Position 11: SCATS Location 3122' },
    { position: [-37.8278467, 145.0985767], label: 'Position 12: SCATS Location 3126' },
    { position: [-37.8252267, 145.0779467], label: 'Position 13: SCATS Location 3127' },
    { position: [-37.7962133, 145.0835067], label: 'Position 14: SCATS Location 3180' },
    { position: [-37.8089525, 145.0274575], label: 'Position 15: SCATS Location 3662' },
    { position: [-37.837475, 145.0968675], label: 'Position 16: SCATS Location 3682' },
    { position: [-37.8548714, 145.0939236], label: 'Position 17: SCATS Location 3685' },
    { position: [-37.8336425, 145.0623925], label: 'Position 18: SCATS Location 3804' },
    { position: [-37.83749, 145.060865], label: 'Position 19: SCATS Location 3812' },
    { position: [-37.79533, 145.0616067], label: 'Position 20: SCATS Location 4030' },
    { position: [-37.8022975, 145.06123], label: 'Position 21: SCATS Location 4032' },
    { position: [-37.81185, 145.059405], label: 'Position 22: SCATS Location 4034' },
    { position: [-37.8181564, 145.0581226], label: 'Position 23: SCATS Location 4035' },
    { position: [-37.8328717, 145.0554233], label: 'Position 24: SCATS Location 4040' },
    { position: [-37.84716, 145.0526275], label: 'Position 25: SCATS Location 4043' },
    { position: [-37.7941433, 145.0693333], label: 'Position 26: SCATS Location 4051' },
    { position: [-37.8049687, 145.0817598], label: 'Position 27: SCATS Location 4057' },
    { position: [-37.8143725, 145.080005], label: 'Position 28: SCATS Location 4063' },
    { position: [-37.82155, 145.01503], label: 'Position 29: SCATS Location 4262' },
    { position: [-37.8230562, 145.024958], label: 'Position 30: SCATS Location 4263' },
    { position: [-37.8241054, 145.0340062], label: 'Position 31: SCATS Location 4264' },
    { position: [-37.82529, 145.04387], label: 'Position 32: SCATS Location 4266' },
    { position: [-37.8302275, 145.032815], label: 'Position 33: SCATS Location 4270' },
    { position: [-37.8318833, 145.0463933], label: 'Position 34: SCATS Location 4272' },
    { position: [-37.84659, 145.04443], label: 'Position 35: SCATS Location 4273' },
    { position: [-37.8008379, 145.049119], label: 'Position 36: SCATS Location 4321' },
    { position: [-37.8093323, 145.0368477], label: 'Position 37: SCATS Location 4324' },
    { position: [-37.806215, 145.03525], label: 'Position 38: SCATS Location 4335' },
    { position: [-37.8289133, 145.0155867], label: 'Position 39: SCATS Location 4812' },
    { position: [-37.812965, 145.00847], label: 'Position 40: SCATS Location 4821' }
  ];
  

  return (
    <MapContainer center={positionsWithLabels[0].position} zoom={13} scrollWheelZoom={false} style={{ height: "100vh", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Loop through positionsWithLabels array to create markers */}
      {positionsWithLabels.map((item, index) => (
        <Marker key={index} position={item.position}>
          <Popup>
            {item.label} <br /> Latitude: {item.position[0]}, Longitude: {item.position[1]}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MyMap;
