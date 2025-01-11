"use strict";
const http = require('http');

process.stdin.setEncoding("utf8");
const express = require("express");
const path = require("path");
require("dotenv").config();
const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.fcjz4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const databaseName = process.env.MONGO_DB_NAME;
const collectionName = process.env.MONGO_COLLECTION;
const bodyParser = require("body-parser");
const app = express();

const BASE_URL = "http://api.weatherstack.com/current";
const UNIT = "f";

const portNumber = process.env.PORT || 3000;
const server = http.createServer(app);

const { MongoClient, ServerApiVersion } = require('mongodb');
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
const prompt = "Stop to shutdown the server: ";

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
 
app.use(bodyParser.urlencoded({extended:false}));

app.use(express.static(path.join(__dirname, 'public')));


// Function to fetch weather data for a given location
async function getWeather(zip) {

    try {
      const response = await fetch(`${BASE_URL}?access_key=${process.env.API_KEY}&query=${zip}&units=${UNIT}`);
      const data = await response.json();
      // console.log("\nMake API request to WeatherStack");
      // check if the API request was successful 
      // console.log(response.ok);
      if (response.ok) {
        // console.log(data.error);
        if (data.error) {
            return -1;
        }
        const temperature = data.current.temperature;
        const city = data.location.name;
        const state = data.location.region;
        const windSpeed = data.current.wind_speed;
        const weatherDescription = data.current.weather_descriptions;
        const feelsLike = data.current.feelslike;
        const weather_icons = data.current.weather_icons;
        
        let weatherDescriptionAsString = "";
        weatherDescription.forEach((elem) => {
            weatherDescriptionAsString += `${elem}, `;
        });

        if (weatherDescriptionAsString !== "") {
            weatherDescriptionAsString = weatherDescriptionAsString.trim().slice(0, -1);
        }

        return {
            "temperature": temperature,
            "city": city, 
            "state": state,
            "windSpeed": windSpeed,
            "weatherDescriptionAsString": weatherDescriptionAsString,
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
        if (data.error.type === "rate_limit_reached") {
            console.log("API limit reached");
        }
        return -1;
    }
}

async function getZips(username) {
    try {
        await client.connect();

        const filter = {username: username};
        const result = await client.db(databaseName).collection(collectionName).findOne(filter);
        
        // check if the user is already in the database
        if (result) {
            // Means user exists
            return result.zips;
        }
        else {
            // Means user does not exists
            return -1;
        }

    } catch (e) {
        console.error(`Error checking/adding to mongo table`);
    } finally {
        await client.close();
    }
}

async function addLocation(username, zip) {

    try {
        await client.connect();

        const filter = {username: username};
        const result = await client.db(databaseName).collection(collectionName).findOne(filter);
        // check if the user is already in the database
        if (result){
            // Means user exists, add the zip code if not already there
            if(!result.zips.includes(zip)) {
                await client.db(databaseName).collection(collectionName).updateOne(filter, {$push: {zips:zip}});
            }
        }
        else{
            const newUserWatchlist = {username: username, zips:[zip]};
            await client.db(databaseName).collection(collectionName).insertOne(newUserWatchlist);
        }

    } catch (e) {
        console.error(`Error checking/adding to mongo table`);
    } finally {
        await client.close();
    }
}

async function deleteLocation(username, zip) {

    try {
        await client.connect();

        const filter = {username: username};
        const result = await client.db(databaseName).collection(collectionName).updateOne(filter, {$pull: {zips: zip}});

        // return true if a zip code was successfully deleted from the user's zip code array
        return result.modifiedCount > 0;

    } catch (e) {
        console.error(`Error checking/adding to mongo table`);
    } finally {
        await client.close();
    }
}

// helper function that returns whether or not the user is in the database table
async function inDatabase(username) {

    try {
        await client.connect();

        const filter = {username: username};
        const result = await client.db(databaseName).collection(collectionName).findOne(filter);
        // return true if the user is already in the database
        if (result != null){
            return true;
        }
        return false;

    } catch (e) {
        console.error(`Error checking for username in mongo table`);
    } finally {
        await client.close();
    }
}

// Project routing below

app.get("/", (request, response) => {
    response.render("index");
});

app.get("/search", (request, response) => {
    response.render("search");
});

app.post("/searchresults", async (request, response) => {

    const {zip} = request.body;

    if (zip.length !== 5) {
        response.render("ziperror", {"errorMessage": `${zip} has an invalid zip code length`});
    }

    // call getWeather function to make a request to the API to grab the data we need
    const weatherDataObj = await getWeather(zip);

    if (weatherDataObj === -1) {
        response.render("ziperror", {"errorMessage": `${zip} is an invalid zip code`});
    }
    else {
        response.render("searchresults", weatherDataObj);
    }
});

app.get("/add", (request, response) => {
    response.render("add");
});

app.post("/addconfirmation", async (request, response) => {
    let {username, zip} = request.body;

    // check if the zip code inputted was valid
    if (zip.length !== 5) {
        response.render("ziperror", {"errorMessage": `${zip} has an invalid zip code length`});
    }
    else {
        const weatherDataObj = await getWeather(zip);

        if (weatherDataObj == -1) {
            response.render("ziperror", {"errorMessage": `${zip} is an invalid zip code`});
        }
        else{
            await addLocation(username, zip).catch(console.error);
            response.render("addconfirmation", {"username": username, "zip": zip});
        }
    }

});

app.get("/choosewatchlist", async (request, response) => {
    response.render("choosewatchlist");
});

app.post("/viewwatchlist", async (request, response) => {
    const {username} = request.body;
    const zipArray = await getZips(username);
    
    let tableString = "<table border='1'><tr><th>Zip</th><th>City</th><th>State</th><th>Temperature</th><th>Weather Description</th></tr>";
    if (zipArray === -1) {
        response.render("viewerror", {"username": username});
    }
    else {
        for (const zip of zipArray) {
            const {city, state, temperature, weatherDescriptionAsString} = await getWeather(zip);
            tableString += `<tr><td>${zip}</td><td>${city}</td><td>${state}</td><td>${temperature}°F</td><td>${weatherDescriptionAsString}</td></tr>`;
        }
        tableString += "</table>";
        response.render("viewwatchlist", {"username": username, "tableString": tableString});
    }
});

app.get("/delete", (request, response) => {
    response.render("delete");
});

app.post("/deleteconfirmation", async (request, response) => {
    
    let {username, zip} = request.body;

    // check if the username inputted is in the database
    const hasWatchlist = await inDatabase(username);

    // redirect user to an error page if the username does not exist in the database table
    if (!hasWatchlist){
        response.render("deleteError", {"errorMessage": `${username} does not have a watchlist`});
    }
    else {
        
        const userZips = await getZips(username);
        // check if the existing username has no zip codes
        if (userZips.length == 0){
            response.render("deleteError", {"errorMessage": `${username} currently has no zip codes to delete`});
        }
        else{
            const deletedZip = await deleteLocation(username, zip).catch(console.error);

            if(!deletedZip) {
                response.render("deleteError", {"errorMessage": `${zip} was not in ${username}'s watchlist`});
            }
            else {
                response.render("deleteconfirmation", {"username": username, "zip": zip});
            }
        }

    }

});

server.listen(portNumber, () => {
    console.log(`Start on port ${portNumber}`);
    // console.log(`Web server started and running at http://localhost:${portNumber}`);
});

/*app.listen(portNumber, (err) => {
    if (err) {
      console.log("Starting server failed.");
    } else {
      console.log(`Web server started and running at http://localhost:${portNumber}`);
      process.stdout.write(prompt);
    }
});*/

/*process.stdin.on("readable", async function () {
    const dataInput = process.stdin.read();
    const command = dataInput.trim();
    if (command.toLowerCase() === "stop") {
        process.stdout.write("Shutting down the server");
        process.exit(0);
    }
    else {
        console.log(`Invalid command: ${command}`);
    }

    process.stdout.write(prompt);
    process.stdin.resume();
});*/