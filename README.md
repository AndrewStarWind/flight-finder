# Flight Finder API
## Overview
The Flight Finder API is a JSON over HTTP service designed to find routes between two airports based on IATA/ICAO airport codes. It prioritizes routes with the fewest layovers (up to 3 stops) while ensuring the shortest geographical distance in kilometers.

Additionally, the service supports ground hops, allowing for airport changes within 100km during stops. These hops don't contribute to the layover count but affect the total distance of the route.

## Getting Started
To run the service locally, follow these steps:

1. Install dependencies using `yarn install`.
1. Start the service in development mode with `yarn start:dev`.


## Docker Support
Alternatively, you can run the service using Docker. Use the provided docker-compose.yml file to:

1. Run the service itself, exposing port 3000: `docker-compose up -d service`.
1. Execute tests within the Docker environment: `docker-compose up test`.