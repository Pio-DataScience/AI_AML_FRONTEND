# AI AML Frontend

## Getting Started

The frontend uses **port 3010** and connects to the Smart AML API on **port
8010**. Both servers listen on `0.0.0.0` so they can be accessed from other
computers on the network.

### 1. Start the backend

In a separate terminal, from the sibling `Smart_AML2025` repository root:

```powershell
cd ../Smart_AML2025
.\.venv\Scripts\python.exe start_api.py
```

On Linux/macOS, use `./.venv/bin/python start_api.py`. Wait for `Application
startup complete`. The backend defaults to `0.0.0.0:8010`; keep `API_HOST` and
`API_PORT` at those values if set in its environment or `.env` file.
`Main.py` runs the AML pipeline, not the API server.

### 2. Start the frontend

From this repository root, in another terminal:

```bash
npm install
npm run dev
```

For a production build instead:

```bash
npm run build
npm start
```

Both `npm run dev` and `npm start` bind to **0.0.0.0:3010**.

### 3. Connect from your browser

On the server itself, open **http://localhost:3010**. From another computer,
open `http://<server-IP-or-hostname>:3010`, replacing the placeholder with the
server's reachable address. For example:

- Frontend: `http://192.168.30.6:3010`
- Backend health: `http://192.168.30.6:8010/health`
- Backend API documentation: `http://192.168.30.6:8010/docs`

The frontend automatically calls the hostname used in the browser on port
**8010**. No `.env.local` is needed when both apps run on the same server.
Do not hardcode `localhost` as the backend URL for remote users: it would
point to each user's computer, not the server. `0.0.0.0` is a listening
address, not a browser URL.

Allow inbound TCP **3010** and **8010** on the server's firewall for the
intended trusted network. Do not expose development servers to the public
internet.

### Optional API overrides

`src/services/apiConfig.ts` supports these build-time environment variables:

- `NEXT_PUBLIC_API_URL`: a backend origin reachable from the browser, e.g.
  `http://aml-server:8010`. Do **not** include `/api`; the services append it.
  Use this only when the backend is on a different host or needs a different
  origin. This takes precedence over automatic hostname/port selection.
- `NEXT_PUBLIC_API_PORT`: defaults to `8010`; used only when no API URL is set.

Remove stale overrides in `.env.local`, other Next.js environment files, or
the server's environment to use automatic same-host connection. After changing
these variables, restart `npm run dev`, or rebuild and restart if using
`npm start`. These examples use HTTP; an HTTPS deployment needs an HTTPS API
or an HTTPS reverse proxy to avoid mixed-content blocking.

### Troubleshooting

- Open `/health` on the backend address from the same computer as the browser.
  It should return `{"status":"ok"}`. If unreachable, check backend startup,
  hostname, port, firewall, and network connectivity.
- If health succeeds but dashboard requests fail, inspect the browser's
  Network tab and backend logs. `/health` does not test Oracle connectivity.
- If a port is already occupied, stop the old instance before starting the
  new one. The frontend must use `3010` and the backend `8010` for this setup.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
