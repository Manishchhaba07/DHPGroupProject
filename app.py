from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pandas as pd
# import os

# Initialize Flask app
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)  # Enable CORS

# ========== PAGE ROUTES ==========

@app.route('/')
def home():
    return send_from_directory('static/html', 'enhanced_index.html')

@app.route('/compare')
def compare_page():
    return send_from_directory('static/html', 'enhanced_compare.html')

@app.route('/trends')
def trends():
    return send_from_directory('static/html', 'enhanced_trends.html')

@app.route('/graphs')
def open_graphs():
    return send_from_directory('static/html', 'graphs.html')

@app.route('/ranking')
def ranking():
    return send_from_directory('static/html', 'ranking.html')

@app.route('/insights')
def insights():
    return send_from_directory('static/html', 'insights.html')

# Export data route has been removed as requested

@app.route('/city-view')
def city_view():
    return send_from_directory('static/html', 'city_view.html')

@app.route('/about')
def about():
    return send_from_directory('static/html', 'about.html')

# ========== API ROUTES ==========

@app.route('/api/indian-cities')
def indian_cities():
    try:
        df = pd.read_csv('static/data/updated_polluted_cities_with_coordinates.csv')
        
        # Filter for Indian cities (where State is not null and is a state in India)
        india_cities = df[df['State'].notna()]
        
        # Calculate average AQI across all months
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        india_cities['avg_aqi'] = india_cities[months].apply(
            lambda x: x.replace('--', '0').astype(float).mean(), axis=1
        )
        
        # Sort by average AQI in descending order
        india_cities = india_cities.sort_values(by='avg_aqi', ascending=False)
        
        # Extract top 15 cities
        top_cities = []
        for _, row in india_cities.head(15).iterrows():
            # Create monthly data dictionary
            monthly_data = {}
            for month in months:
                val = row[month]
                if val == '--' or pd.isna(val):
                    monthly_data[month] = None
                else:
                    monthly_data[month] = float(val)
            
            top_cities.append({
                'city': row['City'],
                'state': row['State'],
                'avg_aqi': round(float(row['avg_aqi']), 1),
                'monthly_data': monthly_data,
                'lat': float(row['Latitude']) if pd.notna(row['Latitude']) else None,
                'lon': float(row['Longitude']) if pd.notna(row['Longitude']) else None
            })
        
        return jsonify(top_cities)
    except Exception as e:
        print(f"Error fetching Indian cities data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/country-trends')
def country_trends():
    try:
        print("Loading country trends data from CSV...")
        df = pd.read_csv('static/data/polluted_COUNTRIES.csv')
        trends_data = []
        
        for index, row in df.iterrows():
            # Handle non-numeric values in year columns
            years_data = []
            for year in ['2024', '2023', '2022', '2021', '2020', '2019', '2018']:
                try:
                    if pd.notna(row[year]) and row[year] != 0:
                        years_data.append(float(row[year]))
                    else:
                        years_data.append(None)
                except:
                    years_data.append(None)
            
            trends_data.append({
                'rank': int(row['Rank']) if pd.notna(row['Rank']) else None,
                'country': row['Country'],
                'years': years_data,
                'population': int(row['Population']) if pd.notna(row['Population']) else None
            })
        
        print(f"Successfully processed {len(trends_data)} countries")
        response = jsonify(trends_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
    except Exception as e:
        print(f"Error in country_trends API: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/country-graph-data')
def country_graph_data():
    df = pd.read_csv('static/data/polluted_COUNTRIES.csv')
    graph_data = []
    
    for _, row in df.iterrows():
        years_data = []
        for year in ['2024', '2023', '2022', '2021', '2020', '2019', '2018']:
            try:
                if pd.notna(row[year]) and row[year] != 0:
                    years_data.append(float(row[year]))
                else:
                    years_data.append(None)
            except:
                years_data.append(None)
        
        graph_data.append({
            'country': row['Country'],
            'years': years_data,
            'population': int(row['Population']) if pd.notna(row['Population']) else None
        })
    
    return jsonify(graph_data)

@app.route('/api/city-aqi')
def city_aqi():
    month = request.args.get('month', 'Jan').capitalize()
    df = pd.read_csv('static/data/updated_polluted_cities_with_coordinates.csv')

    if month not in df.columns:
        return jsonify([])

    results = []
    for _, row in df.iterrows():
        try:
            if pd.notna(row['Latitude']) and pd.notna(row['Longitude']):
                aqi_value = row[month]
                # skip invalid or '--' or NaN or empty
                if pd.notna(aqi_value) and str(aqi_value).strip() not in ['', '--']:
                    numeric_value = float(aqi_value)
                    if numeric_value > 0:
                        results.append({
                            "city": row['City'],
                            "state": row['State'],
                            "aqi": round(numeric_value, 1),
                            "lat": float(row['Latitude']),
                            "lon": float(row['Longitude'])
                        })
        except:
            continue

    return jsonify(results)

@app.route('/api/ranking-data')
def ranking_data():
    df = pd.read_csv('static/data/polluted_COUNTRIES.csv')
    
    # Sort by 2024 AQI values in descending order
    df = df.sort_values(by='2024', ascending=False)
    
    ranking_list = []
    for _, row in df.iterrows():
        aqi_2024 = float(row['2024']) if pd.notna(row['2024']) and row['2024'] != 0 else None
        
        if aqi_2024 is not None:
            ranking_list.append({
                'rank': int(row['Rank']),
                'country': row['Country'],
                'aqi': aqi_2024,
                'population': int(row['Population']) if pd.notna(row['Population']) else None
            })
    
    return jsonify(ranking_list)

@app.route('/api/top-cities')
def top_cities():
    df = pd.read_csv('static/data/updated_polluted_cities_with_coordinates.csv')
    
    # Calculate average AQI across all months
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    df['avg_aqi'] = df[months].apply(lambda x: x.replace('--', '0').astype(float).mean(), axis=1)
    
    # Sort by average AQI in descending order and take top 50
    df = df.sort_values(by='avg_aqi', ascending=False).head(50)
    
    cities_list = []
    for _, row in df.iterrows():
        cities_list.append({
            'city': row['City'],
            'state': row['State'],
            'avg_aqi': round(row['avg_aqi'], 1),
            'months_data': {month: float(row[month]) if pd.notna(row[month]) and row[month] != '--' else None for month in months}
        })
    
    return jsonify(cities_list)

@app.route('/api/insights-data')
def insights_data():
    countries_df = pd.read_csv('static/data/polluted_COUNTRIES.csv')
    cities_df = pd.read_csv('static/data/updated_polluted_cities_with_coordinates.csv')
    
    # Calculate average AQI by month across all cities
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    monthly_avg = {}
    for month in months:
        values = cities_df[month].replace('--', '0').astype(float)
        monthly_avg[month] = round(values[values > 0].mean(), 2)
    
    # Get top 5 countries by 2024 AQI
    top_countries = countries_df.sort_values(by='2024', ascending=False).head(5)
    top_countries_list = [{"country": row['Country'], "aqi": float(row['2024'])} 
                          for _, row in top_countries.iterrows()]
    
    # Get bottom 5 countries by 2024 AQI
    bottom_countries = countries_df[countries_df['2024'] > 0].sort_values(by='2024').head(5)
    bottom_countries_list = [{"country": row['Country'], "aqi": float(row['2024'])} 
                            for _, row in bottom_countries.iterrows()]
    
    insights = {
        'monthly_averages': monthly_avg,
        'top_polluted_countries': top_countries_list,
        'least_polluted_countries': bottom_countries_list
    }
    
    return jsonify(insights)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
