# Sigil

Hand-gesture and voice-driven visual playground. Webcam effects run entirely in the browser with MediaPipe (Hands, Selfie Segmentation, Face Mesh).

## Features

- Invisibility cloak with on-device background calibration
- One-hand and two-hand gesture modes
- Voice animals (cat / dog / cow)
- Air piano (Keys) with index-finger play and two-hand circle to exit

## Run locally

Open `index.html` with a local static server (camera needs a secure context):

```bash
npx --yes serve .
```

Then visit the printed URL and allow camera + microphone.

## Stack

- Vanilla HTML / CSS / JavaScript
- [MediaPipe](https://cdn.jsdelivr.net/npm/@mediapipe/) Hands, Selfie Segmentation, Face Mesh
- Web Audio API

## Project layout

```
index.html
css/styles.css
js/app.js
js/audio.js
js/voice.js
assets/logo.svg
assets/logo.png
assets/masks/
```

## License

Personal / demo use. MediaPipe is subject to Google’s terms.
