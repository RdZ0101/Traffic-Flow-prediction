import math
import datetime
import warnings
import numpy as np
import pandas as pd
from keras.models import load_model
from tensorflow.keras.utils import plot_model
from sklearn.preprocessing import StandardScaler, MinMaxScaler
import os
from geopy.distance import geodesic
from keras.src.legacy.saving import legacy_h5_format


warnings.filterwarnings("ignore")


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
        model_variant = 'gru'
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
    
    start_scats = 970
    target_scats = 3180
    time = datetime.datetime.now()

    #base_sec_time = (time - time.replace(hour=0, minute=0, second=0, microsecond=0)).total_seconds()
    base_sec_time = 1080
    weekday = time.weekday()

    start_intersection = scats_sites[scats_sites['SCAT number'] == start_scats]

    def construct_node(pd_row):
        neighbors = []
        
        for neighbor_dir in neighbor_cols:
            neighbor = pd_row[neighbor_dir].item()
            if neighbor > 0:
                neighbors.append(int(neighbor))

        return Node(pd_row['NB_Latitude'], pd_row['NB_Longitude'], neighbors)

    cache = {}

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

    return [(path_cost, path)]