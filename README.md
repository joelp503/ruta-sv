# Ruta SV MVP v3 — Supabase + Admin Dashboard

This version adds a simple admin dashboard to the Ruta SV MVP.

## What is included

- Public tourism directory using live Supabase data
- Places, itineraries, events, and business submissions
- Admin login route: `#/admin`
- Admin dashboard to:
  - Add new place listings
  - Edit existing place listings
  - Update listing images using `image_url`
  - Publish/hide listings
  - Review business submissions
  - Mark submissions approved or rejected
  - Copy a submission into the Add Place form

## Important security note

The frontend uses your Supabase anon public key, which is safe for public websites. Do not add your `service_role` key to any frontend file.

Admin editing works only after you run the extra SQL policies in `admin-setup.sql` and approve your admin user.

## Setup steps

### 1. Upload/deploy this folder

You can test locally by opening `index.html`, or run:

```bash
python3 -m http.server 8080
```

Then visit:

```text
http://localhost:8080
```

If using Netlify, drag this folder into Netlify Drop.

### 2. Run the admin SQL

In Supabase:

1. Go to SQL Editor.
2. Open `admin-setup.sql` from this folder.
3. Copy everything except the final commented insert line.
4. Paste it into Supabase SQL Editor.
5. Click Run.

### 3. Create your admin login

1. Open the app.
2. Go to `#/admin`.
3. Click `Create Admin Account` using your email/password.

If Supabase email confirmation is enabled, check your email and confirm the account.

### 4. Approve your account as admin

After creating the account, go back to Supabase SQL Editor and run this, replacing the email:

```sql
insert into admin_users (id, email)
select id, email from auth.users where email = 'YOUR-EMAIL-HERE';
```

Then refresh the app, go to `#/admin`, and log in.

## How to update listing images

1. Go to `#/admin`.
2. Log in.
3. Scroll to Manage Places.
4. Click `Edit` on a listing.
5. Replace the `Image URL` field.
6. Click `Save Place`.

For now, images should be direct public URLs ending in `.jpg`, `.png`, or `.webp`, or public Supabase Storage URLs.

## Current limitation

This v3 admin dashboard manages places and submissions. Itineraries and events are still managed directly in Supabase for now. Those can be added to the admin panel in the next version.
