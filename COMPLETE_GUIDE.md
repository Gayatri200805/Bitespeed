# BiteSpeed Identity Reconciliation - Complete End-to-End Guide

## What is this task?

BiteSpeed wants you to build a backend service that can **link different orders made by the same customer** even when they use different emails and phone numbers. The idea is: if two orders share either the same email OR the same phone number, they belong to the same person.

You need to build a single API endpoint: **POST /identify** that accepts an email and/or phone number, links contacts together in a database, and returns the consolidated contact info.

---

## How the Logic Works (Plain English)

Think of it like a detective board with strings connecting clues:

**Scenario 1 - Brand new customer:**
Someone orders with email=alice@test.com, phone=111. No matches in DB. Create a new "primary" contact row.

**Scenario 2 - Same customer, new info:**
Someone orders with email=bob@test.com, phone=111. The phone 111 already exists from Scenario 1! So this is the same person. Create a "secondary" contact linked to the primary one (id=1).

**Scenario 3 - Merging two separate customers:**
Say Contact A (id=11, email=george@test.com, phone=919) is primary. Contact B (id=27, email=biff@test.com, phone=717) is also primary. Now someone orders with email=george@test.com and phone=717. This links the two! The OLDER one (id=11) stays primary, and the NEWER one (id=27) becomes secondary under id=11.

