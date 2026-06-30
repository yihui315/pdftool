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

## Product Expansion

### Add split rescue when compression cannot safely meet the limit

**What:** Offer a handoff to the existing PDF splitter when a document cannot reach the selected size limit within the approved technical quality floor.

**Why:** Some portals allow multiple files, and splitting can rescue a submission without forcing unreadable raster quality.

**Context:** The CEO review for the upload-ready assistant deferred this from v1. Before implementation, validate that the target portal permits multiple uploads and make the UI state that limitation explicitly. Reuse the existing split flow instead of duplicating page extraction logic.

**Effort:** M
**Priority:** P2
**Depends on:** Upload-ready assistant v1 and evidence that target portals accept split files

### Add maintained portal presets

**What:** Provide sourced presets for common exam, job and government upload portals, including size and file-format limits.

**Why:** A verified preset can remove guesswork and make the assistant faster for repeatable submission workflows.

**Context:** The CEO review deferred this because portal rules change and an incorrect preset could cause a failed submission. Each preset needs an authoritative source URL, last-verified date, owner and expiry/recheck policy. Do not infer unsupported rules.

**Effort:** M
**Priority:** P3
**Depends on:** User interviews, real portal examples and a maintenance owner

### Add offline PWA support

**What:** Cache the static interface and PDF processing assets so the core workflow can run after the first visit without a network connection.

**Why:** Offline operation reinforces the local-processing promise and helps users with unreliable connectivity.

**Context:** The CEO review deferred this until the single-file workflow is validated. The design must address cache versioning, stale worker assets, update recovery, privacy disclosures and the fact that AdSense cannot operate offline.

**Effort:** M
**Priority:** P3
**Depends on:** Validated upload-ready workflow and stable asset versioning

### Expand to a multi-file submission checklist

**What:** Let users prepare several application documents, assign a separate limit to each file and track completion across the submission set.

**Why:** This could turn a one-off compressor into a complete application-material workflow.

**Context:** The CEO review deferred this because multi-file memory pressure, cancellation, partial failures and state recovery would substantially expand v1. Revisit only after single-file adoption and failure data justify the added state model.

**Effort:** L
**Priority:** P3
**Depends on:** Single-file usage evidence, browser memory measurements and validated recovery behavior

## Completed
