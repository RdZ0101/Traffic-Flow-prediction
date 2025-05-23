import math
import datetime
import warnings
import numpy as np
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from keras.models import load_model
from tensorflow.keras.utils import plot_model
from sklearn.preprocessing import StandardScaler, MinMaxScaler
import os
from geopy.distance import geodesic
import heapq
from keras.src.legacy.saving import legacy_h5_format
from fastapi.middleware.cors import CORSMiddleware
# FastAPI application setup
app = FastAPI()

# CORS middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

warnings.filterwarnings("ignore")

# Data model for the POST request
class JourneyRequest(BaseModel):
    start: str
    target: str
    datetime: datetime.datetime

class AlternatePathRequest(BaseModel):
    start_scats: int
    target_scats: int
    date_time: Optional[datetime.datetime] = None
    num_paths: int = 2

# New endpoint for finding alternate paths
@app.post("/find_alternate_paths")
async def find_alternate_paths_endpoint(request: AlternatePathRequest):
    paths = find_alternate_paths(request.start_scats, request.target_scats, request.date_time, request.num_paths)
    # Formatting response
    formatted_paths = [{"path_cost": cost, "path": path} for cost, path in paths]
    return {"alternate_paths": formatted_paths}

# Node class for graph pathfinding
class Node():
    def __init__(self, lat, long, neighbors):
        self.cost = 99999 # cost to reach this node from start node
        self.lat = lat # latitude of node (for dist calculations)
        self.long = long # longitude of node (for dist calculations)
        self.prev = -1 # scats number of previous node
        self.neighbors = neighbors # scats numbers of neighbors in list form


# POST endpoint to evaluate journey
@app.post("/evaluate")
async def evaluate_route(journey_request: JourneyRequest):
    print(f"Received Start SCATS: {journey_request.start}, Target SCATS: {journey_request.target}")
    path_cost, path = evaluate(journey_request.start, journey_request.target, journey_request.datetime)
    return {"path_cost": path_cost, "path": path}

# Node class for graph pathfinding
class Node():
    def __init__(self, lat, long, neighbors):
        self.cost = 99999 # cost to reach this node from start node
        self.lat = lat # latitude of node (for dist calculations)
        self.long = long # longitude of node (for dist calculations)
        self.prev = -1 # scats number of previous node
        self.neighbors = neighbors # scats numbers of neighbors in list form


# helper functions
# needed to reconstruct scaler... we should save scalers :(
def process_data(train, test, lags):
    """Process data
    Reshape and split train\test data.

    # Arguments
        train: String, name of .csv train file.
        test: String, name of .csv test file.
        lags: integer, time lag.
    # Returns
        X_train: ndarray.
        y_train: ndarray.
        X_test: ndarray.
        y_test: ndarray.
        scaler: StandardScaler.
    """
    attr = 'VFlow'
    df1 = pd.read_csv(train, encoding='utf-8').fillna(0)
    df2 = pd.read_csv(test, encoding='utf-8').fillna(0)

    # scaler = StandardScaler().fit(df1[attr].values)
    scaler = MinMaxScaler(feature_range=(0, 1)).fit(df1[attr].values.reshape(-1, 1))
    flow1 = scaler.transform(df1[attr].values.reshape(-1, 1)).reshape(1, -1)[0]
    flow2 = scaler.transform(df2[attr].values.reshape(-1, 1)).reshape(1, -1)[0]

    train, test = [], []
    for i in range(lags, len(flow1)):
        train.append(flow1[i - lags: i + 1])
    for i in range(lags, len(flow2)):
        test.append(flow2[i - lags: i + 1])

    train = np.array(train)
    test = np.array(test)
    np.random.shuffle(train)

    X_train = train[:, :-1]
    y_train = train[:, -1]
    X_test = test[:, :-1]
    y_test = test[:, -1]

    return X_train, y_train, X_test, y_test, scaler

