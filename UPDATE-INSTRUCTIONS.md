# Buea Car Project — Messaging Update

This update adds:

- WhatsApp sending without the WhatsApp Cloud API: **Open in WhatsApp** uses a click-to-chat link with the reminder prefilled.
- Preferred WhatsApp sender shown as **00237678662454**. The WhatsApp Web/Desktop/phone session must actually be logged in with that number; a website cannot choose the sender account for you.
- Automatic phone cleanup: `+`, spaces, dashes, hyphens and brackets are stripped so member phone values contain digits only.
- Supabase phone-normalization trigger so direct database inserts/updates are also cleaned.
- A **Bulk SMS** page that can filter recipients by group/outstanding vows, personalize a message template, copy the clean number list and export a CSV for a bulk-SMS provider portal.
- A single-member **Open SMS app** button on the reminder page.

## Update an existing deployment

1. In Supabase, open **SQL Editor > New query**.
2. Paste and run `supabase/add-phone-normalization.sql`.
3. In GitHub, replace `app/page.js` and `app/globals.css` with the files in this update package and commit.
4. Vercel should redeploy automatically from the GitHub commit.
5. The old `/app/api/whatsapp/send/route.js` may remain in your repository; the updated page no longer calls it. You can delete that route later if you want.
6. Old WhatsApp API environment variables are no longer needed for this mode. Groq is still used for AI drafting, so keep `GROQ_API_KEY` if you want AI-written reminders and letters.

## Bulk SMS note

The current Bulk SMS page prepares a CSV rather than transmitting SMS itself. Use the CSV in the web dashboard of your chosen SMS provider. If you later want one-click automatic SMS sending, the provider's approved API credentials can be integrated as a separate step.
