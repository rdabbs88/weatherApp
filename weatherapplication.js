"use strict";

process.stdin.setEncoding("utf8");
const express = require("express");
const path = require("path");
require("dotenv").config();
const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.o8lg7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const databaseName = process.env.MONGO_DB_NAME;
const collectionName = process.env.MONGO_COLLECTION;
const bodyParser = require("body-parser");
const app = express();

const BASE_URL = "http://api.weatherstack.com/current";
const UNIT = "f";

const portNumber = 3000;

const { MongoClient, ServerApiVersion } = require('mongodb');
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
const prompt = "Stop to shutdown the server: ";

async function connectToMongoDB() {
    try {
        await client.connect();
    } catch (e) {
        console.log("Failed connecting to MongoDB");
    }
}

connectToMongoDB();

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

/* Initializes request.body with post information */ 
app.use(bodyParser.urlencoded({extended:false}));

app.use(express.static(path.join(__dirname, 'public')));


// Function to fetch weather data for a given location
async function getWeather(zip) {
    
    //let temperature, city, state, windSpeed, weatherDescription, feelsLike, localTime;

    try {
      const response = await fetch(`${BASE_URL}?access_key=${process.env.API_KEY}&query=${zip}&units=${UNIT}`);
      const data = await response.json();
      console.log("\nMake API request to WeatherStack");
      // check if the API request was 
      console.log(response.ok);
      if (response.ok) {
        console.log(data.success);
        console.log(data.error);
        if (data.error) {
            console.error(`API Error: ${data.error.type} - ${data.error.info}`);
            return -1;
        }
        console.log("API Request Successful");
        console.log("Response successful");
        const temperature = data.current.temperature;
        const city = data.location.name;
        const state = data.location.region;
        const windSpeed = data.current.wind_speed;
        const weatherDescription = data.current.weather_descriptions;
        const feelsLike = data.current.feelslike;
        const weather_icons = data.current.weather_icons;

        return {
            "temperature": temperature,
            "city": city, 
            "state": state,
            "windSpeed": windSpeed,
            "weatherDescription": weatherDescription,
            "feelsLike": feelsLike,
            "weather_icons": weather_icons,
            "zip": zip
        };

      }
      else {   // if API request for zip code didn't work (invalid ZIP)
        console.log("response.ok returned false");
        return -1;
      }
    } 
    catch (error) {
        console.log("ENTERED CATCH");

        if (data.error.type === "rate_limit_reached") {
            console.log("API limit reached");
        }
        //console.error("Error:", error);
        return -1;
    }
  }

// Project routing below

// GET request to our index page
app.get("/", (request, response) => {
    response.render("index");
});

app.get("/search", (request, response) => {
    response.render("search");
});

app.post("/searchresults", async (request, response) => {

    const {zip} = request.body;

    // call getWeather function to make a request to the API to grab the data we need
    if (zip.length !== 5) {
        response.render("ziperror", {"errorMessage": `${zip} has an invalid zip code length`});
    }
    const weatherDataObj = await getWeather(zip);

    if (weatherDataObj == -1) {
        response.render("ziperror", {"errorMessage": `${zip} is an invalid zip code`});
    }
    else {
        console.log(`Weather in ${zip}: ${weatherDataObj.temperature}`);
        console.log(`city: ${weatherDataObj.city}`);
        console.log(`state: ${weatherDataObj.state}`);
        console.log(`Wind speed: ${weatherDataObj.windSpeed}`);
        console.log(`Weather Description: ${weatherDataObj.weatherDescription}`);
        console.log(`Feels Like: ${weatherDataObj.feelsLike}`);
        console.log(`Weather Icons: ${weatherDataObj.weather_icons}`);
        console.log(`Zip: ${weatherDataObj.zip}`);
        response.render("searchresults", weatherDataObj);
    }
});

app.get("/add", (request, response) => {
    response.render("add");
});

app.get("/watchlist", (request, response) => {
    response.render("watchlist");
});

app.get("/delete", (request, response) => {
    response.render("delete");
});

app.listen(portNumber, (err) => {
    if (err) {
      console.log("Starting server failed.");
    } else {
      console.log(`Web server started and running at http://localhost:${portNumber}`);
      process.stdout.write(prompt);
    }
});

process.stdin.on("readable", async function () {
    const dataInput = process.stdin.read();
    const command = dataInput.trim();
    if (command.toLowerCase() === "stop") {
        await client.close();
        process.stdout.write("Shutting down the server");
        process.exit(0);
    }
    else {
        console.log(`Invalid command: ${command}`);
    }

    process.stdout.write(prompt);
    process.stdin.resume();
});