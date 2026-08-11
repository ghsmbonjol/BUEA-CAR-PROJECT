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
- Second-vow list.
- Groq-powered WhatsApp reminder drafting with an admin review step.
- WhatsApp Business Platform send endpoint.
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
4. Add all values from `.env.example` under **Project Settings > Environment Variables**.
5. Deploy.

Each future push/commit to the connected GitHub repository can create a new Vercel deployment.

## Environment variables

Copy `.env.example` and configure the same names in Vercel. The following secrets must remain server-side only:

- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `WHATSAPP_ACCESS_TOKEN`

Do not prefix secret keys with `NEXT_PUBLIC_`.

## Groq AI behaviour

The AI is deliberately instructed to:
- use a warm Christian greeting such as “Peace and grace be multiplied unto you”;
- state pledged, given and outstanding figures exactly as supplied by the database;
- avoid threats, pressure, made-up promises of blessing or fabricated Bible quotations;
- keep reminder messages human, concise and respectful;
- draft stakeholder letters that remain editable before use.

## WhatsApp setup

The included `/api/whatsapp/send` route uses the WhatsApp Cloud API text-message endpoint. For production reminders, configure a Meta business portfolio, WhatsApp Business Account, business phone number and the required access token/phone-number ID.

**Important:** business-initiated messages can require approved WhatsApp message templates depending on the conversation state and Meta's current messaging rules. The project includes a `WHATSAPP_TEMPLATE_NAME` placeholder so template-mode sending can be added. Do not bulk-message members without the appropriate consent/opt-in and church communication policy.

## Recommended phase-2 additions

- Receipt/image upload to Supabase Storage.
- Printable PDF receipts for each contribution.
- CSV/Excel export for auditors and committee meetings.
- Admin roles: Regional Admin, Treasurer, Group Coordinator, Read-only Auditor.
- Approval workflow before recording “other purpose” expenditure.
- Reversal/correction transactions instead of deleting financial records.
- WhatsApp delivery status webhooks.
- Automatic scheduled reminder queue only for members who have opted in.
- Project target amount and vehicle purchase milestone tracker.
- Formal audit-log triggers for every financial change.
- Backups and a monthly reconciliation report signed by the responsible officers.

## Financial meaning of dashboard figures

- **Total vowed** = all pledge/vow amounts.
- **Money received** = actual contribution transactions only.
- **Outstanding vows** = pledged minus received against each vow.
- **Car-project spending** = recorded expenditures categorized as car project.
- **Other-purpose use** = recorded expenditures categorized as other purpose.
- **Cash balance** = money received minus all recorded expenditures.

This separation is intentional: promises should never be counted as cash in hand.

## Browser icon and social sharing preview

The project includes a Deeper Life logo favicon and a 1200×630 Open Graph social card for WhatsApp, Facebook, LinkedIn and other services that read Open Graph metadata.

- Browser favicon: `public/favicon.ico` and PNG icon variants
- Social preview card: `public/social-share.png`
- Social metadata: `app/layout.js`
- Optional public site URL: `NEXT_PUBLIC_SITE_URL=https://buea-car-project.vercel.app`

After changing these files in GitHub, redeploy the project in Vercel. Browsers and WhatsApp may cache old icons/previews, so a hard refresh or sharing the URL once with a harmless query string such as `?v=2` can help test the new preview.
