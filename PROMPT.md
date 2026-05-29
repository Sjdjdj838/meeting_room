# PROJECT CONTEXT

You are acting as a senior full-stack software engineer and solution architect responsible for designing a scalable and production-ready Meeting Room Booking Platform for modern organizations.

The application should focus on performance, maintainability, clean architecture, and future scalability while supporting real-world office scheduling workflows.

# PROJECT GOAL

Build a complete full-stack Meeting Room Reservation System where employees can:

1. View meeting room availability
2. Reserve meeting rooms for specific time slots
3. Modify, cancel, or reschedule reservations
4. Prevent overlapping bookings
5. Support role-based access (Employee, Admin, Manager)

The system should simulate a real enterprise-grade office booking solution.

# PREFERRED TECH STACK

## Frontend

### Next.js (App Router Preferred)

**Why we use it:**

* Improves performance with Server Components and SSR
* Provides scalable architecture for dashboards and booking workflows

### TypeScript

**Why we use it:**

* Prevents runtime errors in booking and scheduling logic
* Makes large-scale codebase easier to maintain

### Tailwind CSS

**Why we use it:**

* Speeds up responsive UI development
* Maintains consistent design across the platform

### React Query or SWR

**Why we use it:**

* Handles real-time room availability efficiently
* Improves performance with caching and background refetching

### Zustand (Optional)

**Why we use it:**

* Manages lightweight global state with minimal boilerplate
* Useful for filters, modals, and dashboard UI state

---

## Backend

### Node.js + Express OR Next.js API Routes

**Why we use it:**

* Enables fast and scalable API development
* Simplifies full-stack development using JavaScript/TypeScript

### REST APIs

**Why we use it:**

* Creates clean communication between frontend and backend
* Makes the system modular and scalable

### JWT-Based Authentication

**Why we use it:**njvhlhj
* Secures protected routes and user sessions
* Supports role-based access control for Admins and Employees

### Zod/Joi Request Validation

**Why we use it:**

* Prevents invalid booking requests and bad input data
* Improves API reliability and security

---

## Database

### MongoDB using Mongoose ODM

**Why we use it:**

* Flexible schema supports evolving booking requirements
* Handles reservation and scheduling data efficiently

---

## Infrastructure & Services

### Vercel Deployment

**Why we use it:**

* Provides fast deployment and easy CI/CD integration
* Optimized hosting for Next.js applications

### Redis (Optional)

**Why we use it:**

* Prevents double booking during concurrent requests
* Improves performance with caching

### Nodemailer or Resend

**Why we use it:**

* Sends booking confirmations and reminders
* Improves user communication experience

### Cloudinary (Optional)

**Why we use it:**

* Optimizes room image storage and delivery
* Reduces backend storage complexity


## Frontend

### Next.js (App Router Preferred)

**Why we use it:**

* Supports Server Components for better performance
* Built-in routing, API handling, and SEO optimization
* Excellent scalability for production-grade applications
* Faster page loads with hybrid rendering (SSR + SSG)
* Great developer experience and modern React architecture

### TypeScript

**Why we use it:**

* Provides static type safety
* Reduces runtime bugs and improves maintainability
* Better IDE support and auto-completion
* Makes large-scale applications easier to manage
* Improves code readability and team collaboration

### Tailwind CSS

**Why we use it:**

* Utility-first approach speeds up UI development
* Easier responsive design implementation
* Consistent styling across the application
* Reduces custom CSS complexity
* Highly customizable and production optimized

### React Query or SWR

**Why we use it:**

* Efficient server-state management
* Automatic caching and background refetching
* Improves performance and user experience
* Simplifies API data fetching logic
* Handles loading, error, and stale states effectively

### Zustand (Optional for Lightweight State Management)

**Why we use it:**

* Minimal and simple global state management
* Less boilerplate compared to Redux
* Fast and lightweight
* Ideal for UI state, filters, modals, and small shared states
* Easy integration with React applications

---

## Backend

### Node.js + Express OR Next.js API Routes

**Why we use it:**

* JavaScript/TypeScript across full stack
* Fast development and easier code sharing
* Express offers flexible backend architecture
* Next.js API routes simplify full-stack deployment
* Large ecosystem and community support

### REST APIs

**Why we use it:**

* Standardized communication between frontend and backend
* Easy to scale and maintain
* Simple integration with third-party services
* Widely supported across platforms and tools
* Clear separation of concerns

### JWT-Based Authentication

**Why we use it:** 

* Stateless and scalable authentication mechanism
* Secure token-based user sessions
* Works well with frontend-backend separation
* Supports role-based access control
* Common industry-standard authentication approach

### Zod/Joi Request Validation

**Why we use it:**