# input: x (float) = vflow per hour
# output: float = speed limit or speed calculated from flow, whichever lower
def get_speed_from_flow_per_hr(x):   
    # v = inflection speed, aka average kmh when road is at vflow q
    v = 32
    # q = inflection point, where speed converges for given vflow when road is over or under capacity
    q = 1500

    # note: for this assignment, i believe we are always assuming
    # roads are under capacity. thus this is just a high number
    road_capacity = 9999
    
    a = -(q/(v*v))
    b = -2*v*a

    # use this when road is over capacity (x >= q)
    # this means speed decreases given lower vflow
    if x >= road_capacity:
        speed_from_flow = (-b + math.sqrt(b*b + 4*a*x)) / (2*a)
    # use this when road is under capacity (x < q)
    # this means speed increases given lower vflow
    else:
        speed_from_flow = (-b - math.sqrt(b*b + 4*a*x)) / (2*a)

    # assumed speed limit of 60kmh
    speed_limit = 60
    return min(speed_limit, speed_from_flow)


# returns: predicted value, model to cache, scaler to cache
def get_est_vflow_for_intersection(scats, lag_flow, cache_model, cache_scaler):
    if cache_model is False:
        model_variant = 'sae'
        model = load_model(f"model/{model_variant}/{scats}/{model_variant}_{scats}.h5", custom_objects={'mse': 'mse'})
    else:
        model = cache_model

    if cache_scaler is False:
        lag = 12
        
        train_folder = 'intersection/train/'
        test_folder = 'intersection/test/'
    
        train_file = os.path.join(train_folder, f'train_{scats}.csv')
        test_file = os.path.join(test_folder, f"test_{scats}.csv")
    
        _, _, X_test, y_test, scaler = process_data(train_file, test_file, lag)
    else:
        scaler = cache_scaler

    lag_flow = scaler.transform(lag_flow)
    lag_flow_reshaped = np.array([lag_flow])
    
    predicted = model.predict(lag_flow_reshaped, verbose=0)
    predicted = scaler.inverse_transform(predicted.reshape(-1, 1)).reshape(1, -1)[0]

    return predicted, model, scaler


# put lat,long of intersection 1 and 2 respectively here
def calculate_distance_for_coords(lat1, lon1, lat2, lon2):
    return geodesic((lat1, lon1), (lat2, lon2)).meters
    
    
# parse d/MM/YYYY format (present in SCATS data) to DateTime
def parse_date(date_string):
    split = date_string.split('/')

    if len(split) != 3:
        print(f"invalid date format: {date_string}")

    day = int(split[0])
    month = int(split[1])
    year = int(split[2])

    return datetime.datetime(year, month, day)


# returns string such as 'V01' or 'V93' given n=1 or n=93
def append_v(n):
    n = int(n)
    if n < 10:
        column_name = "V0" + str(n)
    else:
        column_name = "V" + str(n)
        
    return column_name


# df - pandas DataFrame: scats dataframe file
# scats - int: scats number of intersection
# lag - int: number of previous time intervals to append
# weekday - int: day of week from 0-6 (0=Mon, 6=Sun)
# time - int: time of day in minutes (0 = 12:00am, 60 = 1:00am, 720 = 12:00pm, 1439 = 11:59pm, etc.)
def get_average_lag(df, scats, lag, weekday, time):
    V_INTERVAL = 15 # interval of data in minutes
    V_MAX = int(1440 / V_INTERVAL) - 1 # 1440 = minutes a day, subtract 1 for zero indexing
    
    intersection_df = df[df['SCATS Number'] == scats]

    while time >= 1440:
        time -= 1440
        weekday += 1
        if weekday > 6:
            weekday = 0
    
    v_base = int(math.floor(time / V_INTERVAL))

    lags = []
    
    for i in range(0, lag):
        cur_weekday = weekday
        v = v_base - (lag - i)        
        if v < 0:
            v = V_MAX + v + 1 # add 1 as -1 should wrap around to V_MAX, not V_MAX-1
            cur_weekday = weekday - 1 # wrap around to previous weekday
            if cur_weekday < 0:
                cur_weekday = 6 # wrap back to Sunday if we were on Monday

        time_lags_total = 0
        time_lags_count = 0
        for index, row in intersection_df.iterrows():
            date_of = parse_date(row['Date'])
            if date_of.weekday() is not cur_weekday:
                continue

            flow_for_day = row[append_v(v)]
            time_lags_total += flow_for_day
            time_lags_count += 1

        if time_lags_count <= 0:
            print("invalid data? didn't find any data for lag period")
            continue

        lags.append([time_lags_total / time_lags_count])

    return lags

