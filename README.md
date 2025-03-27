# Product Feed Centralization System

A comprehensive system for managing and importing product feeds from various sources built with Node.js, Express, MongoDB, and Next.js.

## Features

- **User Authentication**: Secure login and registration system
- **Feed Management**: Add, edit, and delete product feeds
- **Feed Import**: Import products from CSV feeds with automatic detection of duplicates
- **Product Management**: View, search, and filter imported products
- **Responsive UI**: Modern and user-friendly interface built with Material UI

## System Requirements

- Docker and Docker Compose
- WSL2 with Ubuntu (for Windows users)
- Node.js 18+ and npm (for local development without Docker)

## Architecture

The application consists of three main components:

1. **Backend API**: Node.js with Express
2. **Frontend**: Next.js React application
3. **Database**: MongoDB

All services are containerized using Docker for easy deployment.

## Directory Structure

```
import-nodejs/
├── backend/             # Express API server
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js     # Server entry point
│       ├── routes/      # API routes
│       ├── controllers/ # Route controllers
│       ├── models/      # Database models
│       └── middleware/  # Express middleware
├── frontend/            # Next.js frontend
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── app/         # Next.js app directory
│       ├── components/  # Reusable components
│       └── lib/         # Utility functions and API client
├── docker-compose.yml   # Docker services configuration
└── README.md            # Project documentation
```

## Getting Started

### Installation

1. Clone the repository (if you haven't already):

```bash
git clone <repository-url>
cd import-nodejs
```

2. Start the application using Docker Compose:

```bash
docker-compose up -d
```

This command will:
- Build the backend and frontend containers
- Start MongoDB
- Set up the necessary network connections

3. The application will be available at:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### First-time Setup

1. Access the frontend at http://localhost:3000
2. Register a new user account
3. Log in with your credentials
4. Start adding product feeds

## Using the System

### Managing Feeds

1. Navigate to the "Feeds" section
2. Click "Add Feed" to create a new feed
3. Provide the feed name, URL to the CSV feed, and status (active or inactive)
4. Click "Save" to create the feed

### Importing Products

1. On the Feeds page, click the "Import All" button to import all active feeds
2. Alternatively, you can import individual feeds using the import button for each feed
3. The system will automatically detect duplicates and update them based on the URL field

### Managing Products

1. Navigate to the "Products" section
2. Use the filters to find specific products by feed, category, brand, or search term
3. Click on a product to view its details
4. You can activate/deactivate or delete products as needed

## CSV Feed Format

The system expects CSV feeds with the following columns:

```
"title","aff_code","price","campaign_name","image_urls","subcategory","url","product_active","brand","product_id","category","old_price","description"
```

Example:
```csv
"Inel din aur de 14K cu diamant lab de 1.70ct","https://event.2performant.com/events/click?ad_type=product_store&unique=bf8e5f4b1&aff_code=82765c2ec&campaign_unique=083b6205a","8500.0","gdream.ro","https://gdream.ro/wp-content/uploads/2025/02/untitled.2205-1.webp","","https://gdream.ro/catalog/inele/inele-de-logodna/inel-din-aur-de-14k-cu-diamant-lab-de-1-70ct/","1","Unknown","celebird-eg-variants-apparel-upi-7796","accessories > rings","","1 diamant de laborator: ~13.08×5.88 mm, ~1.70 ct, E, VVS2, formă marquise 16 diamante de laborator: ~1.55 mm, ~0.22 ct, F-G, VVS, formă rotundă"
```

## Development

### Running Locally (Without Docker)

#### Backend

```bash
cd backend
npm install
npm run dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

#### Backend (default values in docker-compose.yml)

- `PORT`: API server port (default: 3001)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret for JWT token generation
- `NODE_ENV`: Environment (development, production)

#### Frontend (default values in docker-compose.yml)

- `NEXT_PUBLIC_API_URL`: URL of the backend API

## Troubleshooting

### Common Issues

1. **Connection to MongoDB fails**:
   - Ensure MongoDB container is running: `docker-compose ps`
   - Check MongoDB logs: `docker-compose logs mongodb`

2. **Frontend can't connect to API**:
   - Verify the backend is running: `docker-compose ps`
   - Check the API URL in frontend configuration

3. **Import process fails**:
   - Ensure the CSV file is accessible from the backend container
   - Verify the CSV format matches the expected format

## Deployment Guide

### Production Setup

1. Clone the repository
2. Copy `.env.example` to `.env` in both backend and frontend folders
3. Update the environment variables with your production values
4. Build Docker images:
   ```
   docker-compose -f docker-compose.prod.yml build
   ```
5. Start the application:
   ```
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Environment Variables

#### Backend
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (production/development)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `JWT_EXPIRES_IN`: JWT token expiration time
- `CORS_ORIGIN`: Frontend URL for CORS

#### Frontend
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_JWT_EXPIRY`: JWT expiration for client-side

## License

This project is proprietary and confidential.

## Support

For support inquiries, please reach out to the system administrator.
