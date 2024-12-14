const API_KEY = "6e9cdd7a2a7e31817d2d71a56bb7f704";
const BASE_URL = "http://api.weatherstack.com/current";
const UNIT = "f";

// Function to fetch weather data for a given location
async function getWeather(location) {
  try {
    const response = await fetch(`${BASE_URL}?access_key=${API_KEY}&query=${location}&units=${UNIT}`);
    if (response.ok) {
      const data = await response.json();
      let temperature = data.current.temperature;
      let city = data.location.name;
      let state = data.location.region;
      let windSpeed = data.current.wind_speed;
      let weatherDescription = data.current.weather_descriptions;
      let feelsLike = data.current.feelslike;
      let localTime = data.location.localtime;
      console.log(`Weather in ${location}:`, temperature);
      console.log(`city: ${city}`);
      console.log(`state: ${state}`);
      console.log(`Wind speed: ${windSpeed}`);
      console.log(`Weather Description: ${weatherDescription}`);
      console.log(`Feels Like: ${feelsLike}`);
      console.log(`Local Time: ${localTime}`);


      
    } else {
      console.error(`Failed! Status Code: ${response.status}`);
    }
  } catch (error) {
    console.error("Error:", error);
  }

}

getWeather("20742");