# Complete Next.js Guide

## Next.js as a Full-Stack Framework

**Yes, Next.js can be your complete backend!** You don't need a separate Node.js/Express server. Next.js has:
- Built-in API routes (serverless functions)
- Direct database connections
- Middleware
- Authentication handling
- Everything Express can do

### When to Use Node/Express Backend Separately:
1. You need WebSockets/real-time features
2. Complex microservices architecture
3. Non-Next.js clients (mobile apps, other frontends)
4. Heavy background processing/cron jobs
5. Legacy system that already exists

**For most apps: Next.js alone is sufficient!**

---

## The Router (App Router)

Next.js 13+ uses the **App Router** (file-based routing in the `app/` directory).

### File Structure = Routes
```
app/
├── page.js           → /
├── about/
│   └── page.js       → /about
├── blog/
│   ├── page.js       → /blog
│   └── [slug]/
│       └── page.js   → /blog/my-post (dynamic)
└── api/
    └── users/
        └── route.js  → /api/users (API endpoint)
```

### Navigation
```jsx
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Declarative
<Link href="/about">About</Link>

// Programmatic
const router = useRouter();
router.push('/dashboard');
```

---

## "use client" Directive

By default, **everything in Next.js is Server Components**. Add `"use client"` to opt into client-side React.

### When to Use "use client":
```jsx
"use client"; // Required for:

import { useState, useEffect } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0); // ← needs "use client"
  
  useEffect(() => {
    console.log('Mounted'); // ← needs "use client"
  }, []);
  
  return <button onClick={() => setCount(count + 1)}>
    {count}
  </button>; // ← onClick needs "use client"
}
```

### Server Components (default, no "use client"):
```jsx
// No "use client" = runs on server only
export default async function Page() {
  const data = await fetch('https://api.example.com/data');
  const json = await data.json();
  
  return <div>{json.title}</div>;
  // This HTML is generated on the server
}
```

**Key Rule:** Use Server Components by default. Only add `"use client"` when you need interactivity, hooks, or browser APIs.

---

## React Hooks in Next.js

### useState
Manages component state (requires "use client").
```jsx
"use client";
import { useState } from 'react';

export default function Form() {
  const [name, setName] = useState('');
  
  return <input 
    value={name} 
    onChange={e => setName(e.target.value)} 
  />;
}
```

### useEffect
Side effects after render (requires "use client").
```jsx
"use client";
import { useEffect, useState } from 'react';

export default function Timer() {
  const [seconds, setSeconds] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    
    return () => clearInterval(interval); // cleanup
  }, []); // empty array = run once on mount
  
  return <div>{seconds}s</div>;
}
```

### useMemo
Memoizes expensive calculations (requires "use client").
```jsx
"use client";
import { useMemo, useState } from 'react';

export default function ExpensiveCalc() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');
  
  // Only recalculates when count changes, not when text changes
  const expensiveValue = useMemo(() => {
    console.log('Calculating...');
    return count * 1000;
  }, [count]);
  
  return (
    <>
      <input value={text} onChange={e => setText(e.target.value)} />
      <p>{expensiveValue}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
    </>
  );
}
```

### useCallback
Memoizes functions (requires "use client").
```jsx
"use client";
import { useCallback, useState } from 'react';

export default function Parent() {
  const [count, setCount] = useState(0);
  
  // Function reference stays the same unless count changes
  const handleClick = useCallback(() => {
    console.log('Count:', count);
  }, [count]);
  
  return <Child onClick={handleClick} />;
}
```

### useRef
References DOM elements or mutable values (requires "use client").
```jsx
"use client";
import { useRef } from 'react';

export default function FocusInput() {
  const inputRef = useRef(null);
  
  return (
    <>
      <input ref={inputRef} />
      <button onClick={() => inputRef.current.focus()}>
        Focus Input
      </button>
    </>
  );
}
```

