# Auth & paywall setup guide

Use this with the step-by-step instructions in chat. Do one step at a time and tell the assistant when you're done before moving on.

---

## Step 1: Set NEXTAUTH_URL and NEXTAUTH_SECRET in .env

- **NEXTAUTH_URL**  
  Leave exactly as: `http://localhost:3000`  
  (This is the address of your app when you run it on your computer.)

- **NEXTAUTH_SECRET**  
  Replace the placeholder with a long random string (at least 32 characters).  
  Two ways to get one:
  1. Use a generator: go to https://generate-secret.vercel.app/32 and copy the result.
  2. Or use a random phrase you make up, e.g. `my-app-secret-key-2024-super-long-and-random`.

Paste that value after the `=` so the line looks like:
`NEXTAUTH_SECRET=your-pasted-or-typed-secret-here`

Save the `.env` file (it lives in your project root: `New folder`).

**Success:** The `.env` file is saved with `NEXTAUTH_URL=http://localhost:3000` and `NEXTAUTH_SECRET=` followed by your long secret. Leave `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` empty for now.

---

## Step 2: Google OAuth (see chat for click-by-click)

After Step 2 you will paste:
- **GOOGLE_CLIENT_ID** into `.env` after `GOOGLE_CLIENT_ID=`
- **GOOGLE_CLIENT_SECRET** into `.env` after `GOOGLE_CLIENT_SECRET=`

---

## Step 3: Prisma (see chat for commands one at a time)

---

## Step 4: Test paid content (see chat for Prisma Studio)
