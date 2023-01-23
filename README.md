# weather-api
Get weather data of 30 [cities](https://github.com/spuckhafte/weather_api#Cities).

`https://weather-api-m0ay.onrender.com`<br>

Result (data for a city) is cached using Redis for 15 mins

### Queries (use any one at a time):
1. `?city=Delhi` (one of the 30 cities)
2. `?page=1&size=10` (30 cities, 3 pages, max size = 10)

eg. `...com?page=2&size=2`<br>
![Screenshot 2023-01-23 223809](https://user-images.githubusercontent.com/70335252/214103889-4f5fb13c-c6a2-4956-b9fd-7186e9aca85e.png)

### Cities:
`"mumbai","delhi","bengaluru","kolkata","chennai",
  "hyderabad","ahmedabad","pune","surat","jaipur",
  "lucknow","kanpur","nagpur","visakhapatnam",
  "ludhiana","agra","nashik","faridabad","patna",
  "vadodara","rajkot","meerut","varanasi","srinagar",
  "aurangabad","dhanbad","amritsar","navi mumbai",
  "allahabad","ranchi","howrah","coimbatore","jabalpur"`