### useContext
Shares state across components (requires "use client").
```jsx
"use client";
import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

---

## NextRequest and NextResponse

Used in **API Routes** (`app/api/*/route.js`) and **Middleware**.

### API Route Example
```javascript
// app/api/users/route.js
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request) {
  // NextRequest has useful methods
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  
  const users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
  
  // NextResponse for structured responses
  return NextResponse.json(users, { status: 200 });
}

export async function POST(request) {
  const body = await request.json();
  
  // Insert into database here...
  
  return NextResponse.json({ success: true }, { status: 201 });
}
```

### Middleware Example
```javascript
// middleware.js (root of project)
import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('auth-token');
  
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/dashboard/:path*'
};
```

---

## Next.js Server Capabilities

### Yes, Next.js IS the Server!

```javascript
// app/api/products/route.js
import { NextResponse } from 'next/server';
import postgres from 'postgres';

// Direct database connection
const sql = postgres(process.env.DATABASE_URL);

export async function GET() {
  const products = await sql`SELECT * FROM products`;
  return NextResponse.json(products);
}

export async function POST(request) {
  const { name, price } = await request.json();
  
  const [product] = await sql`
    INSERT INTO products (name, price)
    VALUES (${name}, ${price})
    RETURNING *
  `;
  
  return NextResponse.json(product, { status: 201 });
}
```

### What Next.js Can Do (Like Express):
- ✅ RESTful APIs
- ✅ Database connections (PostgreSQL, MongoDB, MySQL, etc.)
- ✅ Authentication (JWT, sessions, OAuth)
- ✅ File uploads
- ✅ Email sending
- ✅ Payment processing (Stripe, etc.)
- ✅ Middleware
- ✅ CORS handling
- ✅ Environment variables

### Example: Full-Stack Next.js App
```javascript
// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sql } from '@/lib/db';

export async function POST(request) {
  const { email, password } = await request.json();
  
  // Query database
  const [user] = await sql`
    SELECT * FROM users WHERE email = ${email}
  `;
  
  if (!user) {
    return NextResponse.json(
      { error: 'Invalid credentials' }, 
      { status: 401 }
    );
  }
  
  // Check password
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json(
      { error: 'Invalid credentials' }, 
      { status: 401 }
    );
  }
  
  // Create JWT
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  
  // Set cookie
  const response = NextResponse.json({ success: true });
  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7 // 1 week
  });
  
  return response;
}
```

---

## SSR vs CSR: The Real Difference

### 🚨 Common Misconception Corrected:

**SSR ≠ "calling external server for data"**  
**CSR ≠ "calling Next.js own server"**

### The Real Difference:

| Aspect | Server-Side Rendering (SSR) | Client-Side Rendering (CSR) |
|--------|----------------------------|------------------------------|
| **Where code runs** | On Next.js server | In user's browser |
| **When it runs** | Before sending HTML | After HTML loads |
| **Data fetching** | Can be ANY API (external or your own) | Can be ANY API (external or your own) |
| **SEO** | ✅ Great (HTML has content) | ❌ Poor (HTML is empty shell) |
| **Initial load** | ✅ Fast (content ready) | ❌ Slow (loading spinner) |
| **Subsequent navigation** | Slower (server roundtrip) | ✅ Fast (browser has JS) |

---

## Solid Simple Examples

### Example 1: User List

#### Server-Side Rendering (SSR)
```jsx
// app/users/page.js
// NO "use client" = Server Component

export default async function UsersPage() {
  // This runs on the Next.js server BEFORE sending HTML
  const res = await fetch('https://jsonplaceholder.typicode.com/users', {
    cache: 'no-store' // Always fresh data
  });
  const users = await res.json();
  
  // HTML is generated on server with data already in it
  return (
    <div>
      <h1>Users (SSR)</h1>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}

// View source in browser: You'll see <li>Leanne Graham</li> in HTML!
```

**What happens:**
1. User visits `/users`
2. Next.js server fetches data from API
3. Next.js generates HTML with user list
4. Browser receives complete HTML
5. **View Page Source shows the user list!** (Good for SEO)

#### Client-Side Rendering (CSR)
```jsx
// app/users-client/page.js
"use client"; // This is a Client Component

import { useEffect, useState } from 'react';

export default function UsersClientPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // This runs in the BROWSER after page loads
  useEffect(() => {
    fetch('https://jsonplaceholder.typicode.com/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      });
  }, []);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>Users (CSR)</h1>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}

// View source in browser: Just <div>Loading...</div> - no user list!
```

**What happens:**
1. User visits `/users-client`
2. Next.js sends HTML with just `<div>Loading...</div>`
3. Browser loads JavaScript
4. JavaScript runs `useEffect` and fetches data
5. React updates DOM with user list
6. **View Page Source shows only "Loading..."** (Bad for SEO)

---

### Example 2: Blog Post

#### SSR - Better for SEO
```jsx
// app/blog/[slug]/page.js
export default async function BlogPost({ params }) {
  const { slug } = params;
  
  // Fetch from YOUR OWN Next.js API route
  const res = await fetch(`http://localhost:3000/api/posts/${slug}`);
  const post = await res.json();
  
  // Or fetch from external API
  // const res = await fetch(`https://cms.example.com/api/posts/${slug}`);
  
  // Or query database directly (no API needed!)
  // const post = await sql`SELECT * FROM posts WHERE slug = ${slug}`;
  
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

#### CSR - For Interactive Features
```jsx
// app/blog/[slug]/comments.js
"use client";

import { useState, useEffect } from 'react';

export default function Comments({ postId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  
  useEffect(() => {
    fetch(`/api/posts/${postId}/comments`)
      .then(r => r.json())
      .then(setComments);
  }, [postId]);
  
  const handleSubmit = async () => {
    await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text: newComment })
    });
    // Refetch comments
  };
  
  return (
    <div>
      <h2>Comments</h2>
      {comments.map(c => <p key={c.id}>{c.text}</p>)}
      <textarea value={newComment} onChange={e => setNewComment(e.target.value)} />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
```

---

## Why Use Separate Node Backend?

### Scenario 1: Just a Website/Web App
```
✅ Use Next.js alone
   ├── Frontend (React)
   ├── API Routes (Backend)
   └── Database connection
```

### Scenario 2: Multiple Clients (Web + Mobile)
```
✅ Use Next.js + Separate Backend
   
Next.js (Web frontend only)
   └── Fetches from ↓
   
Node/Express Backend API
   ├── Used by Next.js
   ├── Used by iOS app
   ├── Used by Android app
   └── Used by other services
```

### Scenario 3: Microservices
```
✅ Multiple backends

Next.js Frontend
   ├── Auth Service (Node)
   ├── Payment Service (Node)
   ├── Email Service (Python)
   └── Analytics Service (Go)
```

---

## Other Important Next.js Features

### 1. Image Optimization
```jsx
import Image from 'next/image';

<Image 
  src="/photo.jpg" 
  alt="Photo"
  width={500}
  height={300}
  // Automatic optimization, lazy loading, WebP conversion
/>
```

### 2. Metadata for SEO
```jsx
// app/blog/[slug]/page.js
export async function generateMetadata({ params }) {
  const post = await fetchPost(params.slug);
  
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      images: [post.coverImage]
    }
  };
}
```

### 3. Loading UI
```jsx
// app/dashboard/loading.js
export default function Loading() {
  return <div>Loading dashboard...</div>;
}
```

### 4. Error Handling
```jsx
// app/dashboard/error.js
"use client";

export default function Error({ error, reset }) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

### 5. Streaming with Suspense
```jsx
import { Suspense } from 'react';

export default function Page() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<div>Loading stats...</div>}>
        <Stats />
      </Suspense>
      <Suspense fallback={<div>Loading chart...</div>}>
        <Chart />
      </Suspense>
    </div>
  );
}

async function Stats() {
  const data = await fetchStats(); // Slow query
  return <div>{data.total}</div>;
}
```

### 6. Static Site Generation (SSG)
```jsx
// Generates HTML at build time
export default async function Page() {
  const posts = await fetch('https://api.example.com/posts');
  return <div>{/* render posts */}</div>;
}

