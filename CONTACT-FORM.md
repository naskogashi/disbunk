# Public contact form

The Albanian `/kontakt` and English `/en/contact` pages render the complete form in HTML. `public/contact-form.js` adds file previews, removal, validation and asynchronous submission without loading the React workspace bundle. Login and authenticated pages use the same fixed-width language-button design; public pages retain real language counterpart links.

Messages go only to `info@disbunk.org`, as confirmed by the owner. GitHub sign-in remains enabled; project repository links and the structured-data repository reference were removed from the website.

## Contact delivery

- Deploy `supabase/functions/contact-message/index.ts` with `_shared/email.ts`. The dashboard deployment inlines the shared template; CLI deployment supports the relative import.
- Apply `supabase/migrations/202610230004_contact_limits.sql` first. The limiter table uses RLS and the reservation RPC is executable only by service_role. Anonymous visitors cannot read or write it directly.
- This is an intentionally public endpoint (`verify_jwt=false`), approved by the owner. It does not change authentication settings for other functions.
- It reuses server-only `SMTP2GO_API_KEY` and optional `AUTH_EMAIL_FROM`. The default sender is `DISBUNK.org <no-reply@disbunk.org>`.
- Recipient is fixed in server code. Visitor email is used only as Reply-To; it cannot choose a recipient or sender.
- Up to three attachments, 10 MiB each, with a bounded 31 MiB multipart body. Allowed: PDF, JPG/JPEG, PNG, GIF, WebP, DOC, DOCX, ODT, RTF and TXT. File headers are checked in addition to extensions. This is format validation, not antivirus scanning.
- Attachments are streamed one at a time to SMTP2GO to avoid constructing a single large encoded payload. They are not published or persisted in Supabase storage. The project inbox and mail provider receive the submitted files.
- A honeypot, three attempts per client/hour and a global ceiling of 50/day limit abuse. The limiter stores salted client hashes and counters, not message bodies or raw IP addresses. Expired limiter entries are removed on subsequent reservations.
- Failed submissions retain the visitor's text and selected files. Success is shown only after the provider accepts the message.

## Validation

Automated tests mock mail delivery; no test email was sent, at the owner's request. Live endpoint checks used only invalid formats, forged attachment signatures and disallowed origins, all rejected before contacting the mail provider. Actual mailbox delivery has not been exercised in this task.

Public display dates use Albanian `dd.mm.yyyy` or an English month name. Machine-readable datetime, sitemap and schema dates remain ISO 8601.