* Ensures API request data integrity
* Prevents invalid or malicious input
* Improves backend reliability and security
* Better error handling and validation messages
* Strong schema validation support

---

## Database

### MongoDB using Mongoose ODM

**Why we use it:**

* Flexible schema design for modern applications
* Easy handling of nested and dynamic data
* Faster development iteration
* Mongoose provides schema validation and middleware support
* Good scalability for growing applications
* Excellent integration with Node.js ecosystem

## Infrastructure & Services

* Vercel deployment
* Redis (optional for slot locking/caching)
* Nodemailer or Resend for notifications
* Cloudinary (optional for room images/assets)

# APPLICATION MODULES

## Public Pages

* Home/Landing Page
* Login/Register
* About / Features Page

## Protected Pages

* User Dashboard
* Room Availability Page
* Booking History Page
* Profile & Settings
* Admin Dashboard

# UI/UX REQUIREMENTS

## Core UI Components

* Interactive calendar scheduler
* Meeting room cards
* Real-time slot indicators
* Reservation confirmation modal
* Toast alerts and notifications
* Skeleton loaders
* Empty/error states
* Analytics widgets for admin

# DASHBOARD STRUCTURE

## Sidebar Navigation

* Dashboard
* My Reservations
* Meeting Rooms
* Notifications
* Settings

## Main Dashboard Content

* Upcoming meetings
* Available rooms today
* Quick booking section
* Recent reservation activity

# MEETING ROOM PAGE

The room booking page should contain:

* Weekly/monthly calendar view
* Real-time available slots
* Room capacity information
* Equipment availability (Projector, TV, Whiteboard, etc.)
* Booking action CTA

# ADMIN PANEL REQUIREMENTS

Admins should be able to:

* Add/Edit/Delete meeting rooms
* Enable or disable rooms
* View all bookings
* Monitor usage analytics
* Manage employees and permissions
* Handle booking conflicts manually

# USER WORKFLOW

1. User signs in
2. Opens dashboard
3. Selects meeting date & duration
4. Chooses an available meeting room
5. Confirms reservation
6. Backend validates conflicts
7. Reservation saved successfully
8. Confirmation notification triggered

# ADMIN WORKFLOW

1. Admin logs in
2. Reviews room utilization
3. Creates or updates room schedules
4. Blocks maintenance slots if needed
5. Manages all reservations
6. Views analytics and reports

# CORE FEATURES

* JWT authentication
* Role-based authorization
* Meeting room scheduling
* Conflict prevention system
* Booking CRUD operations
* Live room availability updates
* Reservation history tracking
* Email reminders & notifications
* Search and filtering support

# ERROR HANDLING REQUIREMENTS

The system must properly handle:

* Double booking attempts
* Expired authentication tokens
* Unauthorized page access
* API/network failures
* Validation errors
* Booking timeout issues
* Invalid date/time selection

# PERFORMANCE & SCALABILITY REQUIREMENTS

* Optimistic UI updates
* Redis caching for room availability
* Debounced search/filter requests
* Pagination for booking tables
* Lazy-loaded routes/components
* Indexed DB queries
* Efficient aggregation pipelines
* High concurrency booking handling

# DATA PROCESSING REQUIREMENTS

* Timezone-aware scheduling
* Input sanitization
* Booking normalization before persistence
* Structured activity logging
* Real-time synchronization of room status
* Batch admin operations support
* Background job processing for notifications
* Efficient reporting queries

# DATABASE DESIGN

## Users Collection

* id
* name
* email
* password
* role

## MeetingRooms Collection

* id
* roomName
* capacity
* amenities
* location
* isActive

## Reservations Collection

* id
* userId
* roomId
* startTime
* endTime
* status
* createdAt

# SECURITY REQUIREMENTS

* Password hashing using bcrypt
* JWT expiration & refresh token flow
* Rate limiting middleware
* Route protection middleware
* Secure HTTP-only cookies (optional)
* Request validation on all APIs
* MongoDB injection prevention
* XSS & CSRF protection best practices

# EXPECTED FINAL OUTPUT

The generated solution must include:

1. Full frontend implementation
2. Backend APIs
3. Authentication system
4. Database schemas/models
5. Complete folder architecture
6. API documentation
7. Deployment instructions
8. Environment variable setup
9. Booking conflict handling logic
10. Admin management features

# DOCUMENTATION REQUIREMENTS

Include detailed documentation for:

* Local setup instructions
* Architecture explanation
* API endpoint references
* Database schema explanation
* Security implementation
* Scaling strategy
* Future extensibility

# FINAL REQUIREMENTS

The system should be:

* Production-ready
* Modular
* Scalable
* Cleanly organized
* Enterprise-level
* Easy to maintain
* Future-proof for microservices expansion
