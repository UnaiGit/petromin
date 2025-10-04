# Swift Ride

Swift Ride is a React + TypeScript single-page application powered by Vite. It is designed to showcase a fast, polished car rental experience with smooth transitions and an intuitive selector flow.

## Table of Contents
- [What You Need](#what-you-need)
- [Project Setup (Mac)](#project-setup-mac)
- [Run the App](#run-the-app)
- [Share on Your Wi-Fi Network](#share-on-your-wi-fi-network)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Learn More](#learn-more)

## What You Need
- macOS device
- Terminal app (pre-installed)
- [Node.js LTS](https://nodejs.org/) (includes npm)
  - If you prefer Homebrew: `brew install node`
- A modern browser (Chrome, Safari, Edge)

Check your versions:
```bash
node -v
npm -v
```

## Project Setup (Mac)
1. Open **Terminal**.
2. Navigate to the folder where you want to keep the project. Example:
   ```bash
   cd ~/Desktop
   ```
3. Clone or download the project. If you already have the files, move into the project directory:
   ```bash
   cd swift-ride
   ```
4. Install the dependencies. This pulls down all required libraries.
   ```bash
   npm install
   ```

## Run the App
Start the development server:
```bash
npm run dev
```
The CLI prints a URL similar to `http://localhost:5173`. Open it in your browser to see the app.

## Share on Your Wi-Fi Network
The Vite dev server is configured to listen on all network interfaces, so other devices on your Wi-Fi can use it.

1. Find your Mac's local IP address:
   ```bash
   ipconfig getifaddr en0
   ```
   - If you are on Ethernet or another adapter, run `ifconfig` and use the IP from the active interface.
2. Keep the dev server running (`npm run dev`).
3. On another device connected to the same Wi-Fi, open a browser and enter:
   ```
   http://<your-mac-ip>:5173
   ```
   Example: `http://192.168.1.23:5173`
4. Ensure macOS firewall allows incoming connections for `node`. You can adjust this in **System Settings → Network → Firewall**.

## Available Scripts
- `npm run dev` — start the local development server with hot reload.
- `npm run build` — create an optimized production build inside `dist/`.
- `npm run preview` — serve the production build locally to verify before deploying.
- `npm run lint` — run ESLint with the project configuration.

## Project Structure
```
swift-ride/
├─ src/                 # React components, hooks, assets
├─ public/              # Static assets copied as-is
├─ vite.config.ts       # Vite + dev-server configuration
├─ tsconfig*.json       # TypeScript compiler settings
└─ package.json         # Scripts and dependencies
```

## Troubleshooting
- **`npm` command not found**: Install Node.js from [nodejs.org](https://nodejs.org/). Restart Terminal after installation.
- **Port already in use**: Another process is using 5173. Stop the other process or run `npm run dev -- --port 5174`.
- **Other devices cannot connect**: Double-check the IP address, confirm both devices are on the same network, and review macOS firewall settings.

## Learn More
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
