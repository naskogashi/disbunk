# Disbunk document review and delivery priorities

Reviewed on 23 October 2026: `DISINFO TOOLKIT.pdf` (7 pages) and `Case Study.pdf`
(6 pages), supplied by the owner. Their text describes requirements and context;
it does not authorize external sharing or establish that pictured features work.
Legal statements in the toolkit are not treated as independently verified law.

## Fit against the documents

| Expected outcome | Current implementation and remaining work |
| --- | --- |
| Claims tracking | Claims, sources, statuses, assignments and triage exist. Add a source/timeline monitoring strategy rather than implying social sign-in collects posts. |
| Secure evidence | Private file storage, checksums and metadata-stripped image copies exist. Original preservation, document OCR and richer provenance/version history deserve a separate review. A checksum proves file consistency, not truth. |
| C5 model | Added context, causes, content, consequences and amplification notes, source references and an explicit uncertainty/intent assessment. Evidence of intent is required to select disinformation. This is human analysis, not an automated verdict. |
| Team coordination | Teams, leads, invitations, membership, tasks and pictures exist. Added audited team name/description editing for admins and team leads. Account management already supports approvals, role changes, suspension and deletion safeguards. |
| Response tools | Draft/approved templates, composition and manual distribution exist. External publishing, delivery retries and delivery receipts are not implemented. |
| Pattern detection | Current suggestions compare shared words. They miss paraphrases and many multilingual matches; a suggestion does not establish coordinated activity. Build and evaluate semantic retrieval before adopting automatic clustering. |
| Regional cooperation | English/Albanian UI exists. Added an admin Google translation preview for claim text and composed responses, with original preservation and explicit sharing consent. Activation needs a Google server key, enabled API, billing and quotas. Serbian UI localization remains separate work. |
| Future plans in case study | Social monitoring, a mobile companion and crowdsourced verification are explicitly future plans. Responsive pages alone are not a native/mobile offline app; existing comments alone are not a validated crowdsourcing workflow. |

## Integration decisions

1. Keep SMTP2GO as the email provider. SendGrid is redundant unless a deliberate
   failover requirement is introduced. SMS is a separate channel, not a reason to
   retain a combined SendGrid/Twilio placeholder.
2. Start with Google Cloud Translation for Albanian/Serbian/English passages.
   Evaluate quality on a reviewed regional sample. DeepL is an alternative;
   verify API language/model availability before switching. Translation does not
   verify a claim. Keep provider configuration admin-only and preserve originals.
3. DocumentCloud is useful for document search, OCR and annotated source material.
   Link existing sources first. Upload automation requires a verified account,
   permissions, redaction review and explicit choice of visibility. Its sharing
   model is separate from Supabase evidence permissions.
4. Choose one of Slack, Discord or Telegram based on where the team already works.
   Start with minimal alerts and signed-in Disbunk links, with team routing,
   retries, deduplication and delivery logs. Do not broadcast evidence contents.
5. Raindrop is optional for an existing bookmarking workflow. Disbunk already
   records links, so a second bookmark store is not a core requirement.
6. GitHub/GitLab APIs are for repository/workflow automation, not necessary for
   journalism verification. X/Facebook APIs are distinct monitoring/publishing
   integrations requiring separate permissions and product decisions. Removed
   the misleading combined catalog entry and the discontinued Pocket entry.
7. Facebook and X sign-in are supported by Supabase, but need registered OAuth
   apps and configured callbacks/secrets. Instagram is not a built-in Supabase
   social provider. Do not show unusable login buttons. Authentication is separate
   from reading social content or publishing posts, and approval remains required.

## What the algorithm notice means

- Word overlap: matches shared words, even when meanings differ.
- Embeddings: numerical text representations that can retrieve similar meanings,
  including multilingual matches if the selected model supports them.
- HDBSCAN: groups similar representations and can leave outliers ungrouped. It
  needs enough data, sensible parameters and evaluation; it is not a truth test.
- Automated fact-checking: searching evidence or proposing assessments is a
  separate pipeline. Neither embeddings nor clusters establish truth or intent.
  Analysts must review evidence and approve any public response.

The PDFs call for analytical tools; they do not prescribe HDBSCAN or autonomous
fact-checking. A practical next step is semantic candidate retrieval with human
confirmation, evaluated for Albanian/Serbian/English and false-positive rates.

## Activation and validation

- Migration 008 adds bounded C5 JSON notes, an audited team editing RPC and an
  admin-only restrictive integration policy. It does not promote any user.
- Production: migration 008 and updated `manage-users` / `account-actions` are
  deployed. `translate-content` is also deployed, with its legacy JWT gateway
  verification enabled and internal identity/admin checks. Translation remains
  inactive until provider credentials are configured.
- Manual creation now requires a password and administratively confirms the email.
  Setting a password through Admin also confirms an existing manually managed
  address. The UI explains this; admins must verify the address with the person.
  Self-registration email verification remains unchanged. No bulk confirmation of
  existing accounts is performed.
- Translation: add `GOOGLE_TRANSLATION_API_KEY` as a Supabase server secret, enable
  the Cloud Translation API, restrict the key to that API, and set provider quotas
  and budget monitoring. Never use a `VITE_` key. No paid API requests are made by
  deployment. Current per-request limit is 5000 characters; access is admin-only.
- Test nonadmin denial, suspended denial, concurrent edits, original preservation,
  provider errors and representative translation quality before wider rollout.

Primary references: [Google languages](https://docs.cloud.google.com/translate/docs/languages),
[Google translate API](https://docs.cloud.google.com/translate/docs/reference/rest/v2/translate),
[DeepL API](https://developers.deepl.com/api-reference/translate/request-translation),
[DocumentCloud eligibility](https://help.muckrock.com/Who-can-use-DocumentCloud-19ef8892696381e3a415ed636c0c1579),
[DocumentCloud sharing](https://help.muckrock.com/Sharing-on-MuckRock-platforms-121f88926963803c93a1e0ce3f42c93f),
[Supabase providers](https://supabase.com/docs/guides/auth/social-login),
[Facebook setup](https://supabase.com/docs/guides/auth/social-login/auth-facebook),
[X setup](https://supabase.com/docs/guides/auth/social-login/auth-twitter).
