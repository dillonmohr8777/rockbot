# Rockbot permanent access plan

Date: 2026-08-13 ET  
Status: partial; local persistence and private source backup are live, while the Cloudflare route is blocked at the account's domain/billing gate

## Decision

Run Rockbot on Dillon's Windows workstation and publish only an authenticated route through Cloudflare Tunnel plus Cloudflare Access. Back up the source in a private GitHub repository. This preserves the local Codex, Claude, Grok, and Ollama runtimes, the allowlisted Windows workspaces, and local receipt storage.

Netlify is not the correct host for the current monolith. Its Next.js runtime maps API routes to serverless functions, does not support the required local filesystem/runtime model, and imposes execution limits that conflict with interactive agent runs. Netlify could host a future static control-plane UI only after Rockbot is split into a cloud frontend and an outbound-connected local runner.

## Live execution status

- The exact Dillon operations Cloudflare account was authenticated through its existing Google identity on 2026-08-13.
- That account has one account surface and zero managed domains or subdomains, so the standard Tunnel-plus-DNS hostname route is unavailable. The preferred domain-free route is a locked `workers.dev` Worker connected to Rockbot through Workers VPC and protected by Cloudflare Access.
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

Before the Cloudflare route can be completed, activate its identity gate and then use one of these routes:

1. Recommended domain-free any-browser route: Dillon completes the Zero Trust Free billing/overage activation; deploy a maintenance-locked Worker on `workers.dev`; enable Access for Dillon only; then bind that Worker to a Rockbot VPC Service over Cloudflare Tunnel.
2. Custom-brand route: add or purchase a non-client domain, then use a Rockbot subdomain protected by the same deny-by-default Access policy.
3. Client-installed private route: use a private hostname and enrolled Cloudflare One Client devices instead of a public URL.

The verified Dillon Cloudflare identity is the intended sole Allow identity. Do not reuse a client domain or client identity.

## Activation sequence

1. Complete the Zero Trust Free activation without sharing billing data with Rockbot or storing it locally.
2. Create a named Cloudflare Tunnel for Workers VPC and connect it to the workstation using a credential path that does not expose the tunnel token in source, logs, chat, or command history.
3. Register a narrow HTTP VPC Service targeting the loopback Rockbot origin on port `3434`.
4. Deploy a maintenance-locked Worker on `workers.dev`; it must not proxy the VPC Service yet.
5. Enable Cloudflare Access on the Worker with a deny-by-default Allow policy for the verified Dillon identity only, then prove anonymous denial.
6. Bind the Access-protected Worker to the Rockbot VPC Service and deploy the reverse proxy.
7. Keep the existing `Rockbot Local Runtime` hidden logon task and install the tunnel connector as a persistent hidden launch surface.
8. Verify from an off-network authenticated browser: login gate, home UI, model picker, one Demo canary, one Codex canary, blocked timeout receipt, and no anonymous access.
9. Preserve `127.0.0.1` binding; never expose port 3434 directly and never use an unauthenticated Quick Tunnel.

## Alternative

Tailscale Serve is the simpler maximum-privacy option if Dillon is willing to install Tailscale on the workstation and every device that should access Rockbot. It provides a private tailnet HTTPS name and tailnet access controls. It does not provide the same any-browser convenience as a Cloudflare Access public hostname.

## Always-on caveat

The private URL works only while the Windows workstation and Rockbot process are running. If Rockbot must survive workstation shutdowns, move the runner to an always-on Windows mini PC or redesign it as a cloud control plane plus local runners. Moving only the current Next.js app to a generic Linux host would lose the exact local CLIs, sessions, Windows paths, and Ollama environment it orchestrates.

external action attempted = Cloudflare identity authorized; Zero Trust checkout opened but not activated; hidden startup task and private GitHub repository created
