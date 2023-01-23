// imports
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
const CACHE_TIMING = 15; // min

app.get('/', async (req, res) => {
  let page = req.query.page;
  let size = req.query.size;
  let city = req.query.city
  let isRangeGiven = !(!page || !size);
  let isCityGiven = !!city;

  let reqCities = []

  if (isRangeGiven || !(isRangeGiven || isCityGiven)) {
    if (isRangeGiven) {
      if ((isNaN(page) || isNaN(size))) {
        error(`invalid_query`, res)
        return;
      }
      page = parseInt(page);
      size = parseInt(size);

      if (size > idealSize) {
        error(`ideal_page_size exceeded (${idealSize})`, res);
        return;
      }
      if (page > (cities.length / idealSize)) {
        error(`page_limit_exceeded (${Math.ceil(cities.length / idealSize)-1})`, res);
        return;
      }
    }

    const start = isRangeGiven ? page * idealSize : 0;
    const end = isRangeGiven ? start + size : idealSize - 1;
    reqCities = cities.slice(start, end);
  }

  else if (isCityGiven) {
    if (!cities.includes(city.toLowerCase())) {
      error('not_found', res);
      return;
    }
    reqCities = [city];
  }

  const weatherDataCollected = {};
  for (let reqCity of reqCities) {
    if (!(await rc.exists(reqCity))) {
      const data = (await axios.request(generateOptions(reqCity))).data;
      weatherDataCollected[reqCity] = {
        coord: data.coord,
        temp: data.main.temp,
        temp_max: data.main.temp_max,
        temp_min: data.main.temp_min,
        weather: data.weather[0].description,
        weather_icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`
      }
      rc.setEx(reqCity, CACHE_TIMING*60, JSON.stringify(weatherDataCollected[reqCity]));
    } else {
      weatherDataCollected[reqCity] = JSON.parse(await rc.get(reqCity));
    }
  }

  res.header("Access-Control-Allow-Origin", "*");
  res.status(200).json(weatherDataCollected);
});

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