// Regenerate every hour
export const revalidate = 3600;
```

### 7. Environment Variables
```bash
# .env.local
DATABASE_URL=postgresql://localhost/mydb
API_KEY=secret123
NEXT_PUBLIC_SITE_URL=https://example.com
```

```javascript
// Only in server code
process.env.DATABASE_URL

// Available in browser too (NEXT_PUBLIC_ prefix)
process.env.NEXT_PUBLIC_SITE_URL
```

### 8. Parallel Routes
```
app/
└── dashboard/
    ├── layout.js
    ├── @analytics/
    │   └── page.js
    └── @team/
        └── page.js
```

### 9. Intercepting Routes
For modals that can be direct links:
```
app/
└── photos/
    ├── [id]/
    │   └── page.js      → /photos/123
    └── (.)[id]/
        └── page.js      → Modal when navigating within app
```

---

## Quick Decision Tree

**Need interactivity (clicks, forms, animations)?**  
→ Use `"use client"` + hooks

**Just displaying data?**  
→ Use Server Component (default)

**Need to fetch data?**  
→ SSR for SEO, CSR for dynamic updates

**Need backend functionality?**  
→ Next.js API routes (unless you need separate backend for multiple clients)

**Summary: Next.js is a full-stack framework. For most projects, you don't need Express/Node backend!**

# Next.js Context & Provider Guide

A comprehensive guide to understanding React Context API and Providers in Next.js applications, with a practical Toast notification example.

## Table of Contents

- [What is React Context?](#what-is-react-context)
- [The Problem Context Solves](#the-problem-context-solves)
- [Core Concepts](#core-concepts)
- [Step-by-Step Implementation](#step-by-step-implementation)
- [Toast Provider Deep Dive](#toast-provider-deep-dive)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)

---

## What is React Context?

React Context is a built-in feature that allows you to **share data across your component tree** without manually passing props through every level (prop drilling).

### Key Benefits

1. **Avoid Prop Drilling**: No need to pass props through intermediate components
2. **Global State Management**: Share state across distant components
3. **Clean Code**: Reduces boilerplate and improves maintainability
4. **Performance**: Only re-renders components that consume the context

---

## The Problem Context Solves

### Without Context (Prop Drilling)

```tsx
// ❌ BAD: Passing props through multiple levels
function App() {
  const [user, setUser] = useState(null);
  return <Layout user={user} />;
}

