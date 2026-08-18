# Buea Regional Car Project Management System

A deployable starter admin portal for the Deeper Life Buea Region vehicle project, branded **Designed by JODEL TECHNOLOGIES**.

## What is included

- Member/name register grouped under:
  - Molyko Group
  - Buea Town Group
  - Bolifamba Group
  - Muea Group
- First, second and later vows, with a rule that a new vow is recorded only after the previous one is fulfilled.
- Contributions received against each person's vow.
- Automatic amount-given and balance-left calculations.
- Separate tracking for money used for the car project and money used for any other purpose.
- Group performance dashboard.
- Admin-managed regional car target amount with separate commitment and paid/carryover progress.
- Carryover/opening money that can be labelled “Congregation contribution”, “First vow total amount”, or another clear name.
- Alphabetically sorted vow register plus a one-click WhatsApp-ready A–Z posting list.
- Safe vow corrections: edit a wrongly entered amount or note, and change the member before any payment is attached.
- Second-vow list.
- Groq-powered reminder drafting with an admin review step.
- No-API WhatsApp sending flow: the system opens WhatsApp click-to-chat with the message prefilled.
- Bulk SMS preparation: group filtering, personalized message templates, clean phone lists and CSV export for upload to an SMS provider portal.
- Automatic digits-only phone cleanup in both the browser and Supabase.
- Groq-powered stakeholder letter drafting in a respectful Christian tone.
- Supabase Auth + Postgres + Row Level Security.
- Vercel-ready Next.js app and GitHub-ready source folder.

## Logo and colour theme

The supplied **Deeper Life Bible Church** logo is included at `public/deeper-life-logo.png` and is already used on the login screen and top navigation. The interface palette has been updated to the logo's navy blue, red, light blue and white colours.

## Preloaded Bolifamba Group members

The following names are automatically inserted under **Bolifamba Group** when `supabase/schema.sql` is run:

1. Ngale Mathias
2. Ngale Geraldine
3. Sylvia Ambe
4. Celestine Ambe
5. Pa Ivo
6. Sister Alice
7. Nwanbo Gladys
8. Charles Atukenye
9. Nehemah
10. Jeremah

If the original database schema has already been deployed, run `supabase/add-bolifamba-members.sql` once in the Supabase SQL Editor instead. The insert is duplicate-safe for matching names in Bolifamba Group.

## Car target amount

The admin portal now includes **Admin Settings > Regional car target amount**. Enter the approved target in FCFA and click **Save target amount**. The value is stored in Supabase and the dashboard automatically shows the target, percentage raised, and amount still needed based on actual contributions received.

If you already deployed an earlier version of the database, run `supabase/add-car-target-setting.sql` once in **Supabase > SQL Editor** before deploying this updated code. New installations do not need that migration because `supabase/schema.sql` already includes the setting.

## Carryover / congregation contribution

Under **Admin Settings > Carryover / congregation contribution**, enter money that was already received before detailed member-by-member tracking began. The display name is editable, so the same field can be called **Carryover**, **Congregation contribution**, **First vow total amount**, or another description used by the committee.

The app keeps two target balances:

- **Commitment balance** = target minus carryover minus all recorded vows. This decreases as new vows come in.
- **Cash still needed** = target minus carryover minus actual contribution payments. This decreases only when money is already carried over or actually paid.

This prevents unpaid vows from being treated as cash. If the carryover amount already represents earlier first-vow collections, do not enter the same money again as individual contribution transactions.

For an existing deployment, run `supabase/add-carryover-setting.sql` once in **Supabase > SQL Editor** before deploying this version. New installations already include the fields in `supabase/schema.sql`.

The **Vows** tab also includes a **WhatsApp vow posting list**. It sorts names alphabetically and includes the carryover line, each vow amount, amount paid, balance, and a simple status such as `PAID`, `PART-PAID`, or `VOWED`. Click **Copy for WhatsApp** and paste the prepared text into the group.

### Correcting a wrongly entered vow

In the **Vows** tab, click **Edit** beside a vow. The vow amount and notes can be corrected. The member can also be changed while no payment has been attached to that vow. Once a payment exists, the member is locked so the payment history remains connected correctly. The app prevents reducing a vow below money already paid and prevents an edit that would invalidate a later vow.

## Drag-and-drop / dashboard deployment path

### 1. Supabase
1. Create a Supabase project.
2. Open **SQL Editor**.
3. Open `supabase/schema.sql` from this project, copy all of it, paste into a new query and click **Run**.
4. Go to **Authentication > Users** and create the regional admin email/password.
5. Copy the new user's UUID.
6. Run the final `insert into public.profiles...` statement shown at the bottom of `schema.sql`, replacing the UUID.
7. From project settings, copy the project URL, publishable key and service-role key.

### 2. GitHub — browser upload
1. Create a new private GitHub repository, for example `buea-regional-car-project`.
2. Extract this ZIP on your computer.
3. In the empty GitHub repository choose **Add file > Upload files**.
4. Drag the extracted files/folders into GitHub and commit them.
5. Never upload your real `.env` file or API secret keys.

### 3. Vercel — import from GitHub
1. In Vercel choose **Add New > Project**.
2. Import the GitHub repository.
3. Vercel should detect Next.js.
4. Add all values from `.env.example` under **Project Settings > Environment Variables**. WhatsApp API variables are no longer required.
5. Deploy.

Each future push/commit to the connected GitHub repository can create a new Vercel deployment.

## Environment variables

Copy `.env.example` and configure the same names in Vercel. The following secrets must remain server-side only:

- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`

Do not prefix secret keys with `NEXT_PUBLIC_`.

`GROQ_MODEL` should be set to `openai/gpt-oss-120b`. The app also automatically replaces the retired `llama-3.3-70b-versatile` and `llama-3.1-8b-instant` values with `openai/gpt-oss-120b`, so an older Vercel environment variable will not break AI reminders after deployment.

## Groq AI behaviour

The AI is deliberately instructed to:
- use a warm Christian greeting such as “Peace and grace be multiplied unto you”;
- state pledged, given and outstanding figures exactly as supplied by the database;
- avoid threats, pressure, made-up promises of blessing or fabricated Bible quotations;
- keep reminder messages human, concise and respectful;
- draft stakeholder letters that remain editable before use.

## WhatsApp without an API

The reminder page now uses WhatsApp's click-to-chat web link rather than a WhatsApp Cloud API route. The administrator generates/reviews the reminder and clicks **Open in WhatsApp**. WhatsApp Web, Desktop or the phone then opens the recipient conversation with the message prefilled.

The preferred project sender shown in the portal is **00237678662454**. A browser cannot choose or impersonate a WhatsApp sender account, so the administrator must make sure the WhatsApp session being used is actually logged in with that number before manually pressing Send. For the click-to-chat recipient URL, the app removes a leading `00` and uses the international digits.

No WhatsApp access token, phone-number ID or Graph API version is required for this mode.

## Phone-number cleanup

The member form accepts pasted phone numbers such as `+237 678-662-454`, but immediately stores/displays them as digits only, for example `237678662454`. The Supabase trigger provides a second layer of protection so direct database inserts or future edits are also normalized.

For an existing deployment, run `supabase/add-phone-normalization.sql` once in **Supabase > SQL Editor**. The migration also cleans phone numbers already stored in the members table.

## Bulk SMS

A web page cannot directly transmit carrier SMS messages without a messaging gateway/provider (or a physical modem/device connected to suitable software). The **Bulk SMS** tab therefore provides a no-API workflow: choose all groups or one church group, optionally limit recipients to outstanding vows, edit a personalized template, preview messages, copy the digits-only phone list, or download a CSV for upload to a bulk-SMS provider's web dashboard.

The CSV includes the requested sender/return number **00237678662454**, but the SMS provider and mobile networks determine whether that number or a registered sender ID can actually appear as the sender. If automatic bulk sending is required later, an approved SMS provider API can be added without changing the contribution/vow database model.

## Recommended phase-2 additions

- Receipt/image upload to Supabase Storage.
- Printable PDF receipts for each contribution.
- CSV/Excel export for auditors and committee meetings.
- Admin roles: Regional Admin, Treasurer, Group Coordinator, Read-only Auditor.
- Approval workflow before recording “other purpose” expenditure.
- Reversal/correction transactions instead of deleting financial records.
- Optional automatic SMS/WhatsApp provider integration if the church later chooses a compliant gateway.
- Automatic scheduled reminder queue only for members who have opted in.
- Vehicle purchase milestone tracker.
- Formal audit-log triggers for every financial change.
- Backups and a monthly reconciliation report signed by the responsible officers.

## Financial meaning of dashboard figures

- **Carryover / congregation contribution** = money already received before detailed transaction tracking began.
- **New vows recorded** = all pledge/vow amounts entered member by member after the carryover/opening amount.
- **Total committed** = carryover + all recorded vows. This is used to show how much of the target has been covered by commitments.
- **Paid on recorded vows** = actual contribution transactions received against member vows.
- **Paid + carryover** = carryover + actual contribution transactions. This is the real received-money figure used for cash target progress.
- **Outstanding vows** = pledged minus received against each recorded vow.
- **Car-project spending** = recorded expenditures categorized as car project.
- **Other-purpose use** = recorded expenditures categorized as other purpose.
- **Cash balance** = paid + carryover minus all recorded expenditures.
- **Commitment balance still needed** = target minus total committed.
- **Cash still needed** = target minus (paid + carryover).

This separation is intentional: vows can reduce the amount still needing commitments, but unpaid promises are never counted as cash in hand.

## Browser icon and social sharing preview

The project includes a Deeper Life logo favicon and a 1200×630 Open Graph social card for WhatsApp, Facebook, LinkedIn and other services that read Open Graph metadata.

- Browser favicon: `public/favicon.ico` and PNG icon variants
- Social preview card: `public/social-share.png`
- Social metadata: `app/layout.js`
- Optional public site URL: `NEXT_PUBLIC_SITE_URL=https://buea-car-project.vercel.app`

After changing these files in GitHub, redeploy the project in Vercel. Browsers and WhatsApp may cache old icons/previews, so a hard refresh or sharing the URL once with a harmless query string such as `?v=2` can help test the new preview.


## Daily Supabase keep-awake with Vercel Cron

This version includes a protected `GET /api/keep-alive` route and a `vercel.json` schedule that invokes it once per day at `05:00 UTC` (approximately 06:00 WAT in Cameroon; Vercel Hobby may invoke it at any point within that hour). The route makes three lightweight, harmless reads from Supabase, then stores the successful check time in `project_settings`. It does **not** create fake contributions, vows, members, or expenses.

For an existing Supabase database, run `supabase/add-vercel-cron-keep-alive.sql` once in **Supabase > SQL Editor**. Then add a Vercel environment variable named `CRON_SECRET` with a random value of at least 16 characters. Do not prefix it with `NEXT_PUBLIC_` and do not expose it in the browser. Redeploy the production site after adding the variable.

After deployment, open **Vercel > Project > Settings > Cron Jobs** and confirm `/api/keep-alive` is listed. In this app, **Admin Settings > System Status** shows the latest successful automatic database check. If the indicator says **Check overdue**, inspect the Vercel cron/function logs and confirm `CRON_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are configured.
