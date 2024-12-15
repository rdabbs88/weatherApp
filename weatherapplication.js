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


// Project routing below

// GET request to our index page
app.get("/", (request, response) => {
    response.render("index");
});

app.get("/search", (request, response) => {
    response.render("search");
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