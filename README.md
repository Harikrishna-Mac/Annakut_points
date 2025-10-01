Got it! Here’s a **simpler, clean GitHub-ready `README.md`** for your **Annakut Points** project:

````markdown
# 🏆 Annakut Points System

Annakut Points is a web-based point management system for Mandir communities.  
It allows admins to manage sevaks, track attendance, and record point transactions easily.

---

## Features

- Admin dashboard for managing sevaks
- Track attendance (on-time & late)
- Automatic points calculation
- View transaction history per sevak
- Export transaction history to CSV
- Generate and download QR codes for sevaks
- Search and sort sevaks by points, attendance, or transactions

---

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS  
- **Backend:** Next.js API Routes  
- **Authentication:** Clerk  
- **Database:** MySQL / PostgreSQL  
- **Deployment:** Vercel  

---

## Setup

1. **Clone the repository**
```bash
git clone https://github.com/Harikrishna-Mac/Annakut_points.git
cd Annakut_points
````

2. **Install dependencies**

```bash
npm install
```

3. **Environment variables**
   Create a `.env.local` file and add your configuration:

```env
NEXT_PUBLIC_CLERK_FRONTEND_API=your_clerk_frontend_api
CLERK_API_KEY=your_clerk_api_key
DATABASE_URL=mysql://user:password@host:port/database
ATTENDANCE_ON_TIME_HOUR=7
ATTENDANCE_ON_TIME_MINUTE=30
ATTENDANCE_ON_TIME_POINTS=10
```

4. **Run locally**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage

* Login as Admin via Clerk
* Add sevaks using the **Add Sevak** page
* Mark attendance on the **Attendance** page
* View leaderboard and transaction history
* Export transaction history or download QR codes for sevaks

---

## License

MIT License

```

This keeps it simple and clear for GitHub.  

If you want, I can also make a **super minimal one-page version** that’s even shorter for quick projects. Do you want me to do that?
```