# Patromin

Patromin is an interactive car-rental demo built with React, TypeScript, and Vite. It lets you explore a premium rental flow, a business ordering portal, and an operations dashboard—all in one place.

## Before You Start
- A Mac running macOS.
- Internet access (only needed the first time to install tools).
- Terminal app (press `Command + Space`, type `Terminal`, press `Return`).
- A browser such as Safari, Chrome, or Edge.

### Check for Node.js and npm
```bash
node -v
npm -v
```
If both commands print a version number, you can skip to the [Download the Project](#download-the-project) section. If you see "command not found", follow the next steps.

### Install Node.js (includes npm)
Option A – Use the official installer:
1. Go to https://nodejs.org
2. Click **LTS** (Recommended for most users) and download the macOS installer.
3. Open the downloaded `.pkg` file and follow the prompts.
4. Close and reopen Terminal, then run `node -v` and `npm -v` again to confirm.

Option B – Use Homebrew (if you are comfortable with it):
```bash
brew install node
```

## Download the Project
Choose one of the following methods.

**Option A – Git clone (recommended):**
```bash
cd ~/Desktop
git clone https://github.com/UnaiGit/petromin.git
cd petromin
```

**Option B – Download ZIP:**
1. Visit https://github.com/UnaiGit/petromin
2. Click **Code → Download ZIP**.
3. Unzip the file by double-clicking it. A folder named `petromin-main` (or similar) appears.
4. Open Terminal and move into that folder. Example:
   ```bash
   cd ~/Downloads/petromin-main
   ```

## Install Project Packages
Inside the project folder, run:
```bash
npm install
```
This command downloads everything the project needs into a local `node_modules` folder.

## Run the App on Your Mac
Start the development server:
```bash
npm run dev
```
The terminal shows a message similar to:
```
> Local:   http://localhost:5173/
> Network: http://192.168.x.x:5173/
```
Leave this window open; it must keep running. Open the `Local` address in your browser to see Patromin.

To stop the server later, click the Terminal window and press `Control + C`.

## Share the App on Your Wi-Fi Network
Patromin is already configured to allow access from other devices on your Wi-Fi.

1. While `npm run dev` is running, find your Mac's IP address:
   ```bash
   ipconfig getifaddr en0
   ```
   If this shows nothing, try `ipconfig getifaddr en1` or run `ifconfig` and look for the `inet` value on the active network interface.
2. On another device (phone, tablet, laptop) connected to the same Wi-Fi, open a browser and type:
   ```
   http://YOUR-IP-ADDRESS:5173
   ```
   Example: `http://192.168.1.23:5173`
3. If the other device cannot connect, check **System Settings → Network → Firewall** and allow incoming connections for `node` (the process Vite uses).

## Helpful npm Commands
- `npm run dev` – Start the development server with live reload.
- `npm run build` – Create an optimized production build inside the `dist` folder.
- `npm run preview` – Serve the production build locally to double-check it.
- `npm run lint` – Run ESLint to catch common code issues.

## Project Tour
```
petromin/
├─ src/                  # React components, screens, state, and assets
├─ public/               # Static files served as-is
├─ vite.config.ts        # Vite configuration (includes network settings)
├─ package.json          # Project metadata and scripts
└─ tsconfig*.json        # TypeScript configuration files
```

Highlights:
- **Consumer experience** – Interactive booking map and vehicle selector.
- **Corporate portal** – Browse catalogs, sign orders, and manage company details.
- **Admin dashboard** – Monitor fleet metrics, rentals, and automation ideas.

## Troubleshooting
- **`npm` command not found** – Reinstall Node.js and reopen Terminal.
- **`npm install` errors** – Check your internet connection; try running the command again.
- **`npm run dev` says port 5173 is in use** – Stop any other dev servers or run `npm run dev -- --port 5174`.
- **Browser shows a blank page** – Refresh the page. If the Terminal shows errors, copy them and ask for help.
- **Other devices cannot load the site** – Confirm the IP address, make sure both devices share the same Wi-Fi, and verify firewall settings.

You are ready to explore Patromin. Have fun experimenting with the different experiences and feel free to customize the components in the `src` folder.
