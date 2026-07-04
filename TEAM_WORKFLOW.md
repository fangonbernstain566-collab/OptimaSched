# Team Development Workflow (Git + Prisma + PostgreSQL)

## Objective

Follow this workflow **every time before starting work** to ensure your local repository and database schema are synchronized with the latest project changes.

> **Important:** This workflow synchronizes the **source code** and **database schema** only. It does **not** synchronize the actual database records (students, schedules, faculty, etc.). Data synchronization requires a shared PostgreSQL database or importing a database backup.

---

# Before You Start Coding

## Step 2. Save your current work

Check your Git status:

```bash
git status
```

If you have unfinished work, either commit it:

```bash
git add .
git commit -m "Save current progress"
```

or temporarily stash it:

```bash
git stash
```

---

## Step 3. Switch to the Main branch

```bash
git checkout main
```

---

## Step 4. Pull the latest project changes

```bash
git pull origin main
```

This downloads the latest source code and Prisma migration files from the repository.

---

## Step 5. Switch back to your working branch

Example:

```bash
git checkout your-branch-name
```

---

## Step 6. Merge the latest Main branch

```bash
git merge main
```

Resolve any merge conflicts before continuing.

---

## Step 7. Install new dependencies

If the project dependencies changed:

```bash
npm install
```

If your project has separate frontend and backend folders, run `npm install` in each folder.

---

## Step 8. Update the database schema

Navigate to the backend/server directory.

```bash
cd server
```

Apply all pending Prisma migrations:

```bash
npx prisma migrate dev
```

If your team uses `prisma db push` instead of migrations:

```bash
npx prisma db push
```

> **Note:** If `npx prisma migrate dev` reports schema drift (your local database doesn't match the migration history) and offers to reset the database, **do not accept the reset** without checking with the team first — it deletes all local data. Drift usually means someone applied a change with `db push` or a migration file is missing locally. In that situation, use `npx prisma db push` instead to sync the schema without touching existing data, then reconcile the migration history separately (e.g. `prisma migrate resolve`) once the drift's cause is understood.

---

## Step 9. Generate the Prisma Client

```bash
npx prisma generate
```

---

## Step 10. Seed the database (if applicable)

If the project includes a Prisma seed script:

```bash
npx prisma db seed
```

---

## Step 11. Start the application

Backend:

```bash
npm run dev
```

Frontend:

```bash
npm run dev
```

---

# Before Pushing Your Changes

Commit your work:

```bash
git add .
git commit -m "Describe your changes"
```

Push your branch:

```bash
git push origin your-branch-name
```

Create a Pull Request (PR) to merge your branch into the `main` branch.

---

# Database Synchronization

## Source Code

Source code is synchronized using Git.

```bash
git pull origin main
```

---

## Database Schema

Database schema is synchronized using Prisma migrations.

```bash
npx prisma migrate dev
```

---

## Database Records

Database records are **NOT synchronized** when using separate local PostgreSQL databases.

If one developer adds students, instructors, schedules, or other records to their local database, those records will **not** automatically appear in other developers' databases.

To synchronize data across the team, use one of the following approaches:

* Shared PostgreSQL database (recommended)
* Database backup and restore
* Prisma seed script for sample/default data

---

# Standard Workflow Summary

```text
Start Work
    │
    ▼
git checkout main
    │
git pull origin main
    │
git checkout <your-branch>
    │
git merge main
    │
npm install
    │
cd server
    │
npx prisma migrate dev
    │
npx prisma generate
    │
npm run dev
    │
Begin Development
```

Following this workflow before every development session helps ensure that every team member works from the latest codebase and database schema while minimizing merge conflicts and migration issues.