cache = {}

def evaluate(scats_start, scats_target, date_time):
    scats_neighbors_file = 'data/scats_neighbors.csv'

    scats_data_file = 'scats-10-2006.csv'
    scats_data = pd.read_csv(scats_data_file)

    # using djikstra's
    # load intersections
    scats_sites = pd.read_csv(scats_neighbors_file)

    neighbor_cols = ['North Neighbor', 'Northeast Neighbor', 'East Neighbor', 
    'Southeast Neighbor', 'South Neighbor' ,'Southwest Neighbor',
    'West Neighbor', 'Northwest Neighbor']

    for neighbor_dir in neighbor_cols:
        # scats sites can't be negative, so set NaNs to -1
        scats_sites[neighbor_dir].fillna(-1, inplace=True)
    
    start_scats = int(scats_start)
    target_scats = int(scats_target)
    time = datetime.datetime.now()

    base_sec_time = (time - time.replace(hour=0, minute=0, second=0, microsecond=0)).total_seconds()
    weekday = time.weekday()

    start_intersection = scats_sites[scats_sites['SCAT number'] == start_scats]

    def construct_node(pd_row):
        neighbors = []
        
        for neighbor_dir in neighbor_cols:
            neighbor = pd_row[neighbor_dir].item()
            if neighbor > 0:
                neighbors.append(int(neighbor))

        return Node(pd_row['NB_Latitude'], pd_row['NB_Longitude'], neighbors)


    graph = {}
    queue = []

    # construct graph of all nodes
    for index, row in scats_sites.iterrows():
        scats_num = int(row['SCAT number'])
        graph[scats_num] = construct_node(scats_sites.iloc[index])
        queue.append(scats_num)

    # set start node cost to 0
    graph[start_scats].cost = 0
    path_cost = -1

    while queue:
        # get vertex in queue with minimum cost value
        min_cost, min_scats = 99999, -1
        for i in queue:
            node = graph[i]
            if node.cost < min_cost:
                min_cost = node.cost
                min_scats = i
                
        u = min_scats
        u_node = graph[u]
        
        if u == target_scats:
            path_cost = int(u_node.cost)
            break
        
        queue.remove(min_scats)

        for v in u_node.neighbors:
            v_node = graph[v]

            # distance = cost heuristic (travel time between the two intersections)
            # divide by 1000 as output is in meters
            distance = calculate_distance_for_coords(u_node.lat, u_node.long, v_node.lat, v_node.long) / 1000

            cost_in_minutes = int(u_node.cost / 60)
            cur_time = int(base_sec_time + cost_in_minutes)
            lags_data = get_average_lag(scats_data, v, 12, weekday, cur_time)
            lags_data = np.array(lags_data)

            if v in cache:
                cached = cache[v]
                model_output, _, _ = get_est_vflow_for_intersection(v, lags_data, cached[0], cached[1])
            else:
                model_output, model_to_cache, scaler_to_cache = get_est_vflow_for_intersection(v, lags_data, False, False)
                cache[v] = (model_to_cache, scaler_to_cache)

            vflow = model_output[0]

            # multiply by 4 to get flow per hour from flow per 15 mins
            y = get_speed_from_flow_per_hr(vflow * 4)

            # cost = travel time to this node in seconds from start
            # convert from hours to seconds (y is in kmh) then
            # add 30 seconds for assumption iii
            cost = (distance / y) * 60 * 60 + 30
            
            alt = u_node.cost + cost
            if alt < v_node.cost:
                v_node.cost = alt
                v_node.prev = u

    path = [u]
    prevy = u_node.prev
    while prevy > 0:
        path.insert(0, prevy)
        prevy = graph[prevy].prev
    print(path)
    return path_cost, path