function Layout({ user }) {
  return <Header user={user} />;
}

function Header({ user }) {
  return <UserProfile user={user} />;
}

function UserProfile({ user }) {
  return <div>{user.name}</div>;
}
```

### With Context

```tsx
// ✅ GOOD: Direct access to shared state
function App() {
  return (
    <UserProvider>
      <Layout />
    </UserProvider>
  );
}

function UserProfile() {
  const { user } = useUser(); // Direct access!
  return <div>{user.name}</div>;
}
```

---

## Core Concepts

### 1. Context Creation

```tsx
import { createContext } from "react";

// Create a context with a default value
const ToastContext = createContext<ToastContextType | undefined>(undefined);
```

**What happens here?**
- Creates a "container" for shared data
- `undefined` is the default value if no Provider is found
- TypeScript type ensures type safety

### 2. Provider Component

```tsx
export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
    </ToastContext.Provider>
  );
}
```

**What happens here?**
- Provider wraps your component tree
- `value` prop contains the data/functions to share
- `children` are all nested components that can access the context

### 3. Custom Hook (Consumer)

```tsx
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
```

**What happens here?**
- Custom hook accesses the context value
- Error handling ensures Provider is present
- Clean API for consuming components

---

## Step-by-Step Implementation

### Step 1: Define Types

```tsx
// lib/types/base.types.ts
export type ToastType = "Success" | "Warning" | "Error";

export interface ToastProps {
  id: number;
  toastType: ToastType;
  message: string;
}

export interface ToastContextType {
  showToast: (toastType: ToastType, message: string) => void;
}
```

**Why?**
- Type safety throughout the application
- Clear contract for context consumers
- Better IDE autocomplete

### Step 2: Create Context

```tsx
'use client'
import { createContext } from "react";

