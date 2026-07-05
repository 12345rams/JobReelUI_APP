# Frontend App

This is the mobile frontend application, built using React Native and Expo.

## Prerequisites

- Node.js
- npm
- Expo CLI (optional, but recommended)
- Expo Go app on your physical device or an emulator (iOS/Android)

## Setup and Running

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Copy `.env.example` to `.env` and update the necessary environment variables.

3. **Start the Metro bundler:**
   ```bash
   npx expo start
   ```
   or
   ```bash
   npm start
   ```

4. **View the UI (on a Laptop or Phone):**
   - **Web Browser (Fastest for laptop):** Press `w` in the terminal, or go to `http://localhost:8081` in your browser.
   - **Android Emulator (Laptop):** If you have Android Studio installed and an emulator running, press `a` in the terminal.
   - **Physical Phone (Recommended):** Download the **Expo Go** app on your iPhone or Android. Scan the QR code shown in the terminal.
   - **iOS Simulator (Mac only):** Press `i` to open on iOS Simulator.

## Project Structure

- `App.js` - Main entry point of the app.
- `src/` - Source code for the application components and screens.
- `app.json` - Expo configuration file.
- `metro.config.js` - Metro bundler configuration.
