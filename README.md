# SCATS Route Finder

This project is a web application that allows users to select SCATS (Sydney Coordinated Adaptive Traffic System) locations on a map, calculate the shortest path between selected points, and view alternate routes. The application consists of a backend server built with FastAPI and a frontend developed with React and Leaflet.

## Table of Contents
- [Features](#features)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Setup Instructions](#setup-instructions)
- [Running the Application](#running-the-application)
- [How to use the front end](#How-to-use-the-front-end)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features
- **Interactive Map**: Users can select start and end SCATS locations on a map.
- **Shortest Path Calculation**: Calculates the optimal route based on selected SCATS points.
- **Alternate Routes**: Displays alternative routes if they differ from the optimal path.
- **Travel Time Calculation**: Provides estimated travel time for each route.
- **Error Handling**: Displays error messages for invalid inputs.

## Project Structure
- **Backend (FastAPI)**: Handles route calculations and provides data to the frontend.
  - `tfpd.py` - Main backend file containing API endpoints.
- **Frontend (React)**: Displays an interactive map and interfaces with the backend.
  - `App.js` - Primary React component for map display and route selection.

## Requirements
### Prerequisites
- **Python**: Version 3.8 or higher
- **Node.js**: Version 14 or higher (includes `npm`)

### Dependencies
All required dependencies are listed in `requirements.txt` for Python and `package.json` for Node.

## Setup Instructions

1. Unzip the Zip file to your local directory

2. Install Backend (Python) Dependencies

    Navigate to the backend directory where tfpd.py is located and install the required Python packages:

        pip install -r requirements.txt

3. Install Frontend (Node.js) Dependencies

    Navigate to the frontend directory where App.js is located and install the necessary Node.js packages:

        npm install

### Running the Application
1. Start the Backend Server

    Run the following command to start the FastAPI server, which will be available at http://localhost:8000:

        uvicorn tfpd:app --host 0.0.0.0 --port 8000

2. Start the Frontend Application

    In a new terminal, start the React development server. This will open the application at http://localhost:3000:

        npm start



# How to use Use the front end
Selecting Start and End Points

    Select Start Point: Click on a marker to set it as the starting location.
    Select End Point: Click on a second marker to set it as the destination.

Calculating Routes

    Calculate Shortest Path: Click Submit to calculate the optimal route between the selected points.
    Display Alternate Routes: Click Get Alternate Paths to view unique alternate routes.

Viewing Results

    Optimal Route: The shortest path will be displayed in blue.
    Alternate Routes: Unique alternate paths (if available) are displayed in other colors. If an alternate path matches the optimal path, it won’t be displayed.
    Travel Times: Estimated travel times for each route are shown below the map.

Configuration

To customize the application (e.g., server port, map settings):

    Backend Port: Adjust the uvicorn command to change the server port.
    Frontend: Modify App.js for map configurations like center coordinates, zoom levels, etc.

## Troubleshooting
### Common Issues

Backend Server Not Running: 

    Ensure uvicorn is running with tfpd:app in the backend directory.

Network Errors: 

    If http://localhost:8000 fails, verify that both frontend and backend are on the same network or adjust URLs accordingly.
Missing Dependencies: 
       
    Run pip install -r requirements.txt for Python dependencies and npm install for Node dependencies.

If nothing works, Contact one of the team members via email: 
104316170@student.swin.edu.au
104454504@student.swin.edu.au
103988905@student.swin.edu.au