const ToastContext = createContext<ToastContextType | undefined>(undefined);
```

**Important Notes:**
- `'use client'` is required in Next.js 13+ for client-side interactivity
- Context can only be used in Client Components
- Default value `undefined` helps with error checking

### Step 3: Build Provider Component

```tsx
export default function ToastProvider({ children }: { children: ReactNode }) {
  // State to hold all active toasts
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  
  // Function to display a toast
  const showToast = (toastType: ToastType, message: string) => {
    const id = Date.now(); // Unique ID for each toast
    
    // Add new toast to array
    setToasts((prev) => [...prev, { id, toastType, message }]);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Visual toast container */}
      <div className="fixed bottom-15 right-10 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-md text-white
              ${toast.toastType === "Success" && "bg-green-500"}
              ${toast.toastType === "Warning" && "bg-yellow-500"}
              ${toast.toastType === "Error" && "bg-red-500"}
            `}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
```

**Key Points:**
- `children` renders all wrapped components
- `value` prop shares `showToast` function
- Toast UI is rendered alongside children
- Each toast has unique `id` for React keys and removal

### Step 4: Create Custom Hook

```tsx
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  
  // Guard clause: ensure Provider exists
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  
  return context;
};
```

**Why a Custom Hook?**
- Cleaner API: `useToast()` vs `useContext(ToastContext)`
- Built-in error handling
- Enforces proper usage
- Better developer experience

### Step 5: Wrap Your App

```tsx
// app/layout.tsx (Next.js 13+ App Router)
import ToastProvider from "@/components/ToastProvider";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
```

```tsx
// pages/_app.tsx (Next.js Pages Router)
import ToastProvider from "@/components/ToastProvider";

export default function App({ Component, pageProps }) {
  return (
    <ToastProvider>
      <Component {...pageProps} />
    </ToastProvider>
  );
}
```

### Step 6: Use in Components

```tsx
'use client'
import { useToast } from "@/components/ToastProvider";

export default function LoginForm() {
  const { showToast } = useToast();
  
  const handleLogin = async () => {
    try {
      await loginUser();
      showToast("Success", "Login successful!");
    } catch (error) {
      showToast("Error", "Login failed!");
    }
  };
  
  return <button onClick={handleLogin}>Login</button>;
}
```

---

## Toast Provider Deep Dive

### How showToast Works

```tsx
const showToast = (toastType: ToastType, message: string) => {
  const id = Date.now(); // Step 1: Generate unique ID
  
  // Step 2: Add toast to state array
  setToasts((prev) => [...prev, { id, toastType, message }]);
  
  // Step 3: Schedule removal
  setTimeout(() => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, 3000);
};
```

**Flow Explanation:**

1. **ID Generation**: `Date.now()` creates a unique timestamp
2. **State Update**: Adds new toast to existing array using spread operator
3. **Auto Removal**: `setTimeout` removes toast after 3 seconds
4. **Filter Logic**: Keeps all toasts except the one with matching ID

### Managing Multiple Toasts

```tsx
const [toasts, setToasts] = useState<ToastProps[]>([]);
```

**Array State Pattern:**
- Supports multiple simultaneous toasts
- Each toast has independent timer
- React efficiently re-renders only affected toasts

### Conditional Styling

```tsx
className={`
  px-4 py-3 rounded-lg shadow-md text-white
  ${toast.toastType === "Success" && "bg-green-500"}
  ${toast.toastType === "Warning" && "bg-yellow-500"}
  ${toast.toastType === "Error" && "bg-red-500"}
`}
```

**Dynamic Classes:**
- Green for success messages
- Yellow for warnings
- Red for errors
- Template literals combine base and conditional classes

### Toast Positioning

```tsx
<div className="fixed bottom-15 right-10 z-50 space-y-2">
```

**Layout Strategy:**
- `fixed`: Stays in viewport during scroll
- `bottom-15 right-10`: Bottom-right corner
- `z-50`: Above most content
- `space-y-2`: Vertical spacing between toasts

---

## Best Practices

### 1. Use 'use client' Directive

```tsx
'use client'
// Required for Next.js 13+ App Router when using hooks
```

**When to use:**
- Any component using `useState`, `useEffect`, `useContext`
- Interactive components (onClick, onChange)
- Browser APIs (window, document)

### 2. Type Safety

```tsx
// ✅ GOOD: Strongly typed context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ❌ BAD: Any type loses type safety
const ToastContext = createContext<any>(null);
```

### 3. Error Boundaries

```tsx
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
```

**Why this matters:**
- Catches usage errors during development
- Clear error messages for debugging
- Prevents runtime crashes in production

### 4. Cleanup Side Effects

```tsx
const showToast = (toastType: ToastType, message: string) => {
  const id = Date.now();
  setToasts((prev) => [...prev, { id, toastType, message }]);
  
  // Store timeout ID for cleanup if needed
  const timeoutId = setTimeout(() => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, 3000);
  
  // Optional: Return cleanup function
  // return () => clearTimeout(timeoutId);
};
```

### 5. Provider Composition

```tsx
// ✅ GOOD: Multiple providers stacked
export default function RootLayout({ children }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
```

### 6. Context Separation

```tsx
// ✅ GOOD: Separate contexts for different concerns
<AuthProvider>    {/* User authentication */}
<ThemeProvider>   {/* UI theming */}
<ToastProvider>   {/* Notifications */}
```

**Why?**
- Prevents unnecessary re-renders
- Better code organization
- Easier to maintain and test

---

## Common Patterns

### Pattern 1: Auth Context

```tsx
'use client'
import { createContext, useContext, useState, ReactNode } from "react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  const login = async (email: string, password: string) => {
    // API call to login
    const userData = await loginAPI(email, password);
    setUser(userData);
  };
  
  const logout = () => {
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
```

### Pattern 2: Theme Context

```tsx
'use client'
import { createContext, useContext, useState, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  
  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={theme}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
```

### Pattern 3: Modal Context

```tsx
'use client'
import { createContext, useContext, useState, ReactNode } from "react";

interface ModalContextType {
  isOpen: boolean;
  content: ReactNode | null;
  openModal: (content: ReactNode) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export default function ModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<ReactNode | null>(null);
  
  const openModal = (modalContent: ReactNode) => {
    setContent(modalContent);
    setIsOpen(true);
  };
  
  const closeModal = () => {
    setIsOpen(false);
    setContent(null);
  };
  
  return (
    <ModalContext.Provider value={{ isOpen, content, openModal, closeModal }}>
      {children}
      
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            {content}
            <button onClick={closeModal}>Close</button>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal must be used within ModalProvider");
  return context;
};
```

---

## Performance Considerations

### 1. Memoization

```tsx
import { useMemo } from "react";

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  
  // Memoize value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({ showToast }),
    [] // Dependencies: recreate only if these change
  );
  
  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}
```

### 2. Split Contexts

```tsx
// ❌ BAD: One context for everything
<AppContext.Provider value={{ user, theme, notifications, settings }}>

// ✅ GOOD: Separate contexts
<UserContext.Provider value={user}>
<ThemeContext.Provider value={theme}>
<NotificationContext.Provider value={notifications}>
```

**Why?**
- Component using theme won't re-render when user changes
- Better performance and maintainability

### 3. Context Selectors (Advanced)

```tsx
// For large contexts, consider using libraries like:
// - Zustand
// - Jotai
// - Recoil
// These provide built-in selector patterns
```

---

## Common Pitfalls

### ❌ Pitfall 1: Forgetting 'use client'

```tsx
// ❌ Will cause error in Next.js 13+ App Router
import { createContext } from "react";
```

```tsx
// ✅ Add directive at the top
'use client'
import { createContext } from "react";
```

### ❌ Pitfall 2: Creating Context Inside Component

```tsx
// ❌ BAD: Context created on every render
function MyComponent() {
  const MyContext = createContext(null);
}

// ✅ GOOD: Context created once at module level
const MyContext = createContext(null);
function MyComponent() { }
```

### ❌ Pitfall 3: Not Handling Undefined Context

```tsx
// ❌ BAD: No error handling
export const useToast = () => {
  return useContext(ToastContext);
};

// ✅ GOOD: Validate context exists
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("Must be used within provider");
  return context;
};
```

### ❌ Pitfall 4: Overusing Context

```tsx
// ❌ BAD: Using context for frequently changing values
const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

// ✅ GOOD: Use local state or specialized libraries
// Context is best for:
// - Theme
// - Authentication
// - User preferences
// - Notifications
```

---

## Testing Context

```tsx
import { render, screen } from "@testing-library/react";
import { useToast } from "./ToastProvider";

// Wrapper for testing
function TestComponent() {
  const { showToast } = useToast();
  return <button onClick={() => showToast("Success", "Test")}>Show</button>;
}

test("displays toast message", () => {
  render(
    <ToastProvider>
      <TestComponent />
    </ToastProvider>
  );
  
  const button = screen.getByText("Show");
  button.click();
  
  expect(screen.getByText("Test")).toBeInTheDocument();
});
```

---

## Summary

**Context API Flow:**
1. **Create** context with `createContext()`
2. **Provide** value with `<Context.Provider>`
3. **Consume** with `useContext()` or custom hook
4. **Wrap** app with Provider component

**Key Takeaways:**
- Context solves prop drilling problem
- Use `'use client'` in Next.js 13+ App Router
- Always validate context with custom hooks
- Separate contexts by concern for better performance
- Toast pattern is reusable for notifications, modals, dialogs

**When to Use Context:**
✅ Theme management
✅ User authentication
✅ Global notifications
✅ Language/locale settings
✅ Feature flags

**When NOT to Use Context:**
❌ Frequently changing values
❌ Heavy computations
❌ Large lists/tables
❌ Form state (use local state)

For complex state management needs, consider:
- **Zustand**: Simple and performant
- **Redux Toolkit**: Feature-rich, established
- **Jotai**: Atomic state management
- **TanStack Query**: Server state managem