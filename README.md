# SYHO Event Manager

A static, mobile-friendly workspace for Sing Your Heart Out booking confirmations and invoices. No accounts, backend, analytics, remote fonts, or runtime dependencies.

## Pages

- `/`: Home page with links to both tools.
- `/invoice/`: Existing invoice builder, including business settings, flat discounts, PDF download, sharing, and printing.
- `/booking-confirmation/`: Booking details, live document preview, PDF download, sharing, and printing.

## Local preview

Use Node.js 22 or later. Run `npm start`, then visit http://localhost:4174. Run `npm test` for invoice regression tests, booking calculations, optional content, HTML escaping, PDF pagination, and edit invalidation.

The preview server also supports `/syho-event-manager/` to check the same relative paths used by GitHub Pages.

## Booking confirmations

Primary contact, phone, event date, venue address, setup time, start time, and end time are required. Client/organization and venue name are optional. The hourly rate is fixed at $100.

Scheduled time is calculated to the minute. An end time earlier than the start means the following day; identical start/end times are rejected. Estimated total is service duration × $100, minus the enabled flat discount, plus the enabled travel fee. Service cost rounds to cents. The total cannot be negative.

The discount and travel toggles control both the displayed lines and the calculation. Turning an option off excludes its value, even if an amount was entered earlier. “Bring my own lyrics monitor” adds the agreed sentence that Sing Your Heart Out will provide a monitor; otherwise the line is omitted.

Generate the confirmation after completing required fields. Any edit disables export until it is generated again. PDF and preview use the same document blocks and policy wording. PDFs use locally rendered JPEG pages at 180 DPI; text is not selectable. Native file sharing requires a supported browser and HTTPS (or localhost). Otherwise, save the PDF and attach it manually. Print is available as a PDF fallback.

## Privacy

Event and client details remain in memory and reset on navigation or reload. Save generated PDFs for your records. Invoice business/payment settings use the existing `syho-business-v1` localStorage key and remain in the current browser. Storage is tied to the website origin, so settings can be reused with an existing site on the same GitHub Pages origin. A different domain or browser requires re-entering them. Browser storage is not encrypted.

Never commit filled-in settings, client data, or generated documents.

## Publish as a new GitHub repository

This folder is a separate project. Do not push it to `syho_invoice_builder` or change that repository's remote.

1. Create a new public repository named `syho-event-manager` under `oldschoolvirgo`, without adding an initial README or license.
2. Push this folder's independent Git repository to `https://github.com/oldschoolvirgo/syho-event-manager.git`.
3. In the new repository's **Settings → Pages**, choose **Deploy from a branch**, **main**, and **/ (root)**.
4. Visit `https://oldschoolvirgo.github.io/syho-event-manager/` after deployment finishes.

Keep `.nojekyll`, the HTML pages, JavaScript, CSS, favicon, and fonts in the published root. No build step is needed. All navigation and assets use relative paths, so both the project URL and a future custom domain work.

The original invoice repository and its published URL remain unchanged. Future Event Manager changes belong in this new repository.
