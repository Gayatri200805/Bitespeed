# BiteSpeed Identity Reconciliation Service

A web service that consolidates customer contact information across multiple purchases by linking related contacts via shared email addresses or phone numbers.

## Live Endpoint

**Identify Endpoint:** POST https://bitespeed-api-0179.onrender.com/identify

*(Replace with your actual Render URL after deployment)*

## Tech Stack

- Node.js with TypeScript
- Express.js
- Prisma ORM
- PostgreSQL (hosted on Render)

## How It Works

The /identify endpoint receives an email and/or phone number and:

1. Searches the database for any existing contacts matching that email or phone
2. Creates a new primary contact if no matches are found
3. Creates a secondary contact if the request shares one field but introduces new info
4. Merges two separate primary contacts if the request links two previously unconnected groups
5. Returns a consolidated view with all linked emails, phone numbers, and secondary IDs

## Local Setup

1. Clone this repo
2. Run npm install
3. Create .env with DATABASE_URL and PORT=3000
4. For local SQLite: change provider in prisma/schema.prisma to sqlite, set DATABASE_URL=file:./dev.db
5. Run: npx prisma db push && npx prisma generate
6. Run: npm run build && npm start

## Deployment on Render

1. Create free PostgreSQL on render.com, copy Internal Database URL
2. Push code to GitHub (ensure schema.prisma uses provider=postgresql)
3. Create Web Service on Render, connect repo
4. Build Command: npm install && npx prisma generate && npx prisma db push && npm run build
5. Start Command: npm start
6. Set DATABASE_URL env var with your PostgreSQL URL

## Project Structure

- prisma/schema.prisma - Database schema (Contact model)
- src/index.ts - Express server and /identify route
- src/identify.ts - Core identity reconciliation logic