def find_alternate_paths(start_scats, target_scats, date_time, num_paths=2):
    scats_neighbors_file = 'data/scats_neighbors.csv'
    scats_data_file = 'scats-10-2006.csv'
    scats_data = pd.read_csv(scats_data_file)
    scats_sites = pd.read_csv(scats_neighbors_file)

    neighbor_cols = ['North Neighbor', 'Northeast Neighbor', 'East Neighbor', 
                     'Southeast Neighbor', 'South Neighbor', 'Southwest Neighbor',
                     'West Neighbor', 'Northwest Neighbor']

    for neighbor_dir in neighbor_cols:
        scats_sites[neighbor_dir].fillna(-1, inplace=True)
    def construct_node(pd_row):
        neighbors = []
        
        for neighbor_dir in neighbor_cols:
            neighbor = pd_row[neighbor_dir].item()
            if neighbor > 0:
                neighbors.append(int(neighbor))

        return Node(pd_row['NB_Latitude'], pd_row['NB_Longitude'], neighbors)

    graph = {}
    for index, row in scats_sites.iterrows():
        scats_num = int(row['SCAT number'])
        graph[scats_num] = construct_node(scats_sites.iloc[index])

    paths = []
    blocked_edges = set()

    for _ in range(num_paths):
        path, path_cost = a_star_path(graph, start_scats, target_scats, blocked_edges, scats_data)

        if path:
            paths.append((path_cost, path))

            # Block edges along this path to encourage alternate routes
            for i in range(len(path) - 1):
                blocked_edges.add((path[i], path[i + 1]))
        else:
            break
    print(paths)
    return paths

def a_star_path(graph, start, goal, blocked_edges, scats_data):
    open_set = [(0, start)]
    came_from = {}
    g_score = {node: float('inf') for node in graph}
    g_score[start] = 0
    f_score = {node: float('inf') for node in graph}
    f_score[start] = heuristic_cost(graph[start], graph[goal])

    while open_set:
        current_f, current = heapq.heappop(open_set)

        if current == goal:
            return reconstruct_path(came_from, current), g_score[goal]

        current_node = graph[current]

        for neighbor in current_node.neighbors:
            if (current, neighbor) in blocked_edges or (neighbor, current) in blocked_edges:
                continue

            neighbor_node = graph[neighbor]
            distance = calculate_distance_for_coords(current_node.lat, current_node.long, neighbor_node.lat, neighbor_node.long) / 1000

            # Calculate flow and speed for accurate cost calculation
            lag_data = get_average_lag(scats_data, neighbor, 12, datetime.datetime.now().weekday(), datetime.datetime.now().minute * 60)
            lag_data = np.array(lag_data)
            vflow = get_est_vflow_for_intersection(neighbor, lag_data, False, False)[0][0]
            speed = get_speed_from_flow_per_hr(vflow * 4)  # Convert vflow to hourly flow

            # Cost in seconds, including distance-to-speed conversion and additional delay
            cost = (distance / speed) * 3600 + 30
            tentative_g_score = g_score[current] + cost

            if tentative_g_score < g_score[neighbor]:
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g_score
                f_score[neighbor] = tentative_g_score + heuristic_cost(neighbor_node, graph[goal])
                heapq.heappush(open_set, (f_score[neighbor], neighbor))

    return None, float('inf')


def heuristic_cost(node1, node2):
    return calculate_distance_for_coords(node1.lat, node1.long, node2.lat, node2.long) / 1000

def reconstruct_path(came_from, current):
    path = [current]
    while current in came_from:
        current = came_from[current]
        path.insert(0, current)
    return path


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)