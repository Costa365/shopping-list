# Shopping list

A small, responsive shopping list with a light interface. Built with plain HTML, CSS, and JavaScript. No accounts, backend, or runtime JavaScript dependencies.

## Run with Docker Compose

Prerequisites: Docker Engine or Docker Desktop running, with the Docker Compose plugin.

```sh
docker compose up --build -d
```

Open **http://localhost:8080**. The server is bound to your machine's loopback interface.

```sh
# Stop and remove the container
docker compose down

# Rebuild and launch after changing the app
docker compose up --build -d

# View server logs
docker compose logs -f web
```

Node.js is not required to run the app. Nginx serves the three static app files; no database or Docker volume is needed.

## Production deployment

The production image contains only Nginx on Alpine Linux and `index.html`, `styles.css`, and `app.js`. Playwright, Chromium, Node.js, npm, test files, and `node_modules` are excluded. There is no npm install or frontend build step in Docker; you only need Docker and Compose on the deployment machine.

Use the production override to name the image and automatically restart the service after failures or Docker restarts:

```sh
docker compose -f compose.yaml -f compose.production.yaml up --build -d

# View production logs
docker compose -f compose.yaml -f compose.production.yaml logs -f web

# Stop production
docker compose -f compose.yaml -f compose.production.yaml down
```

Run the same startup command after updating the source to rebuild and deploy. The production override uses the same service and port as the default setup; it replaces that deployment rather than starting a second instance.

For a public deployment, place an HTTPS reverse proxy on the host in front of `127.0.0.1:8080`. HTTPS is required outside localhost for the UUID API used to add items. Keep the public hostname stable so browser storage stays associated with the same origin. TLS termination is managed by your reverse proxy, not this static app container.

Development dependencies in `package.json` are only for running tests locally. You do not need to install them to build or run either Docker configuration.

## Use the list

- Type an item and press Enter or select **Add**. Blank names are ignored; duplicate names are allowed.
- Select an item's checkbox or label to mark it purchased. Select it again to undo.
- **Clear purchased** immediately removes checked items, keeping the others in order. There is no confirmation or undo for clearing.
- The counter shows how many items remain to purchase.

Your list is saved automatically in browser local storage under `shopping-list:v1`. It survives page reloads and container restarts. Storage belongs to the browser profile and origin: changing the hostname, protocol, or port uses different storage. There is no cross-device synchronization. Clearing browser site data removes the list; private browsing may discard it when the session ends. Concurrent tabs are not synchronized; the latest save wins.

If browser storage is blocked or full, a notice appears and the current page remains usable, but unsaved changes will be lost when it closes. Malformed storage is handled safely; valid records are retained where possible.

## Development and tests

Edit `index.html`, `styles.css`, and `app.js`, then rebuild the container. Tests are development-only and are excluded from the Docker image.

Prerequisites for testing: Node.js 22 or later and npm, plus the running Compose app above.

```sh
npm ci
npx playwright install --with-deps chromium
npm test
```

The browser installation may require administrator access for system packages. Tests use headless Chromium at desktop and mobile viewport sizes and run against **http://localhost:8080**. Every test has isolated browser storage.

Coverage includes adding items, keyboard controls, purchase toggles, clearing, reload persistence, invalid or unavailable storage, failed saves, literal rendering of HTML-like names, and long names. Layout tests save empty and populated screenshots in `test-results/`. Mobile tests emulate a phone in Chromium; they do not replace testing on physical devices or Safari.

```sh
# Inspect the HTML report and failure traces/screenshots
npm run test:report

# Run just the desktop tests
npm test -- --project=desktop

# Validate Compose without starting containers
docker compose config --quiet
```

To verify container-restart persistence automatically:

```sh
npm run test:restart
```

This requires Docker access and briefly restarts the Compose web service. It keeps a browser open across the restart and verifies that both an item and its purchased status survive. Run it separately from `npm test` so the restart does not interrupt the other tests. It uses isolated browser storage and does not modify your personal list.

For a manual check, add an item in your browser, run `docker compose restart web`, and reload the same URL in the same browser. The item should remain.

## Project structure

- `index.html`, `styles.css`, `app.js`: accessible interface, styling, and list/storage behavior.
- `Dockerfile`, `compose.yaml`, `compose.production.yaml`, `.dockerignore`: lightweight static Nginx image and local/production launch configuration.
- `tests/`, `playwright.config.js`, `scripts/test-restart.js`: browser tests, viewport settings, and container-restart verification.
- `package.json`, `package-lock.json`: reproducible development dependencies.

## Troubleshooting

**Docker cannot connect:** Start Docker Desktop or the Docker daemon. On Linux, ensure your user has permission to access Docker; follow your installation's access setup.

**Port 8080 is occupied:** Stop the conflicting service or change the host port in `compose.yaml`. If you change it, also update the test `baseURL` in `playwright.config.js`. A different port uses a different browser storage origin.

**Changes are not visible:** Rebuild with `docker compose up --build -d` and reload the browser. The container uses copied files, not a live source mount.

**Localhost times out despite a running container:** A VPN or firewall can block Docker bridge traffic. Check whether your VPN allows local-network access; in this environment, disabling the VPN resolved the timeout.

**Browser tests cannot connect:** Start Compose first, check `docker compose ps`, and confirm the app opens at localhost:8080.

**Playwright cannot find a browser:** Run `npx playwright install --with-deps chromium` after `npm ci`. Browser downloads must match the installed Playwright version.

**The list is not saving:** Check the displayed storage notice and your browser's site-data settings. Allow storage or free space. Do not clear site data unless you intend to delete the saved list.

## Scope

One list per browser origin, using system fonts. No accounts, multiple lists, quantities, categories, analytics, or external app services. The page can be served by any static HTTP server; localhost provides the secure context required for item UUID generation.
