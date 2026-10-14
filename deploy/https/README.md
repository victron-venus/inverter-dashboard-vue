# Same-origin HTTPS deployment

This is the recommended cryptographic profile for a standalone dashboard. Use a currently supported Chrome, Firefox or Safari release, build the SPA (`npm ci --ignore-scripts && npm run build`), and install maintained [Caddy 2](https://caddyserver.com/docs/install). CI tests Caddy 2.11.7 with a pinned archive checksum.

From the repository root, set `DASHBOARD_ADDRESS=dashboard.example.org`, `DASHBOARD_ROOT=/absolute/path/to/dist`, and `DASHBOARD_BACKEND=127.0.0.1:8080`, then run:

```sh
caddy run --config deploy/https/Caddyfile --adapter caddyfile
```

Use a hostname you control, point its DNS at this host, and make the required ACME validation ports available. The backend must be on this same trusted host, bound to loopback; `DASHBOARD_BACKEND` is a trusted operator setting, not a remote client input. Keep its authentication enabled. Caddy serves SPA assets and forwards `/api/*` and `/ws` without moving page credentials to another browser origin. Do not set a cross-origin `VITE_API_BASE` for private mode. Referrers are disabled because the compatibility page token may appear in its URL. Do not enable request logging of these URLs.

The default address is `localhost:8443` for evaluation. It uses Caddy's local CA; trust that CA explicitly only on your test client. The configuration never installs a root automatically. Do not use browser certificate-error bypasses. A public hostname uses automatic ACME issuance instead. Persist and protect Caddy's data directory so certificate renewal and keys survive restarts.

## Cryptographic and browser boundaries

The profile permits **TLS 1.3 only**, using its modern AEAD ciphers and forward-secret X25519/P-256 key exchange. Caddy generates **P-256** certificate keys; the local test also verifies P-256 root/intermediate keys. The [Caddy TLS directives](https://caddyserver.com/docs/caddyfile/directives/tls) document these settings. Automatic public issuance relies on the public CA/browser trust ecosystem; retain supported Caddy/browser releases and do not substitute weak custom certificates or trust anchors.

The browser's CSP restricts network requests to this origin. Public-mode proxy URLs must also be exposed through this same origin under this profile. An external proxy needs its own independently verified equivalent TLS/certificate policy and an explicitly reviewed CSP change. Browsers do not universally enforce a 2048-bit RSA minimum for all operator-installed roots: browser certificate verification by itself is **not** evidence of this profile. The profile's server settings, generated keys and origin restriction provide that boundary. The Vue component library relies on its embedding application's equivalent hosting and CSP configuration.

Run `bash scripts/check-https-profile.sh` for an isolated test. It downloads a checksum-pinned Caddy executable into a temporary directory (or uses `CADDY_BIN`), starts only loopback fixture services, checks a trusted TLS1.3 connection and P-256 chain, rejects TLS1.2 and an untrusted root, and checks API routing, CSP and SPA fallback. It changes no system trust, contacts no production backend, and removes its generated local CA after stopping the process.
