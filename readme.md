

## Running the Application

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start the development server at `localhost:5173`:**
   ```bash
   npm run dev
   ```

## Project Structure

```
react-movies/
├── .husky/                 # Husky config. for Git hooks.
├── public/                 # Static files.
├── src/                    # Source files.
│   ├── assets/             # Assets like images, icons, etc.
│   ├── components/         # React components.
│   ├── config/             # Configuration files.
│   ├── constants/          # Constants and enums.
│   ├── pages/              # Application pages.
│   ├── locales/            # Translations.
│   ├── routes/             # Routes configuration.
│   ├── services/           # Service utilities and API calls.
├── .env.sample             # Sample environment variables.
├── .gitignore              # Git ignore file.
├── package.json            # NPM package configuration.
├── README.md               # Project documentation.
```

## Available Scripts

- `npm run dev`: Starts the development server.
<!-- - `npm run build`: Builds the application for production.
- `npm run lint`: Lints the code for errors and warnings.
- `npm run test`: Runs the test suite. -->

## API Integration Overview

### TMDb API

- **Base URL:** `https://api.themoviedb.org/3`
- **Authentication:** API Key (stored in `.env` file)

### YouTube API (Optional)

- **Base URL:** `https://www.googleapis.com/youtube/v3`
- **Authentication:** API Key (stored in `.env` file)

## Contributing

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/YourFeature`).
3. Commit your changes (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature/YourFeature`).
5. Open a pull request.
