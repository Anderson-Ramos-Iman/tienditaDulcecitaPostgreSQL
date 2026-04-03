# Tiendita Dulcecita – App Móvil

App de catálogo de productos construida con **Expo / React Native**.

## Requisitos
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go instalado en tu celular (Android/iOS)

## Configuración

Edita `config.js` con la URL de tu backend:

```js
// Producción (Render):
export const API_URL = 'https://TU-APP.onrender.com/api';

// Desarrollo local (usa la IP de tu PC en la red WiFi):
export const API_URL = 'http://192.168.X.X:3001/api';
```

## Ejecutar

```bash
npm install
npm start        # abre QR para escanear con Expo Go
npm run android  # emulador Android
npm run ios      # simulador iOS (solo Mac)
```
