# Rockbot permanent access plan

Date: 2026-08-13 ET  
Status: partial; local persistence and private source backup are live, while the Cloudflare route is blocked at the account's domain/billing gate

## Decision

Run Rockbot on Dillon's Windows workstation and publish only an authenticated route through Cloudflare Tunnel plus Cloudflare Access. Back up the source in a private GitHub repository. This preserves the local Codex, Claude, Grok, and Ollama runtimes, the allowlisted Windows workspaces, and local receipt storage.

Netlify is not the correct host for the current monolith. Its Next.js runtime maps API routes to serverless functions, does not support the required local filesystem/runtime model, and imposes execution limits that conflict with interactive agent runs. Netlify could host a future static control-plane UI only after Rockbot is split into a cloud frontend and an outbound-connected local runner.

## Live execution status

- The exact Dillon operations Cloudflare account was authenticated through its existing Google identity on 2026-08-13.
- That account has one account surface and zero managed domains or subdomains. A public Access hostname cannot be created until a non-client domain is added or purchased.
- Cloudflare Zero Trust Free was selected, but activation was not submitted. Even the $0 tier requires billing details, a payment method, terms acceptance, and authorization for usage overages. No billing data was entered and no financial authorization was accepted.
- No tunnel, hostname route, DNS record, Access application, policy, WARP enrollment, or `cloudflared` service was created. An unauthenticated Quick Tunnel was intentionally not used.
- The `Rockbot Local Runtime` scheduled task is installed for Dillon's logon and launches only through `wscript.exe` plus the approved `Run-HiddenScheduledTask.vbs` manifest. Its first live task result was `0`.
- Source backup is the private repository `https://github.com/dillonmohr8777/rockbot`; runtime receipts, build output, logs, local environment files, and authentication state remain excluded.

## Current machine state

- Rockbot is healthy at `http://127.0.0.1:3434` and remains loopback-only.
- The workstation's active sleep and hibernate timers are disabled on AC and DC power.
- `cloudflared` 2026.7.1 is installed.
- No `cloudflared` Windows service is installed.
- The CLI has no local origin certificate and cannot list or create managed tunnels without authentication.
- Access Broker contains a non-secret Cloudflare OAuth locator, but it has never been verified and grants only login/session/account-metadata capabilities, not tunnel or DNS writes.
- Tailscale is not installed.
- The Rockbot directory is not a Git repository and has no remote.

## Required target decision

Before the Cloudflare route can be completed, resolve one route and its final identity gate:

1. Public any-browser route: add or purchase a non-client domain, then use a Rockbot subdomain protected by a deny-by-default Access policy for Dillon only.
2. Domain-free private route: Dillon completes the Zero Trust Free billing/overage activation, then Rockbot uses a private hostname and enrolled Cloudflare One Client devices.

The verified Dillon Cloudflare identity is the intended sole Allow identity. Do not reuse a client domain or client identity.

## Activation sequence

1. Create the Cloudflare Access self-hosted application first so the route is deny-by-default before it exists.
2. Create a named Cloudflare Tunnel and map the exact hostname to `http://127.0.0.1:3434`.
3. Enable Protect with Access/token validation at the tunnel boundary.
4. Install `cloudflared` as a Windows service so it starts at boot.
5. Register Rockbot itself as a hidden startup task through the approved `Run-HiddenScheduledTask.vbs` manifest path; do not use a direct scheduled PowerShell action.
6. Create a private GitHub repository, commit only reviewed source/config/docs, and exclude runtime receipts, logs, build output, and local authentication state.
7. Verify from an off-network authenticated browser: login gate, home UI, model picker, one Demo canary, one Codex canary, blocked timeout receipt, and no anonymous access.
8. Preserve `127.0.0.1` binding; never expose port 3434 directly and never use an unauthenticated Quick Tunnel.

## Alternative

Tailscale Serve is the simpler maximum-privacy option if Dillon is willing to install Tailscale on the workstation and every device that should access Rockbot. It provides a private tailnet HTTPS name and tailnet access controls. It does not provide the same any-browser convenience as a Cloudflare Access public hostname.

## Always-on caveat

The private URL works only while the Windows workstation and Rockbot process are running. If Rockbot must survive workstation shutdowns, move the runner to an always-on Windows mini PC or redesign it as a cloud control plane plus local runners. Moving only the current Next.js app to a generic Linux host would lose the exact local CLIs, sessions, Windows paths, and Ollama environment it orchestrates.

external action attempted = Cloudflare identity authorized; Zero Trust checkout opened but not activated; hidden startup task and private GitHub repository created
