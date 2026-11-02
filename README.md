# Polaroid Diary

A browser-based photo diary prototype for CIS046-3 Software for Enterprise.

Users can create a local account, capture or upload a photograph, write a diary note, save the entry, browse memories by month, view scrapbook/collage layouts, open or delete individual memories, and view a monthly recap. The app can also retrieve current weather information from Open-Meteo.

## Technologies

- HTML for page structure and controls
- CSS for layout, responsive styling, scrapbook frames and collage presentation
- JavaScript for application behaviour and event handling
- Browser APIs: localStorage, sessionStorage, Web Crypto, getUserMedia, Canvas, Fetch and the HTML dialog element
- Open-Meteo weather API (HTTPS request with a JSON response)

## Run locally

The project is a static browser application. It does not need npm packages or a build step.

1. Open a terminal in this folder.
2. Run a local web server:

   ```powershell
   py -m http.server 8000
   ```

3. Open <http://localhost:8000> in a browser.
4. Allow camera permission when prompted, or use **Upload photo**.
5. Press `Ctrl+C` in the terminal to stop the server.

If `py` is unavailable, use `python -m http.server 8000` instead.

## Main files

- `index.html` — login/register interface, Write page and Memories page
- `app.js` — authentication, camera and image processing, weather request, diary entries, gallery, recap and event handlers
- `style.css` — visual design, page layout, scrapbook photo frames and collage layout
- `frame-moon.jpeg` — scrapbook page artwork
- `frame-vintage.webp` — original vintage collage artwork retained as the source image
- `frame-vintage-cutout.webp` — transparent-window version used by the collage so diary photographs appear inside the five paper openings
- `background.svg` and `bg-demon-wide.jpg` — background artwork

## Storage and prototype limitations

The current prototype stores account records and diary entries in the browser's localStorage. The active username is held in sessionStorage. Data is local to the browser profile and is not synchronised to a server or another device. Clearing browser storage can remove the saved data. The client-side authentication is suitable for demonstrating the prototype but is not a replacement for production server-side authentication.

The recap uses simple JavaScript word and keyword counts; it is not an AI-generated emotional assessment. Weather information depends on the external Open-Meteo service, but an unavailable weather response does not prevent an entry from being saved.

## Quick test checklist

- Register a test account and log in.
- Upload a picture or allow camera access and take a photo.
- Add a note and save the memory.
- Open **Memories** and check the saved entry.
- Switch between **Scrapbook frame** and **Collage frame**.
- Change the month, open a memory and test deletion.
- Open **Monthly recap**.
- Log out and log back in to check that entries remain in this browser.
