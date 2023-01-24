const express = require('express');
const app = express()
const axios = require("axios");
const redis = require('redis');
const data = require('./data.json');

// configurations
require('dotenv').config();
const rc = redis.createClient({
  url: process.env.REDIS
});
rc.connect();
rc.on('error', (err) => console.error('Redis Error: ', err));

// default data
const cities = data.cities;
const idealSize = 10;
const CACHE_TIMING = 15; // minutes

app.get('/', async (req, res) => {
  let page = req.query.page;
  let size = req.query.size;
  let city = req.query.city
  let isRangeGiven = !(!page || !size); // page details
  let isCityGiven = !!city; // city details

  // requested cities: subset of the 30 cities
  let reqCities = []

  // Exec this block if page details or no details are provided.
  // Use default page settings when neither city nor page query is given (page:0 size:10).
  if (isRangeGiven || !(isRangeGiven || isCityGiven)) {
    
    // for page details
    if (isRangeGiven) {
      
      // handling all the errors
      if ((isNaN(page) || isNaN(size))) {
        error(`invalid_query`, res)
        return;
      }
      page = parseInt(page);
      size = parseInt(size);

      if (size > idealSize) {
        error(`ideal_page_size_exceeded (${idealSize})`, res);
        return;
      }
      if (page > (cities.length / idealSize)) {
        error(`page_limit_exceeded (${Math.ceil(cities.length / idealSize)-1})`, res);
        return;
      }
    }

    // if no error then simply calculate the starting and ending index of the cities
    const start = isRangeGiven ? page * idealSize : 0;
    const end = isRangeGiven ? start + size : idealSize - 1;
    
    reqCities = cities.slice(start, end); // slice off the requested cities
  }

  // for city details
  if (isCityGiven) {
    if (!cities.includes(city.toLowerCase())) {
      error('not_found', res);
      return;
    }
    reqCities = [city];
  }

  const weatherDataCollected = {};
  
  for (let reqCity of reqCities) {
    
    // if city is not cached, fetch it (3rd party) and cache it for 15mins
    if (!(await rc.exists(reqCity))) {
      const data = (await axios.request(generateOptions(reqCity))).data;
      weatherDataCollected[reqCity] = generateWeatherObject(data);
      rc.setEx(reqCity, CACHE_TIMING*60, JSON.stringify(weatherDataCollected[reqCity]));
      
      // this will make sure that it updates the cache before its expiration
      setInterval(async () => {
        const data = (await axios.request(generateOptions(reqCity))).data;
        await rc.del(reqCity);
        rc.setEx(reqCity, CACHE_TIMING*60, JSON.stringify(generateWeatherObject(data)));
      }, (CACHE_TIMING - 1) * 60 * 1000)
      
    } else { // city is cached
      weatherDataCollected[reqCity] = JSON.parse(await rc.get(reqCity));
    }
  }

  // send json response to client
  res.header("Access-Control-Allow-Origin", "*");
  res.status(200).json(weatherDataCollected);
  res.end();
});

// get details of total_pages and ideal_size
app.get('/config', (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.status(200).json({ end_page: Math.ceil(cities.length / idealSize) - 1, ideal_size: idealSize });
  res.end();
});

// get all the cities in the db
app.get('/cities', (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.status(200).json({ all_cities: [...cities] });
  res.end();
});

function generateWeatherObject(data) {
  return {
    coord: data.coord,
    temp: data.main.temp,
    temp_max: data.main.temp_max,
    temp_min: data.main.temp_min,
    weather: data.weather[0].description,
    weather_icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`
  }
}

// generate GET options for axios
function generateOptions(city) {
  return {
    method: 'GET',
    url: `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&APPID=${process.env.API}`,
  };
}

function error(msg, res) {
  res.status(404).end(`error: ${msg}`);
}

app.listen(process.env.PORT);
