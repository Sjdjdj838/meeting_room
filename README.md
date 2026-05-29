# Meeting Room Booking System

A simple and scalable meeting room booking application built for managing office room reservations.

This project allows employees to check room availability, reserve meeting slots, cancel bookings, and manage schedules without booking conflicts.

Built with Next.js, TypeScript, Node.js, MongoDB, and Redis.

---

# Features

* User login & authentication
* Meeting room booking
* Cancel or reschedule bookings
* Prevent overlapping reservations
* Admin dashboard
* Room availability tracking
* Responsive UI
* JWT-based auth
* Redis caching support
* Role-based access control

---

# Tech Stack

## Frontend

* Next.js
* TypeScript
* Tailwind CSS
* React Query
* Zustand

## Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* Redis
* JWT
* Zod

---

# Project Structure

```bash id="7x3wd9"
meeting-room-booking/
├── backend/
├── frontend/
└── README.md
```

---

# Environment Variables

## Backend

```env id="3hwr9q"
PORT=5000

MONGO_URI=

REDIS_URL=

JWT_SECRET=
JWT_REFRESH_SECRET=
```

## Frontend

```env id="cv6p4f"
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

# Getting Started

## Clone the project

```bash id="a2h81z"
git clone <repo-url>

cd meeting-room-booking
```

---

# Backend Setup

```bash id="c6v1m2"
cd backend

npm install

npm run dev
```

Backend will run on:

```bash id="y4t1pk"
http://localhost:5000
```

---

# Frontend Setup

```bash id="t9x1wb"
cd frontend

npm install

npm run dev
```

Frontend will run on:

```bash id="0lzqk9"
http://localhost:3000
```

---

# Build for Production

## Backend

```bash id="d74z0j"
npm run build
npm start
```

## Frontend

```bash id="c4yzl8"
npm run build
npm start
```

---

# API Routes

## Auth

```http id="4u3qwp"
POST /api/auth/register
POST /api/auth/login
```

## Rooms

```http id="82m4kc"
GET /api/rooms
POST /api/rooms
```

## Bookings

```http id="m6t4dz"
POST /api/bookings
PATCH /api/bookings/:id/cancel
```

---

# Admin Features

Admins can:

* Create meeting rooms
* Disable rooms
* View all bookings
* Manage users
* Check booking activity

---

# Future Improvements

* Email notifications
* Google Calendar sync
* WebSocket updates
* Multi-office support
* Meeting reminders

---

# License

MIT
=======
# Meeting Room Booking System

A simple and scalable meeting room booking application built for managing office room reservations.

This project allows employees to check room availability, reserve meeting slots, cancel bookings, and manage schedules without booking conflicts.

Built with Next.js, TypeScript, Node.js, MongoDB, and Redis.

---

# Features

* User login & authentication
* Meeting room booking
* Cancel or reschedule bookings
* Prevent overlapping reservations
* Admin dashboard
* Room availability tracking
* Responsive UI
* JWT-based auth
* Redis caching support
* Role-based access control

---

# Tech Stack

## Frontend

* Next.js
* TypeScript
* Tailwind CSS
* React Query
* Zustand

## Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* Redis
* JWT
* Zod

---

# Project Structure

```bash id="7x3wd9"
meeting-room-booking/
├── backend/
├── frontend/
└── README.md
```

---

# Environment Variables

## Backend

```env id="3hwr9q"
PORT=5000

MONGO_URI=

REDIS_URL=

JWT_SECRET=
JWT_REFRESH_SECRET=
```

## Frontend

```env id="cv6p4f"
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

# Getting Started

## Clone the project

```bash id="a2h81z"
git clone <repo-url>

cd meeting-room-booking
```

---

# Backend Setup

```bash id="c6v1m2"
cd backend

npm install

npm run dev
```

Backend will run on:

```bash id="y4t1pk"
http://localhost:5000
```

---

# Frontend Setup

```bash id="t9x1wb"
cd frontend

npm install

npm run dev
```

Frontend will run on:

```bash id="0lzqk9"
http://localhost:3000
```

---

# Build for Production

## Backend

```bash id="d74z0j"
npm run build
npm start
```

## Frontend

```bash id="c4yzl8"
npm run build
npm start
```

---

# API Routes

## Auth

```http id="4u3qwp"
POST /api/auth/register
POST /api/auth/login
```

## Rooms

```http id="82m4kc"
GET /api/rooms
POST /api/rooms
```

## Bookings

```http id="m6t4dz"
POST /api/bookings
PATCH /api/bookings/:id/cancel
```

---

# Admin Features

Admins can:

* Create meeting rooms
* Disable rooms
* View all bookings
* Manage users
* Check booking activity

---

# Future Improvements

* Email notifications
* Google Calendar sync
* WebSocket updates
* Multi-office support
* Meeting reminders

---

# License

MIT
>>>>>>> 7215b416813e3c6b2bac4653469e4973b4843a41
