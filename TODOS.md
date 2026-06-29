# TODOS

## Infrastructure

### Complete the production DNS and server handoff

**What:** Align the apex and `www` DNS records with the authoritative production server, install the Nginx configuration, provision TLS, deploy the release, and rerun `deploy/preflight.ps1`.

**Why:** The public site cannot launch reliably while the apex domain and deployment target disagree and the configured virtual host is not active.

**Context:** Deployment is owned by Hermes. On 2026-06-29, `pdftool.work` resolved to `154.217.241.28`, `www.pdftool.work` resolved to `154.217.241.238`, while `deploy/deploy.ps1` targets `154.217.241.238`. The configured server returned HTTP 404 for the apex Host header, apex HTTPS timed out, and the `www` certificate did not match.

**Effort:** M
**Priority:** P0
**Depends on:** DNS and server access for Hermes

## Monetization

### Activate AdSense after account approval

**What:** Replace the placeholder publisher and ad-slot IDs, enable the AdSense loader, and publish the authorized `ads.txt` record.

**Why:** Placeholder mode intentionally hides every ad container, so the site cannot earn advertising revenue until approval details are installed.

**Context:** Follow the checklist in `README.md`. Keep placeholder mode enabled until Google approves the account and supplies the real publisher and responsive ad-unit IDs.

**Effort:** S
**Priority:** P1
**Depends on:** Google AdSense approval and publisher credentials

## Completed