**The response always returns:** the primary contact's ID, all emails (primary's first), all phones (primary's first), and all secondary contact IDs.

---

## Tech Stack

- **Node.js + TypeScript** (preferred by BiteSpeed)
- **Express.js** for the web server
- **Prisma ORM** for database access
- **PostgreSQL** for the database (free on Render)

---

## Project File Structure

```
bitespeed-identity/
  prisma/
    schema.prisma          -- Database table definition
  src/
    index.ts               -- Express server, routes, validation
    identify.ts            -- Core business logic (the brain)
  package.json             -- Dependencies and scripts
  tsconfig.json            -- TypeScript configuration
  .env                     -- Environment variables (DATABASE_URL)
  .gitignore               -- Files to exclude from Git
  README.md                -- Project documentation
```

---

## Step-by-Step Setup Instructions

### STEP 1: Create the project folder

Open a terminal and run:

```bash
mkdir bitespeed-identity
cd bitespeed-identity
```

### STEP 2: Initialize and install dependencies

```bash
npm init -y
npm install express @prisma/client prisma
npm install -D typescript @types/express @types/node ts-node
npx tsc --init
```

### STEP 3: Create the folder structure

```bash
mkdir src prisma
```

### STEP 4: Create each file

Copy the contents of each file from the provided project files into the corresponding location. The files you need to create are:

1. **package.json** - Already created, but replace its contents with the provided version
2. **tsconfig.json** - Replace with the provided version
3. **prisma/schema.prisma** - The database schema
4. **src/index.ts** - The Express server
5. **src/identify.ts** - The core logic
6. **.gitignore** - Git ignore rules
7. **.env** - Environment variables

### STEP 5: Set up the database locally

For local development, you can use SQLite. Create a `.env` file:

```
DATABASE_URL="file:./dev.db"
PORT=3000
```

And change `provider = "postgresql"` to `provider = "sqlite"` in `prisma/schema.prisma`.

Then run:

```bash
npx prisma generate
npx prisma db push
```

### STEP 6: Build and run

```bash
npx tsc
node dist/index.js
```

Server starts at http://localhost:3000

### STEP 7: Test it!

Open another terminal and run these curl commands:

**Test 1 - Create first contact:**
```bash
curl -X POST http://localhost:3000/identify -H "Content-Type: application/json" -d "{\"email\": \"lorraine@hillvalley.edu\", \"phoneNumber\": \"123456\"}"
```
Expected: New primary contact created with id=1.

**Test 2 - Link a second contact (same phone, different email):**
```bash
curl -X POST http://localhost:3000/identify -H "Content-Type: application/json" -d "{\"email\": \"mcfly@hillvalley.edu\", \"phoneNumber\": \"123456\"}"
```
Expected: Secondary contact created, linked to primary (id=1). Response shows both emails.

**Test 3 - Query by email only:**
```bash
curl -X POST http://localhost:3000/identify -H "Content-Type: application/json" -d "{\"email\": \"mcfly@hillvalley.edu\"}"
```
Expected: Returns the same consolidated contact group.

---

## How to Deploy on Render (Free Hosting)

### Part A: Create a PostgreSQL Database

1. Go to https://render.com and sign up (use GitHub login for easiness)
2. Click **New** then **PostgreSQL**
3. Set Name = "bitespeed-db", select Free plan
4. Click **Create Database**
5. Wait for it to spin up, then copy the **Internal Database URL**
   (looks like: postgresql://user:pass@host:5432/dbname)

### Part B: Push Code to GitHub

1. Create a new repository on GitHub (name it "bitespeed-identity")
2. **IMPORTANT:** Before pushing, change `prisma/schema.prisma` back to `provider = "postgresql"` (not sqlite)
3. Run these commands:

```bash
git init
git add .
git commit -m "Initial commit: Identity reconciliation service"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bitespeed-identity.git
git push -u origin main
```

**Tip from the task sheet:** Make small commits with insightful messages. So instead of one big commit, you could do:

```bash
git add prisma/schema.prisma
git commit -m "feat: add Contact model with Prisma schema"

git add src/index.ts
git commit -m "feat: setup Express server with /identify endpoint"

git add src/identify.ts
git commit -m "feat: implement identity reconciliation logic"

git add package.json tsconfig.json .gitignore .env.example README.md
git commit -m "chore: add project config and documentation"
```

### Part C: Deploy the Web Service

1. On Render, click **New** then **Web Service**
2. Connect your GitHub account and select the bitespeed-identity repo
3. Configure these settings:
   - **Name:** bitespeed-identity
   - **Runtime:** Node
   - **Build Command:** `npm install && npx prisma generate && npx prisma db push && npm run build`
   - **Start Command:** `npm start`
4. Under **Environment**, add a variable:
   - Key: `DATABASE_URL`
   - Value: (paste the Internal Database URL from Part A)
5. Click **Create Web Service**
6. Wait 2-3 minutes for it to deploy

### Part D: Update README with live URL

Once deployed, Render gives you a URL like `https://bitespeed-identity.onrender.com`. Update your README.md with this URL and push again:

```bash
git add README.md
git commit -m "docs: add live endpoint URL"
git push
```

### Part E: Submit

Go to the submission form link from the email and submit:
- Your GitHub repo URL
- Your live endpoint URL

---

## Understanding the Code (identify.ts)

Here is what each step in the core logic does:

**Step 1 - Find matches:** Query the database for any existing contacts that share the incoming email OR phone number.

**Step 2 - No matches:** If nothing found, this is a new customer. Create a primary contact and return it.

**Step 3 - Find primary IDs:** For each matching contact, figure out which primary contact it belongs to. If it IS a primary, use its own ID. If it is secondary, follow linkedId to find the primary.

**Step 4 - Merge primaries:** If the incoming request connects two previously separate primary contacts (they shared no info before), the OLDER primary stays primary. The NEWER primary gets demoted to secondary, and all its secondaries get re-pointed to the older primary.

**Step 5 - Get the true primary:** After any merging, fetch the single remaining primary contact.

**Step 6 - Create secondary if needed:** If the incoming request brings genuinely new information (a new email or phone not yet in this contact group), create a new secondary contact.

**Step 7 - Fetch final state:** Re-fetch all contacts in the group for an accurate response.

**Step 8 - Build response:** Assemble the response with primary's email/phone first, then add unique emails and phones from secondaries.

---

## Common Issues and Fixes

**"Cannot find module @prisma/client"**
Run: `npx prisma generate`

**"Database does not exist"**
Run: `npx prisma db push`

**Port already in use**
Change PORT in .env or kill the process using that port.

**Render deploy fails**
Check that prisma/schema.prisma uses `provider = "postgresql"` (not sqlite) and that DATABASE_URL is set correctly in Render environment variables.

**Response has "primaryContatctId" (typo)**
Yes, this is intentional! The task spec has this typo. Keep it exactly as "primaryContatctId" to match their expected response format.

---

## Quick Summary for the Interview Discussion

If shortlisted, be ready to discuss:

1. **Why Prisma?** - Type-safe ORM, auto-generates TypeScript types from schema, easy migrations
2. **How linking works** - Union-Find concept: contacts are linked transitively through shared email/phone
3. **Why oldest = primary?** - Deterministic rule to avoid ambiguity when merging two primaries
4. **Edge cases handled:** New customer, linking via email, linking via phone, merging two separate groups, idempotent requests (same data twice doesn't create duplicates)
5. **Time complexity:** O(n) where n = number of contacts in the linked group, since we do a constant number of DB queries per request
