# JavaScript/TypeScript Technical Interview Guide

## Table of Contents
1. [JavaScript Fundamentals](#javascript-fundamentals)
2. [TypeScript Essentials](#typescript-essentials)
3. [Zod Validation](#zod-validation)
4. [Event Loop & Async](#event-loop--async)
5. [Array Methods Deep Dive](#array-methods-deep-dive)
6. [Vue.js Composition vs Options API](#vuejs-composition-vs-options-api)
7. [Browser & Networking](#browser--networking)
8. [Next.js Specifics](#nextjs-specifics)
9. [Node.js Backend](#nodejs-backend)
10. [Common Interview Questions](#common-interview-questions)

---

## JavaScript Fundamentals

### Primitive Types

JavaScript has **7 primitive types**:

```javascript
// 1. String
const name = "John";
typeof name; // "string"

// 2. Number (includes integers and floats)
const age = 25;
const price = 19.99;
typeof age; // "number"

// Special numbers
const infinity = Infinity;
const notANumber = NaN;

// 3. BigInt (for numbers larger than Number.MAX_SAFE_INTEGER)
const bigNumber = 9007199254740991n;
typeof bigNumber; // "bigint"

// 4. Boolean
const isActive = true;
typeof isActive; // "boolean"

// 5. Undefined (variable declared but not assigned)
let x;
typeof x; // "undefined"

// 6. Null (intentional absence of value)
const user = null;
typeof user; // "object" (historical bug in JavaScript!)

// 7. Symbol (unique identifier)
const id = Symbol('id');
const id2 = Symbol('id');
id === id2; // false (always unique)
```

**Key Differences:**

```javascript
// Primitives vs Objects
let a = 5;
let b = a; // Copy by VALUE
b = 10;
console.log(a); // 5 (unchanged)

let obj1 = { count: 5 };
let obj2 = obj1; // Copy by REFERENCE
obj2.count = 10;
console.log(obj1.count); // 10 (changed!)

// Primitives are immutable
let str = "hello";
str[0] = "H"; // No effect
console.log(str); // "hello"

// Objects are mutable
let obj = { name: "John" };
obj.name = "Jane"; // Works
console.log(obj.name); // "Jane"
```

### Truthy and Falsy Values

**Falsy values** (only 8 values that evaluate to false):

```javascript
// The 8 falsy values
Boolean(false);        // false
Boolean(0);            // false
Boolean(-0);           // false
Boolean(0n);           // false (BigInt zero)
Boolean("");           // false (empty string)
Boolean(null);         // false
Boolean(undefined);    // false
Boolean(NaN);          // false

// Everything else is truthy!
Boolean("0");          // true (non-empty string)
Boolean("false");      // true
Boolean([]);           // true (empty array)
Boolean({});           // true (empty object)
Boolean(function(){}); // true
```

**Common Gotchas:**

```javascript
// Conditional checks
if (user.name) {
  // This runs if name is truthy
  // Does NOT run if name is: "", 0, null, undefined
}

// Better for checking existence
if (user.name !== undefined && user.name !== null) {
  // More explicit
}

// Or use nullish coalescing
const displayName = user.name ?? "Anonymous"; // Only null/undefined fallback

// vs OR operator (any falsy value)
const displayName2 = user.name || "Anonymous"; // 0, "" also trigger fallback
```

**Practical Examples:**

```javascript
// Default values
function greet(name) {
  name = name || "Guest"; // Problem: greet("") → "Guest"
  name = name ?? "Guest"; // Better: greet("") → ""
}

// Array filtering
const numbers = [0, 1, 2, 3, 4, 5];
numbers.filter(n => n); // [1, 2, 3, 4, 5] (0 is falsy!)
numbers.filter(n => n !== 0); // Better if 0 is valid

// Existence checks
const user = { name: "John", age: 0 };
if (user.age) { // Bug! Doesn't run when age is 0
  console.log("User has age");
}
if (user.age !== undefined) { // Correct
  console.log("User has age");
}
```

### Type Coercion

```javascript
// Implicit coercion
"5" + 3;        // "53" (number → string)
"5" - 3;        // 2 (string → number)
"5" * "2";      // 10 (both → numbers)
true + 1;       // 2 (true → 1)
false + 1;      // 1 (false → 0)

// Equality
5 == "5";       // true (loose equality, coerces types)
5 === "5";      // false (strict equality, no coercion)

// Always use === and !== unless you have a specific reason
null == undefined;  // true
null === undefined; // false

// Common mistakes
if (x == true) { }  // Bad
if (x) { }          // Good

if (arr.length > 0) { } // Explicit
if (arr.length) { }     // Works but less clear
```

---

## TypeScript Essentials

### Type vs Interface

**When to use Type:**

```typescript
// 1. Union types
type Status = "pending" | "approved" | "rejected";
type ID = string | number;

// 2. Intersection types
type Admin = User & { role: "admin" };

// 3. Primitive aliases
type Email = string;

// 4. Tuple types
type Coordinate = [number, number];

// 5. Function types
type CalculateFn = (a: number, b: number) => number;

// 6. Mapped types
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

// 7. Conditional types
type IsString<T> = T extends string ? "yes" : "no";
```

**When to use Interface:**

```typescript
// 1. Object shapes
interface User {
  id: number;
  name: string;
  email: string;
}

// 2. Class implementations
class UserModel implements User {
  id: number;
  name: string;
  email: string;
}

// 3. Declaration merging (extending existing interfaces)
interface Window {
  myCustomProperty: string;
}
// Later in another file
interface Window {
  anotherProperty: number;
}
// Both properties are now on Window!

// 4. Extending other interfaces
interface Admin extends User {
  role: "admin";
  permissions: string[];
}
```

**Key Differences:**

```typescript
// 1. Interfaces can be reopened, types cannot
interface User {
  name: string;
}
interface User {
  age: number; // ✓ Merges with above
}

type User = {
  name: string;
}
type User = {
  age: number; // ✗ Error: Duplicate identifier
}

// 2. Types can do unions, interfaces cannot
type Status = "active" | "inactive"; // ✓
interface Status = "active" | "inactive"; // ✗ Syntax error

// 3. Both can extend, but syntax differs
interface Admin extends User { }
type Admin = User & { };

// 4. Performance: interfaces are slightly faster for type checking
// (doesn't matter for most apps)
```

**Best Practices:**

```typescript
// ✓ Use interface for:
// - Object shapes
// - Public APIs (can be extended by consumers)
// - Classes

interface User {
  id: number;
  name: string;
}

// ✓ Use type for:
// - Unions and intersections
// - Mapped types
// - Conditional types
// - Tuples

type UserStatus = "active" | "inactive" | "banned";
type ApiResponse<T> = { data: T } | { error: string };

// Real-world example
interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

interface User extends BaseEntity {
  email: string;
  name: string;
}

type UserWithPosts = User & {
  posts: Post[];
};

type UserRole = "admin" | "user" | "guest";
```

### TypeScript Utility Types

```typescript
// Partial - make all properties optional
interface User {
  id: number;
  name: string;
  email: string;
}
type PartialUser = Partial<User>;
// { id?: number; name?: string; email?: string; }

// Required - make all properties required
type RequiredUser = Required<PartialUser>;

// Pick - select specific properties
type UserPreview = Pick<User, "id" | "name">;
// { id: number; name: string; }

// Omit - exclude specific properties
type UserWithoutEmail = Omit<User, "email">;
// { id: number; name: string; }

// Record - create object type with specific keys
type UserRoles = Record<string, "admin" | "user">;
// { [key: string]: "admin" | "user"; }

// Readonly - make all properties readonly
type ReadonlyUser = Readonly<User>;

// ReturnType - extract return type of function
function getUser() {
  return { id: 1, name: "John" };
}
type UserReturn = ReturnType<typeof getUser>;
// { id: number; name: string; }

// Parameters - extract parameter types
function updateUser(id: number, data: Partial<User>) { }
type UpdateUserParams = Parameters<typeof updateUser>;
// [number, Partial<User>]
```

---

## Zod Validation

### Why Zod?

**Problem with TypeScript alone:**
```typescript
// TypeScript only validates at compile time
interface User {
  email: string;
  age: number;
}

// This compiles fine, but runtime data could be anything!
const user: User = JSON.parse(apiResponse); // Unsafe!
```

**Zod provides runtime validation:**

```typescript
import { z } from "zod";

// Define schema
const UserSchema = z.object({
  email: z.string().email(),
  age: z.number().min(0).max(120),
  name: z.string().min(1).max(100)
});

// Infer TypeScript type from schema
type User = z.infer<typeof UserSchema>;

// Validate runtime data
try {
  const user = UserSchema.parse(apiResponse);
  // ✓ user is validated and typed
} catch (error) {
  if (error instanceof z.ZodError) {
    console.log(error.errors);
  }
}
```

### Common Zod Patterns

**Basic Types:**
```typescript
// Primitives
z.string();
z.number();
z.boolean();
z.date();
z.bigint();
z.undefined();
z.null();

// Arrays
z.array(z.string()); // string[]
z.string().array(); // same

// Objects
z.object({
  name: z.string(),
  age: z.number()
});

// Tuples
z.tuple([z.string(), z.number()]); // [string, number]

// Unions
z.union([z.string(), z.number()]); // string | number
z.string().or(z.number()); // same

// Enums
z.enum(["admin", "user", "guest"]);
z.nativeEnum(MyEnum);

// Literals
z.literal("hello");
z.literal(42);
```

**Validation Modifiers:**
```typescript
// String validations
z.string()
  .min(3, "Too short")
  .max(100, "Too long")
  .email("Invalid email")
  .url("Invalid URL")
  .regex(/^[A-Z]/, "Must start with uppercase")
  .trim() // Trim whitespace
  .toLowerCase(); // Convert to lowercase

// Number validations
z.number()
  .min(0)
  .max(100)
  .int("Must be integer")
  .positive()
  .negative()
  .multipleOf(5);

// Date validations
z.date()
  .min(new Date("2020-01-01"))
  .max(new Date());

// Optional and nullable
z.string().optional(); // string | undefined
z.string().nullable(); // string | null
z.string().nullish(); // string | null | undefined

// Default values
z.string().default("guest");
z.number().default(0);

// Custom validation
z.string().refine(
  (val) => val.length % 2 === 0,
  "Length must be even"
);
```

**Real-world Example - API Request Validation:**

```typescript
// Next.js API route with Zod
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100),
  age: z.number().min(18).optional(),
  role: z.enum(["admin", "user"]).default("user"),
  settings: z.object({
    notifications: z.boolean().default(true),
    theme: z.enum(["light", "dark"]).default("light")
  }).optional()
});

type CreateUserInput = z.infer<typeof CreateUserSchema>;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = CreateUserSchema.parse(body);
    
    // validatedData is now fully typed and validated
    const user = await db.user.create({
      data: validatedData
    });
    
    return NextResponse.json({ user }, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Validation failed",
          issues: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Reusable Validation:**

```typescript
// schemas/user.ts
export const EmailSchema = z.string().email().toLowerCase().trim();

export const PasswordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain uppercase letter")
  .regex(/[a-z]/, "Password must contain lowercase letter")
  .regex(/[0-9]/, "Password must contain number");

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: EmailSchema,
  name: z.string().min(1).max(100),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const CreateUserSchema = UserSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
}).extend({
  password: PasswordSchema
});

export const UpdateUserSchema = CreateUserSchema.partial();

// Usage
type User = z.infer<typeof UserSchema>;
type CreateUserInput = z.infer<typeof CreateUserSchema>;
type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
```

**Form Validation with Zod:**

```typescript
// Using with react-hook-form
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const FormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string()
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  }
);

function SignupForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(FormSchema)
  });
  
  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    // data is validated and typed
    await createUser(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} />
      {errors.email && <span>{errors.email.message}</span>}
      
      <input type="password" {...register("password")} />
      {errors.password && <span>{errors.password.message}</span>}
      
      <input type="password" {...register("confirmPassword")} />
      {errors.confirmPassword && <span>{errors.confirmPassword.message}</span>}
      
      <button type="submit">Sign Up</button>
    </form>
  );
}
```

---

## Event Loop & Async

### JavaScript Event Loop (Single-threaded)

**Key Concept:** JavaScript is single-threaded but can handle async operations through the event loop.

```
┌───────────────────────────┐
│     Call Stack            │  ← Currently executing code
└───────────┬───────────────┘
            │
┌───────────▼───────────────┐
│     Web APIs              │  ← Browser APIs (setTimeout, fetch, etc.)
└───────────┬───────────────┘
            │
┌───────────▼───────────────┐
│     Task Queue            │  ← Callbacks waiting to execute
│  (Macrotask Queue)        │
└───────────────────────────┘
            │
┌───────────▼───────────────┐
│   Microtask Queue         │  ← Promises, queueMicrotask
└───────────────────────────┘
            │
            └──────▶ Event Loop checks and moves tasks to Call Stack
```

**Execution Order:**

```javascript
console.log("1: Synchronous");

setTimeout(() => {
  console.log("2: setTimeout (Macrotask)");
}, 0);

Promise.resolve().then(() => {
  console.log("3: Promise (Microtask)");
});

console.log("4: Synchronous");

// Output:
// 1: Synchronous
// 4: Synchronous
// 3: Promise (Microtask)      ← Microtasks run first
// 2: setTimeout (Macrotask)   ← Then macrotasks
```

**Why This Order?**

1. **Call Stack** executes synchronous code first
2. **Microtask Queue** (Promises) executes next
3. **Macrotask Queue** (setTimeout, setInterval) executes last

**Detailed Example:**

```javascript
console.log("Start");

setTimeout(() => {
  console.log("Timeout 1");
  Promise.resolve().then(() => console.log("Promise in Timeout 1"));
}, 0);

Promise.resolve()
  .then(() => {
    console.log("Promise 1");
    setTimeout(() => console.log("Timeout in Promise 1"), 0);
  })
  .then(() => console.log("Promise 2"));

setTimeout(() => {
  console.log("Timeout 2");
}, 0);

console.log("End");

// Output:
// Start
// End
// Promise 1
// Promise 2
// Timeout 1
// Promise in Timeout 1
// Timeout in Promise 1
// Timeout 2
```

**Visual Breakdown:**

```
Call Stack: [console.log("Start")]
           [console.log("End")]

Microtask Queue: [Promise 1] → [Promise 2]

Macrotask Queue: [Timeout 1] → [Timeout 2]

Execution:
1. Sync code runs (Start, End)
2. Microtasks run (Promise 1, Promise 2)
3. First macrotask runs (Timeout 1)
   - Its microtask runs immediately (Promise in Timeout 1)
4. Next macrotasks run (Timeout in Promise 1, Timeout 2)
```

### Async/Await Deep Dive

```javascript
// Promise chain (harder to read)
function fetchUserData(userId) {
  return fetch(`/api/users/${userId}`)
    .then(response => response.json())
    .then(user => {
      return fetch(`/api/posts?userId=${user.id}`);
    })
    .then(response => response.json())
    .then(posts => {
      return { user, posts };
    })
    .catch(error => {
      console.error(error);
    });
}

// Async/await (cleaner)
async function fetchUserData(userId) {
  try {
    const userResponse = await fetch(`/api/users/${userId}`);
    const user = await userResponse.json();
    
    const postsResponse = await fetch(`/api/posts?userId=${user.id}`);
    const posts = await postsResponse.json();
    
    return { user, posts };
  } catch (error) {
    console.error(error);
    throw error;
  }
}
```

**Parallel vs Sequential:**

```javascript
// Sequential (slower - waits for each)
async function sequential() {
  const user1 = await fetchUser(1);   // Wait 1s
  const user2 = await fetchUser(2);   // Wait 1s
  const user3 = await fetchUser(3);   // Wait 1s
  return [user1, user2, user3];       // Total: 3s
}

// Parallel (faster - all at once)
async function parallel() {
  const [user1, user2, user3] = await Promise.all([
    fetchUser(1),
    fetchUser(2),
    fetchUser(3)
  ]);
  return [user1, user2, user3];       // Total: 1s
}

// Mixed approach
async function mixed() {
  // Fetch user first (required for posts)
  const user = await fetchUser(1);
  
  // Then fetch posts and comments in parallel
  const [posts, comments] = await Promise.all([
    fetchPosts(user.id),
    fetchComments(user.id)
  ]);
  
  return { user, posts, comments };
}
```

**Error Handling:**

```javascript
// Handle individual promise failures
async function fetchWithFallback() {
  const results = await Promise.allSettled([
    fetchUser(1),
    fetchUser(2),
    fetchUser(3)
  ]);
  
  const users = results
    .filter(result => result.status === "fulfilled")
    .map(result => result.value);
    
  const errors = results
    .filter(result => result.status === "rejected")
    .map(result => result.reason);
    
  return { users, errors };
}

// Race condition (use first to complete)
async function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController();
  
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

---

## Array Methods Deep Dive

### forEach vs for...of vs for...in

```javascript
const arr = [1, 2, 3, 4, 5];

// forEach - functional style
arr.forEach((item, index, array) => {
  console.log(item);
  // Can't use break or continue
  // Can't return early
});

// for...of - iterate over values
for (const item of arr) {
  console.log(item);
  if (item === 3) break; // ✓ Can break
}

// for...in - iterate over INDICES (avoid for arrays!)
for (const index in arr) {
  console.log(index); // "0", "1", "2" (strings!)
}

// Traditional for - full control
for (let i = 0; i < arr.length; i++) {
  console.log(arr[i]);
  if (i === 2) continue;
}
```

### map vs forEach

```javascript
const numbers = [1, 2, 3, 4, 5];

// map - RETURNS new array
const doubled = numbers.map(n => n * 2);
console.log(doubled); // [2, 4, 6, 8, 10]

// forEach - NO return value (returns undefined)
const result = numbers.forEach(n => n * 2);
console.log(result); // undefined

// ✗ Common mistake
const doubled = numbers.forEach(n => n * 2); // Wrong!

// ✓ Correct
const doubled = numbers.map(n => n * 2);
```

**When to use:**
- **map**: Transform array to new array
- **forEach**: Side effects (logging, updating external variables)

### filter vs find vs every vs some

```javascript
const users = [
  { id: 1, name: "John", age: 25, active: true },
  { id: 2, name: "Jane", age: 30, active: false },
  { id: 3, name: "Bob", age: 35, active: true },
  { id: 4, name: "Alice", age: 28, active: true }
];

// filter - Returns ARRAY of all matching items
const activeUsers = users.filter(user => user.active);
// [{ id: 1, ... }, { id: 3, ... }, { id: 4, ... }]

// find - Returns FIRST matching item (or undefined)
const john = users.find(user => user.name === "John");
// { id: 1, name: "John", age: 25, active: true }

const notFound = users.find(user => user.name === "Nobody");
// undefined

// findIndex - Returns INDEX of first match (or -1)
const johnIndex = users.findIndex(user => user.name === "John");
// 0

// every - Returns true if ALL items match
const allActive = users.every(user => user.active);
// false (Jane is not active)

const allAdults = users.every(user => user.age >= 18);
// true

// some - Returns true if AT LEAST ONE item matches
const hasActive = users.some(user => user.active);
// true

const hasMinor = users.some(user => user.age < 18);
// false
```

**Performance Comparison:**

```javascript
const largeArray = Array(1000000).fill().map((_, i) => i);

// filter - checks ALL items (slow if you only need first)
console.time('filter');
const filtered = largeArray.filter(n => n > 500000);
console.timeEnd('filter'); // ~10ms

// find - stops at FIRST match (fast)
console.time('find');
const found = largeArray.find(n => n > 500000);
console.timeEnd('find'); // ~5ms

// some - stops at FIRST match (fast)
console.time('some');
const hasBig = largeArray.some(n => n > 500000);
console.timeEnd('some'); // ~5ms

// every - stops at FIRST non-match (fast for early failure)
console.time('every');
const allSmall = largeArray.every(n => n < 1000);
console.timeEnd('every'); // ~0.1ms (stops immediately)
```

**Decision Tree:**

```
Need to transform all items? → map
Need all matching items? → filter
Need first matching item? → find
Need to check if all match? → every
Need to check if any match? → some
Just doing side effects? → forEach
```

### reduce - The Most Powerful

```javascript
const numbers = [1, 2, 3, 4, 5];

// Sum
const sum = numbers.reduce((acc, curr) => acc + curr, 0);
// 15

// Product
const product = numbers.reduce((acc, curr) => acc * curr, 1);
// 120

// Group by property
const users = [
  { name: "John", role: "admin" },
  { name: "Jane", role: "user" },
  { name: "Bob", role: "admin" }
];

const byRole = users.reduce((acc, user) => {
  if (!acc[user.role]) {
    acc[user.role] = [];
  }
  acc[user.role].push(user);
  return acc;
}, {});
// { admin: [{ name: "John", ...}, { name: "Bob", ...}], user: [...] }

// Count occurrences
const fruits = ["apple", "banana", "apple", "orange", "banana", "apple"];
const count = fruits.reduce((acc, fruit) => {
  acc[fruit] = (acc[fruit] || 0) + 1;
  return acc;
}, {});
// { apple: 3, banana: 2, orange: 1 }

// Flatten array
const nested = [[1, 2], [3, 4], [5, 6]];
const flat = nested.reduce((acc, curr) => acc.concat(curr), []);
// [1, 2, 3, 4, 5, 6]

// Or use flat()
const flat2 = nested.flat();
// [1, 2, 3, 4, 5, 6]

// Build object from array
const items = [
  { id: 1, name: "Item 1" },
  { id: 2, name: "Item 2" }
];
const itemsById = items.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});
// { 1: { id: 1, name: "Item 1" }, 2: { id: 2, name: "Item 2" } }
```

### Method Chaining

```javascript
const users = [
  { name: "John", age: 25, active: true, score: 85 },
  { name: "Jane", age: 30, active: false, score: 92 },
  { name: "Bob", age: 35, active: true, score: 78 },
  { name: "Alice", age: 28, active: true, score: 95 }
];

// Get average score of active users over 25
const averageScore = users
  .filter(user => user.active)           // [John, Bob, Alice]
  .filter(user => user.age > 25)         // [Bob, Alice]
  .map(user => user.score)               // [78, 95]
  .reduce((sum, score) => sum + score, 0) // 173
  / 2;                                    // 86.5

// Get names of top 3 active users by score
const topNames = users
  .filter(user => user.active)
  .sort((a, b) => b.score - a.score)
  .slice(0, 3)
  .map(user => user.name);
// ["Alice", "John", "Bob"]
```

---

## Vue.js Composition vs Options API

### Options API (Vue 2 style)

```vue
<script>
export default {
  name: 'UserProfile',
  
  // Data
  data() {
    return {
      user: null,
      loading: false,
      error: null
    }
  },
  
  // Computed properties
  computed: {
    fullName() {
      return this.user ? `${this.user.firstName} ${this.user.lastName}` : '';
    },
    isAdmin() {
      return this.user?.role === 'admin';
    }
  },
  
  // Methods
  methods: {
    async fetchUser(id) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await fetch(`/api/users/${id}`);
        this.user = await response.json();
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    
    updateUser(data) {
      this.user = { ...this.user, ...data };
    }
  },
  
  // Lifecycle hooks
  mounted() {
    this.fetchUser(this.$route.params.id);
  },
  
  // Watchers
  watch: {
    '$route.params.id': {
      handler(newId) {
        this.fetchUser(newId);
      },
      immediate: false
    }
  }
}
</script>

<template>
  <div>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <div v-else-if="user">
      <h1>{{ fullName }}</h1>
      <p v-if="isAdmin">Admin User</p>
    </div>
  </div>
</template>
```

### Composition API (Vue 3 style)

```vue
<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

// Reactive state
const user = ref(null);
const loading = ref(false);
const error = ref(null);

// Computed properties
const fullName = computed(() => {
  return user.value ? `${user.value.firstName} ${user.value.lastName}` : '';
});

const isAdmin = computed(() => {
  return user.value?.role === 'admin';
});

// Methods
async function fetchUser(id) {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await fetch(`/api/users/${id}`);
    user.value = await response.json();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function updateUser(data) {
  user.value = { ...user.value, ...data };
}

// Lifecycle
onMounted(() => {
  fetchUser(route.params.id);
});

// Watchers
watch(
  () => route.params.id,
  (newId) => {
    fetchUser(newId);
  }
);
</script>

<template>
  <div>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <div v-else-if="user">
      <h1>{{ fullName }}</h1>
      <p v-if="isAdmin">Admin User</p>
    </div>
  </div>
</template>
```

### Key Differences

| Feature | Options API | Composition API |
|---------|-------------|-----------------|
| **Organization** | By type (data, methods, computed) | By feature/concern |
| **Reusability** | Mixins (conflicts possible) | Composables (clean) |
| **TypeScript** | Limited support | Excellent support |
| **Logic grouping** | Scattered across options | Grouped together |
| **Bundle size** | Larger | Smaller (tree-shakeable) |
| **Learning curve** | Easier for beginners | More flexible, powerful |

### Composables (Reusable Logic)

**Options API Mixin (old way):**
```javascript
// userMixin.js
export default {
  data() {
    return {
      user: null,
      loading: false
    }
  },
  methods: {
    async fetchUser(id) {
      // ... fetch logic
    }
  }
}

// Usage (potential naming conflicts!)
export default {
  mixins: [userMixin],
  data() {
    return {
      loading: false // ❌ Conflicts with mixin!
    }
  }
}
```

**Composition API Composable (new way):**
```typescript
// composables/useUser.ts
import { ref, Ref } from 'vue';

export function useUser() {
  const user: Ref<User | null> = ref(null);
  const loading = ref(false);
  const error = ref(null);
  
  async function fetchUser(id: string) {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await fetch(`/api/users/${id}`);
      user.value = await response.json();
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }
  
  return {
    user,
    loading,
    error,
    fetchUser
  };
}

// Usage - clear where everything comes from
<script setup>
import { useUser } from '@/composables/useUser';
import { useAuth } from '@/composables/useAuth';

const { user, loading, fetchUser } = useUser();
const { isAuthenticated, logout } = useAuth();

// No naming conflicts!
</script>
```

### When to Use Each

**Use Options API when:**
- Team is more familiar with Vue 2
- Simple components
- Consistency with existing codebase

**Use Composition API when:**
- Need to reuse logic across components
- Using TypeScript
- Complex component logic
- Building a library/composables
- Want better code organization

### Real-world Composable Example

```typescript
// composables/useFetch.ts
import { ref, Ref } from 'vue';

interface UseFetchOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useFetch<T>(
  url: string,
  options: UseFetchOptions<T> = {}
) {
  const data: Ref<T | null> = ref(null);
  const loading = ref(false);
  const error: Ref<Error | null> = ref(null);
  
  async function execute() {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(response.statusText);
      
      const result = await response.json();
      data.value = result;
      
      options.onSuccess?.(result);
    } catch (err) {
      error.value = err as Error;
      options.onError?.(err as Error);
    } finally {
      loading.value = false;
    }
  }
  
  if (options.immediate) {
    execute();
  }
  
  return {
    data,
    loading,
    error,
    execute
  };
}

// Usage
<script setup>
import { useFetch } from '@/composables/useFetch';

const { data: users, loading, error, execute } = useFetch('/api/users', {
  immediate: true,
  onSuccess: (data) => console.log('Users loaded:', data)
});
</script>
```

---

## Browser & Networking

### How Browser Knows Which DNS to Go To

**Complete DNS Resolution Flow:**

```
1. User types "example.com" in browser
         ↓
2. Browser checks its cache
   - Has IP for example.com? → Use it
   - No? → Continue
         ↓
3. Browser checks OS cache
   - Windows: ipconfig /displaydns
   - Mac/Linux: lookupd cache
         ↓
4. OS checks /etc/hosts file (local DNS overrides)
   127.0.0.1  localhost
   192.168.1.10  mydev.local
         ↓
5. OS asks Router/ISP DNS Server (configured in network settings)
   - Usually 8.8.8.8 (Google) or 1.1.1.1 (Cloudflare)
   - Or ISP's DNS (auto-configured via DHCP)
         ↓
6. ISP DNS checks its cache
   - Has record? → Return IP
   - No? → Continue to Root DNS
         ↓
7. Root DNS Server (13 root servers worldwide)
   - "I don't know example.com, but ask .com nameserver"
   - Returns: a.gtld-servers.net (handles .com domains)
         ↓
8. TLD DNS Server (.com nameserver)
   - "I don't know exact IP, but ask example.com's nameserver"
   - Returns: ns1.example.com
         ↓
9. Authoritative DNS Server (example.com's nameserver)
   - "example.com is at 93.184.216.34"
         ↓
10. IP returned to browser, cached at each level
         ↓
11. Browser connects to 93.184.216.34:443 (HTTPS)
```

**DNS Records:**

```bash
# A Record - Domain to IPv4
example.com.  IN  A  93.184.216.34

# AAAA Record - Domain to IPv6
example.com.  IN  AAAA  2606:2800:220:1:248:1893:25c8:1946

# CNAME Record - Alias (one domain points to another)
www.example.com.  IN  CNAME  example.com.

# MX Record - Mail server
example.com.  IN  MX  10 mail.example.com.

# TXT Record - Text data (SPF, DKIM, verification)
example.com.  IN  TXT  "v=spf1 include:_spf.google.com ~all"

# NS Record - Nameservers
example.com.  IN  NS  ns1.example.com.
example.com.  IN  NS  ns2.example.com.
```

**Configure DNS in Code:**

```javascript
// Node.js - Set custom DNS servers
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

// Manual DNS lookup
dns.resolve4('example.com', (err, addresses) => {
  console.log(addresses); // ['93.184.216.34']
});
```

**TTL (Time To Live):**

```bash
# DNS record with TTL
example.com.  300  IN  A  93.184.216.34
              ↑
           TTL in seconds (5 minutes)
           
# After 5 minutes, caches expire and re-query
```

---

## Next.js Specifics

### Server Components vs Client Components

**Server Components (Default in App Router):**

```tsx
// app/users/page.tsx
// This is a Server Component by default
async function UsersPage() {
  // Fetch directly on server - no API route needed!
  const users = await db.user.findMany();
  
  return (
    <div>
      <h1>Users</h1>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}

export default UsersPage;

// ✓ Benefits:
// - Direct database access
// - No client-side JavaScript sent
// - SEO friendly
// - Faster initial load
```

**Client Components:**

```tsx
// components/Counter.tsx
'use client'; // Required for client-side interactivity

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}

// ✓ Use when you need:
// - useState, useEffect, etc.
// - Event listeners (onClick, onChange)
// - Browser APIs (localStorage, window)
// - Third-party libraries that use browser APIs
```

**Mixing Server and Client:**

```tsx
// app/dashboard/page.tsx (Server Component)
import ClientCounter from '@/components/Counter'; // Client Component

async function DashboardPage() {
  const stats = await db.stats.get(); // Server-side data fetch
  
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Total Users: {stats.totalUsers}</p>
      
      {/* Client component for interactivity */}
      <ClientCounter />
    </div>
  );
}
```

### Data Fetching in Next.js

**Server-side Fetch:**

```tsx
// app/posts/page.tsx
async function PostsPage() {
  // Automatic fetch caching and deduplication
  const posts = await fetch('https://api.example.com/posts', {
    cache: 'force-cache' // Default: cache forever
  });
  
  return <PostList posts={posts} />;
}

// Revalidate cache every 60 seconds
async function PostsPageRevalidate() {
  const posts = await fetch('https://api.example.com/posts', {
    next: { revalidate: 60 }
  });
  
  return <PostList posts={posts} />;
}

// No caching (always fresh)
async function PostsPageNoCache() {
  const posts = await fetch('https://api.example.com/posts', {
    cache: 'no-store'
  });
  
  return <PostList posts={posts} />;
}
```

**API Routes:**

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});

// GET /api/users
export async function GET(request: NextRequest) {
  try {
    const users = await db.user.findMany();
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = CreateUserSchema.parse(body);
    
    const user = await db.user.create({ data });
    
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
```

**Dynamic Routes:**

```typescript
// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await db.user.findUnique({
    where: { id: params.id }
  });
  
  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json({ user });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await db.user.delete({
    where: { id: params.id }
  });
  
  return NextResponse.json({ success: true });
}
```

### Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Authentication check
  const token = request.cookies.get('auth-token');
  
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Add custom headers
  const response = NextResponse.next();
  response.headers.set('x-custom-header', 'my-value');
  
  return response;
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*'
  ]
};
```

---

## Node.js Backend

### Express.js Best Practices

**Project Structure:**

```
src/
├── routes/
│   ├── users.ts
│   ├── posts.ts
│   └── auth.ts
├── controllers/
│   ├── userController.ts
│   └── postController.ts
├── services/
│   ├── userService.ts
│   └── emailService.ts
├── middleware/
│   ├── auth.ts
│   ├── validation.ts
│   └── errorHandler.ts
├── models/
│   ├── User.ts
│   └── Post.ts
├── utils/
│   └── logger.ts
└── server.ts
```

**Full Example:**

```typescript
// src/server.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import userRoutes from './routes/users';
import authRoutes from './routes/auth';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

```typescript
// src/routes/users.ts
import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import * as userController from '../controllers/userController';

const router = Router();

router.get('/', authenticateToken, userController.getUsers);

router.post(
  '/',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    validateRequest
  ],
  userController.createUser
);

router.get('/:id', authenticateToken, userController.getUserById);

export default router;
```

```typescript
// src/controllers/userController.ts
import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/userService';

export async function getUsers(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const users = await userService.getAllUsers();
    res.json({ users });
  } catch (error) {
    next(error); // Pass to error handler
  }
}

export async function createUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
}

export async function getUserById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await userService.getUserById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    next(error);
  }
}
```

```typescript
// src/services/userService.ts
import { db } from '../db';
import bcrypt from 'bcrypt';

export async function getAllUsers() {
  return await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      // Don't return password!
    }
  });
}

export async function createUser(data: {
  email: string;
  password: string;
  name: string;
}) {
  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 10);
  
  const user = await db.user.create({
    data: {
      ...data,
      password: hashedPassword
    }
  });
  
  // Don't return password
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function getUserById(id: string) {
  return await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true
    }
  });
}
```

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;
    
    req.user = payload;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}
```

```typescript
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err.stack);
  
  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      error: 'Database error',
      details: err.message
    });
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.message
    });
  }
  
  // Default error
  res.status(500).json({
    error: 'Internal server error'
  });
}
```

### MySQL with Prisma

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  password  String
  role      Role     @default(USER)
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([email])
}

model Post {
  id        String   @id @default(uuid())
  title     String
  content   String   @db.Text
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([authorId])
}

enum Role {
  USER
  ADMIN
}
```

```typescript
// src/db.ts
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

export const db = globalThis.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error']
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db;
}
```

**Common Queries:**

```typescript
// Find many with filtering
const users = await db.user.findMany({
  where: {
    role: 'ADMIN',
    email: {
      contains: '@example.com'
    }
  },
  include: {
    posts: true
  },
  orderBy: {
    createdAt: 'desc'
  },
  take: 10,
  skip: 0
});

// Find one
const user = await db.user.findUnique({
  where: { id: userId },
  include: { posts: true }
});

// Create
const user = await db.user.create({
  data: {
    email: 'user@example.com',
    name: 'John',
    password: hashedPassword,
    posts: {
      create: [
        { title: 'First Post', content: 'Content' }
      ]
    }
  }
});

// Update
const user = await db.user.update({
  where: { id: userId },
  data: { name: 'Jane' }
});

// Delete
await db.user.delete({
  where: { id: userId }
});

// Transaction
await db.$transaction([
  db.user.create({ data: userData }),
  db.post.create({ data: postData })
]);

// Raw SQL (when needed)
const users = await db.$queryRaw`
  SELECT * FROM User WHERE email LIKE ${`%${search}%`}
`;
```

---

## Common Interview Questions

### Q: Explain JavaScript's event loop

**A:** JavaScript is single-threaded but handles async operations through the event loop:

1. **Call Stack** executes synchronous code
2. Async operations (setTimeout, fetch) go to **Web APIs**
3. When complete, callbacks go to **Task Queue** (macrotasks) or **Microtask Queue** (promises)
4. **Event Loop** checks if call stack is empty, then moves microtasks (higher priority) then macrotasks to call stack

```javascript
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
// Output: 1, 4, 3, 2
// (sync first, then microtasks, then macrotasks)
```

---

### Q: What's the difference between `==` and `===`?

**A:**
- `==` (loose equality): Performs type coercion before comparison
- `===` (strict equality): No type coercion, checks type AND value

```javascript
5 == "5"   // true (coerces "5" to number)
5 === "5"  // false (different types)

null == undefined   // true (special case)
null === undefined  // false

// Always use === unless you specifically need coercion
```

---

### Q: What are closures?

**A:** A closure is a function that has access to variables from its outer scope, even after the outer function has returned.

```typescript
function makeCounter() {
  let count = 0; // Private variable
  
  return {
    increment: () => ++count,
    decrement: () => --count,
    getValue: () => count
  };
}

const counter = makeCounter();
counter.increment(); // 1
counter.increment(); // 2
counter.getValue();  // 2
// count is not directly accessible (encapsulation)
```

**Real use case:**
```typescript
function createAPIClient(baseURL: string) {
  const token = localStorage.getItem('token');
  
  return {
    get: async (endpoint: string) => {
      return fetch(`${baseURL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    post: async (endpoint: string, data: any) => {
      return fetch(`${baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
    }
  };
}

const api = createAPIClient('https://api.example.com');
api.get('/users'); // token is remembered via closure
```

---

### Q: What is `this` in JavaScript?

**A:** `this` refers to the context in which a function is called:

```javascript
// 1. Global context
console.log(this); // window (browser) or global (Node.js)

// 2. Object method
const user = {
  name: 'John',
  greet() {
    console.log(this.name); // 'John'
  }
};

// 3. Arrow functions (lexical this - inherits from parent)
const obj = {
  name: 'John',
  regularFn: function() {
    console.log(this.name); // 'John'
  },
  arrowFn: () => {
    console.log(this.name); // undefined (inherits from outer scope)
  }
};

// 4. Event handlers
button.addEventListener('click', function() {
  console.log(this); // button element
});

button.addEventListener('click', () => {
  console.log(this); // window (lexical scope)
});

// 5. Explicit binding
function greet() {
  console.log(this.name);
}
greet.call({ name: 'John' }); // 'John'
greet.apply({ name: 'Jane' }); // 'Jane'
const boundGreet = greet.bind({ name: 'Bob' });
boundGreet(); // 'Bob'
```

---

### Q: Explain async/await vs Promises

**A:**
```javascript
// Promises
function fetchUserPromise(id) {
  return fetch(`/api/users/${id}`)
    .then(res => res.json())
    .then(user => {
      return fetch(`/api/posts?userId=${user.id}`);
    })
    .then(res => res.json())
    .catch(error => console.error(error));
}

// Async/Await (cleaner, easier to read)
async function fetchUserAsync(id) {
  try {
    const userRes = await fetch(`/api/users/${id}`);
    const user = await userRes.json();
    
    const postsRes = await fetch(`/api/posts?userId=${user.id}`);
    const posts = await postsRes.json();
    
    return { user, posts };
  } catch (error) {
    console.error(error);
  }
}
```

**Benefits of async/await:**
- More readable, looks like synchronous code
- Better error handling with try/catch
- Easier to debug

---

### Q: What's the difference between `let`, `const`, and `var`?

**A:**

| Feature | var | let | const |
|---------|-----|-----|-------|
| Scope | Function | Block | Block |
| Hoisting | Yes (undefined) | Yes (TDZ) | Yes (TDZ) |
| Reassignable | Yes | Yes | No |
| Redeclarable | Yes | No | No |

```javascript
// var - function scoped
function varExample() {
  if (true) {
    var x = 1;
  }
  console.log(x); // 1 (accessible outside block)
}

// let - block scoped
function letExample() {
  if (true) {
    let x = 1;
  }
  console.log(x); // ReferenceError: x is not defined
}

// const - block scoped, cannot reassign
const PI = 3.14;
PI = 3.15; // TypeError: Assignment to constant variable

// But object properties can be modified
const obj = { name: 'John' };
obj.name = 'Jane'; // ✓ Works
obj = { name: 'Bob' }; // ✗ Error

// Hoisting differences
console.log(a); // undefined (var is hoisted)
var a = 5;

console.log(b); // ReferenceError: Cannot access before initialization
let b = 5;

console.log(c); // ReferenceError: Cannot access before initialization
const c = 5;
```

**Best Practice:** Always use `const` by default, only use `let` when you need to reassign. Never use `var`.

---

### Q: What is destructuring?

**A:** Extract values from arrays or objects into variables:

```javascript
// Array destructuring
const arr = [1, 2, 3, 4, 5];
const [first, second, ...rest] = arr;
// first = 1, second = 2, rest = [3, 4, 5]

// Skip elements
const [a, , c] = arr;
// a = 1, c = 3

// Default values
const [x = 0, y = 0] = [5];
// x = 5, y = 0

// Object destructuring
const user = {
  id: 1,
  name: 'John',
  email: 'john@example.com',
  address: {
    city: 'NYC',
    country: 'USA'
  }
};

const { name, email } = user;
// name = 'John', email = 'john@example.com'

// Rename variables
const { name: userName, email: userEmail } = user;
// userName = 'John', userEmail = 'john@example.com'

// Nested destructuring
const { address: { city } } = user;
// city = 'NYC'

// Default values
const { phone = 'N/A' } = user;
// phone = 'N/A'

// Function parameters
function greet({ name, age = 18 }) {
  console.log(`Hello ${name}, age ${age}`);
}
greet({ name: 'John' }); // Hello John, age 18
```

---

### Q: What is the spread operator?

**A:** The spread operator (`...`) expands iterables:

```javascript
// Array spreading
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = [...arr1, ...arr2]; // [1, 2, 3, 4, 5, 6]

// Copy array (shallow)
const copy = [...arr1];

// Object spreading
const obj1 = { a: 1, b: 2 };
const obj2 = { c: 3, d: 4 };
const merged = { ...obj1, ...obj2 }; // { a: 1, b: 2, c: 3, d: 4 }

// Override properties
const updated = { ...obj1, b: 99 }; // { a: 1, b: 99 }

// Function arguments
const numbers = [1, 5, 3, 9, 2];
Math.max(...numbers); // 9
// Same as: Math.max(1, 5, 3, 9, 2)

// Rest parameters (opposite of spread)
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}
sum(1, 2, 3, 4); // 10
```

---

### Q: What is the difference between `map()` and `forEach()`?

**A:**

```javascript
const numbers = [1, 2, 3, 4, 5];

// forEach - no return value, used for side effects
numbers.forEach(n => console.log(n)); // Returns: undefined

// map - returns new array
const doubled = numbers.map(n => n * 2); // Returns: [2, 4, 6, 8, 10]

// ✗ Wrong - forEach doesn't return
const result = numbers.forEach(n => n * 2); // undefined

// ✓ Correct - use map for transformation
const result = numbers.map(n => n * 2); // [2, 4, 6, 8, 10]
```

**When to use:**
- `map()`: Transform array to new array
- `forEach()`: Side effects (logging, updating external state)

---

### Q: Explain debouncing and throttling

**A:** Both limit function execution frequency:

**Debouncing** - Execute after delay when calls stop:
```javascript
// Useful for search input
function debounce(func, delay) {
  let timeoutId;
  
  return function(...args) {
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// Usage
const searchAPI = (query) => {
  console.log('Searching for:', query);
};

const debouncedSearch = debounce(searchAPI, 500);

// User types: "hello"
debouncedSearch('h');     // Cancelled
debouncedSearch('he');    // Cancelled
debouncedSearch('hel');   // Cancelled
debouncedSearch('hell');  // Cancelled
debouncedSearch('hello'); // Executes after 500ms
```

**Throttling** - Execute at most once per time period:
```javascript
// Useful for scroll events
function throttle(func, limit) {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// Usage
const handleScroll = () => {
  console.log('Scroll position:', window.scrollY);
};

const throttledScroll = throttle(handleScroll, 1000);

window.addEventListener('scroll', throttledScroll);
// Executes at most once per second, even if you scroll continuously
```

**Summary:**
- **Debounce**: Wait until activity stops (search, resize)
- **Throttle**: Execute at regular intervals (scroll, mouse move)

---

### Q: What is hoisting?

**A:** JavaScript moves declarations to the top of their scope during compilation:

```javascript
// Variable hoisting
console.log(x); // undefined (declaration hoisted, not assignment)
var x = 5;

// Equivalent to:
var x;
console.log(x);
x = 5;

// Function hoisting
sayHello(); // Works! Function declarations are fully hoisted
function sayHello() {
  console.log('Hello');
}

// Function expressions are NOT hoisted
sayGoodbye(); // TypeError: sayGoodbye is not a function
var sayGoodbye = function() {
  console.log('Goodbye');
};

// let/const hoisting (Temporal Dead Zone)
console.log(y); // ReferenceError
let y = 5;

// Classes are NOT hoisted
const instance = new MyClass(); // ReferenceError
class MyClass {}
```

---

### Q: What are Promises?

**A:** Promises represent eventual completion (or failure) of an async operation:

```javascript
// Creating a Promise
const myPromise = new Promise((resolve, reject) => {
  const success = true;
  
  if (success) {
    resolve('Operation succeeded');
  } else {
    reject('Operation failed');
  }
});

// Using Promises
myPromise
  .then(result => console.log(result))
  .catch(error => console.error(error))
  .finally(() => console.log('Cleanup'));

// Promise states
// 1. Pending - initial state
// 2. Fulfilled - operation completed successfully
// 3. Rejected - operation failed

// Promise.all - wait for all
Promise.all([
  fetch('/api/users'),
  fetch('/api/posts')
]).then(([users, posts]) => {
  console.log('Both done');
}).catch(error => {
  console.log('At least one failed');
});

// Promise.race - first to complete
Promise.race([
  fetch('/api/fast'),
  fetch('/api/slow')
]).then(result => {
  console.log('First one done');
});

// Promise.allSettled - wait for all, regardless of success/failure
Promise.allSettled([
  Promise.resolve(1),
  Promise.reject('error'),
  Promise.resolve(3)
]).then(results => {
  // [
  //   { status: 'fulfilled', value: 1 },
  //   { status: 'rejected', reason: 'error' },
  //   { status: 'fulfilled', value: 3 }
  // ]
});
```

---

### Q: What is `null` vs `undefined`?

**A:**

```javascript
// undefined - variable declared but not assigned
let x;
console.log(x); // undefined

// null - intentional absence of value
let y = null;
console.log(y); // null

// Comparison
null == undefined;  // true (loose equality)
null === undefined; // false (different types)

typeof undefined; // "undefined"
typeof null;      // "object" (historical bug!)

// Practical use
function getUser(id) {
  if (id === 1) {
    return { name: 'John' };
  }
  return null; // Explicitly return "no user found"
}

// Optional chaining
const user = { name: 'John' };
console.log(user?.address?.city); // undefined (safe)
console.log(user.address.city);   // TypeError

// Nullish coalescing
const name = null ?? 'Default'; // 'Default'
const age = 0 ?? 18;            // 0 (only null/undefined trigger default)
```

---

### Q: What is prototypal inheritance?

**A:** JavaScript objects inherit properties from other objects via prototypes:

```javascript
// Constructor function
function Person(name) {
  this.name = name;
}

Person.prototype.greet = function() {
  return `Hello, I'm ${this.name}`;
};

const john = new Person('John');
john.greet(); // "Hello, I'm John"

// Inheritance chain
john.hasOwnProperty('name');  // true (own property)
john.hasOwnProperty('greet'); // false (inherited from prototype)

// ES6 Classes (syntactic sugar over prototypes)
class Animal {
  constructor(name) {
    this.name = name;
  }
  
  speak() {
    console.log(`${this.name} makes a sound`);
  }
}

class Dog extends Animal {
  speak() {
    console.log(`${this.name} barks`);
  }
}

const dog = new Dog('Rex');
dog.speak(); // "Rex barks"

// Prototype chain
console.log(dog.__proto__ === Dog.prototype);           // true
console.log(Dog.prototype.__proto__ === Animal.prototype); // true
console.log(Animal.prototype.__proto__ === Object.prototype); // true
console.log(Object.prototype.__proto__); // null (end of chain)
```

---

### Q: What are WeakMap and WeakSet?

**A:** Like Map/Set but keys are weakly held (can be garbage collected):

```javascript
// Map - strong reference (prevents garbage collection)
const map = new Map();
let obj = { data: 'value' };
map.set(obj, 'metadata');
obj = null; // Object still in memory because Map holds reference

// WeakMap - weak reference (allows garbage collection)
const weakMap = new WeakMap();
let obj2 = { data: 'value' };
weakMap.set(obj2, 'metadata');
obj2 = null; // Object can be garbage collected

// Use cases
// 1. Private data
const privateData = new WeakMap();

class User {
  constructor(name) {
    privateData.set(this, { ssn: '123-45-6789' });
    this.name = name;
  }
  
  getSSN() {
    return privateData.get(this).ssn;
  }
}

// 2. DOM node metadata (without memory leaks)
const nodeData = new WeakMap();
const element = document.querySelector('#myDiv');
nodeData.set(element, { clickCount: 0 });
// When element is removed from DOM, data is automatically cleaned up
```

---

### Q: Explain event delegation

**A:** Handle events on parent instead of individual children:

```javascript
// Bad - attach listener to each item
document.querySelectorAll('.item').forEach(item => {
  item.addEventListener('click', handleClick);
});
// Problems: 
// - Performance issue with many items
// - Doesn't work for dynamically added items

// Good - event delegation
document.querySelector('.list').addEventListener('click', (e) => {
  if (e.target.classList.contains('item')) {
    handleClick(e);
  }
});
// Benefits:
// - One listener for all items
// - Works for dynamically added items
// - Better performance

// Real example - todo list
document.querySelector('#todo-list').addEventListener('click', (e) => {
  const target = e.target;
  
  // Delete button clicked
  if (target.classList.contains('delete-btn')) {
    const todoId = target.closest('.todo-item').dataset.id;
    deleteTodo(todoId);
  }
  
  // Checkbox clicked
  if (target.classList.contains('todo-checkbox')) {
    const todoId = target.closest('.todo-item').dataset.id;
    toggleTodo(todoId);
  }
});
```

---

### Q: What is memoization?

**A:** Cache function results to avoid recalculation:

```javascript
// Without memoization (slow for repeated calls)
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
fibonacci(40); // Takes seconds

// With memoization (fast)
function memoize(fn) {
  const cache = {};
  
  return function(...args) {
    const key = JSON.stringify(args);
    
    if (key in cache) {
      return cache[key]; // Return cached result
    }
    
    const result = fn.apply(this, args);
    cache[key] = result;
    return result;
  };
}

const fibMemo = memoize(function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
});

fibMemo(40); // Fast!

// React.memo example
const ExpensiveComponent = React.memo(({ data }) => {
  // Only re-renders if data changes
  return <div>{expensiveCalculation(data)}</div>;
});
```

---

### Q: What is the difference between synchronous and asynchronous code?

**A:**

```javascript
// Synchronous (blocking)
console.log('1');
console.log('2');
console.log('3');
// Output: 1, 2, 3 (in order)

// Asynchronous (non-blocking)
console.log('1');
setTimeout(() => console.log('2'), 0);
console.log('3');
// Output: 1, 3, 2 (setTimeout is async)

// Real-world example
// Synchronous - blocks UI
function syncFetch() {
  const data = blockingAPICall(); // UI freezes here
  displayData(data);
}

// Asynchronous - doesn't block UI
async function asyncFetch() {
  const data = await fetch('/api/data'); // UI remains responsive
  displayData(data);
}
```

---

## Performance Optimization Tips

### 1. Avoid Memory Leaks

```javascript
// Memory leak - event listener not removed
function badComponent() {
  const button = document.querySelector('#btn');
  button.addEventListener('click', handleClick);
  // Component removed but listener still exists!
}

// Good - cleanup
function goodComponent() {
  const button = document.querySelector('#btn');
  const handleClick = () => console.log('clicked');
  
  button.addEventListener('click', handleClick);
  
  // Cleanup
  return () => {
    button.removeEventListener('click', handleClick);
  };
}

// React example
useEffect(() => {
  const handleScroll = () => console.log('scrolled');
  window.addEventListener('scroll', handleScroll);
  
  return () => {
    window.removeEventListener('scroll', handleScroll); // Cleanup
  };
}, []);
```

### 2. Use Lazy Loading

```typescript
// Next.js dynamic imports
import dynamic from 'next/dynamic';

// Load component only when needed
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false // Don't render on server
});

// Conditional loading
function Page() {
  const [showChart, setShowChart] = useState(false);
  
  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>
      {showChart && <HeavyComponent />}
    </div>
  );
}
```

### 3. Optimize Re-renders (React)

```typescript
// Bad - re-renders on every parent render
function ChildComponent({ data }) {
  return <div>{data}</div>;
}

// Good - only re-renders when data changes
const ChildComponent = React.memo(({ data }) => {
  return <div>{data}</div>;
});

// useMemo - cache expensive calculations
function Component({ items }) {
  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price, 0);
  }, [items]); // Only recalculate when items change
  
  return <div>Total: {total}</div>;
}

// useCallback - cache function references
function Parent() {
  const [count, setCount] = useState(0);
  
  // Bad - new function on every render
  const handleClick = () => setCount(c => c + 1);
  
  // Good - same function reference
  const handleClick = useCallback(() => {
    setCount(c => c + 1);
  }, []); // Empty deps = never changes
  
  return <Child onClick={handleClick} />;
}
```

### 4. Database Query Optimization

```typescript
// Bad - N+1 query problem
const users = await db.user.findMany();
for (const user of users) {
  const posts = await db.post.findMany({
    where: { authorId: user.id }
  });
  // 1 query for users + N queries for posts = N+1
}

// Good - use include (JOIN)
const users = await db.user.findMany({
  include: {
    posts: true
  }
});
// Single query with JOIN

// Add indexes
// prisma/schema.prisma
model Post {
  id       String @id
  authorId String
  
  @@index([authorId]) // Speed up queries by authorId
}

// Use select to fetch only needed fields
const users = await db.user.findMany({
  select: {
    id: true,
    name: true
    // Don't fetch password, createdAt, etc.
  }
});
```

---

## Quick Reference Cheat Sheet

### Array Methods
```javascript
// Transform
map()      // Return new array
filter()   // Return matching items
reduce()   // Reduce to single value

// Find
find()     // Return first match
findIndex()// Return index of first match
some()     // At least one matches?
every()    // All match?
includes() // Contains value?

// Modify (mutate original)
push()     // Add to end
pop()      // Remove from end
unshift()  // Add to start
shift()    // Remove from start
splice()   // Add/remove at index
sort()     // Sort in place

// Don't mutate
concat()   // Merge arrays
slice()    // Copy portion
flat()     // Flatten nested arrays
```

### String Methods
```javascript
// Transform
toUpperCase(), toLowerCase()
trim(), trimStart(), trimEnd()
replace(search, replace)
replaceAll(search, replace)

// Extract
slice(start, end)
substring(start, end)
substr(start, length) // Deprecated
split(separator)

// Search
indexOf(str)
includes(str)
startsWith(str)
endsWith(str)
match(regex)

// Check
length
charAt(index)
charCodeAt(index)
```

### Object Methods
```javascript
Object.keys(obj)       // Array of keys
Object.values(obj)     // Array of values
Object.entries(obj)    // Array of [key, value] pairs
Object.assign(target, ...sources) // Merge objects
Object.freeze(obj)     // Make immutable
Object.seal(obj)       // Prevent add/delete properties
Object.hasOwn(obj, key) // Check if own property
```

---

## Final Tips for Interview

1. **Think out loud** - Explain your thought process
2. **Ask clarifying questions** - Don't assume requirements
3. **Start simple** - Get a working solution first, then optimize
4. **Test your code** - Walk through with example inputs
5. **Consider edge cases** - null, undefined, empty arrays, etc.
6. **Know Big O** - Time and space complexity
7. **Be honest** - If you don't know, say so and explain how you'd find out

**Common patterns to know:**
- Loops (for, while, forEach, map)
- Recursion
- Two pointers
- Hash maps for O(1) lookups
- Sliding window
- Binary search
- DFS/BFS (for trees/graphs)

**Good luck with your interview!** 🚀

🧠 1. Why JavaScript Is Single-Threaded

JavaScript was designed to run in the browser — which means safety and responsiveness are more important than raw parallelism.

It runs on a single main thread, meaning only one piece of JS code executes at a time.

If one piece of code blocks (like a while loop doing heavy work), the UI freezes.

So:
✅ Single-threaded means only one call stack executing JS.
❌ But that doesn’t mean “only one thing happens at once” — because the browser handles async tasks outside the JS engine.

⚙️ 2. The Event Loop (How Concurrency Works)

Here’s how JS mimics multithreading using the event loop, task queue, and Web APIs.

🧩 Example:
console.log("A");

setTimeout(() => console.log("B"), 0);

console.log("C");

Execution Flow:
Step	Action	Explanation
1	console.log("A")	Runs immediately
2	setTimeout	Sent to Web API, callback waits 0ms
3	console.log("C")	Runs immediately
4	Web API pushes B to callback queue	
5	Event loop checks if call stack empty → yes → executes B	

✅ Output:

A
C
B


So even with “0ms”, setTimeout waits for the current call stack to clear — that’s the event loop’s job.

JS gets concurrency (many things in progress) without true multithreading — because the browser or Node.js runtime runs I/O, timers, and network operations in parallel under the hood, not the JS thread.

🔁 3. The Array Iterator Methods

These are functional programming tools to process arrays declaratively.

.forEach()

Iterate through array, but cannot break or return a new array.

[1, 2, 3].forEach(n => console.log(n * 2));


🧩 Use when you need side effects, not transformation.

.map()

Returns a new array with transformed elements.

const doubled = [1, 2, 3].map(n => n * 2);
// [2, 4, 6]


🧩 Use when you need a 1:1 transformation.

.filter()

Returns new array only with elements that pass a test.

const even = [1, 2, 3, 4].filter(n => n % 2 === 0);
// [2, 4]


🧩 Use for conditional extraction.

.every()

Checks if all elements pass the test → returns boolean.

[2, 4, 6].every(n => n % 2 === 0); // true


🧩 Use for validation.

.some()

Checks if at least one element passes the test.

[1, 3, 5, 6].some(n => n % 2 === 0); // true


🧩 Use for “exists” checks.

.reduce()

Reduce array to a single value.

[1, 2, 3, 4].reduce((sum, n) => sum + n, 0); // 10


🧩 Use for aggregation.

🧩 4. The 300 Carousels State Problem

Let’s restate your challenge:

You have 300 carousels, each showing a set of items (maybe grouped by category/type).
If you store all in a single state and filter per render, performance and complexity go out of hand.

Yes — because if your state looks like this:

const [items, setItems] = useState(allData);


And for each carousel you do:

{items.filter(i => i.type === 'typeA').map(...)}


→ React re-runs the filter 300 times on every render → very inefficient.

🧠 Solution Strategies
1️⃣ Normalize & Slice State

Instead of one giant array, store by category key:

const [carousels, setCarousels] = useState({
  sports: [...],
  luxury: [...],
  electric: [...],
});


So each carousel reads directly:

<Carousel data={carousels.sports} />


✅ Efficient — each carousel only re-renders when its own subset updates.

2️⃣ Use useMemo()

If the raw data must remain flat:

const sportsCars = useMemo(() => items.filter(i => i.type === 'sports'), [items]);


✅ Caches the filtered result until items changes.
❌ Still runs 300 filters once when data loads (fine for small-medium data).

3️⃣ Centralized Store (Zustand / Redux / Context)

Use a store that caches data by type:

// useCarouselsStore.js
import create from 'zustand';

export const useCarouselsStore = create(set => ({
  carousels: {},
  setCarousel: (type, data) =>
    set(state => ({ carousels: { ...state.carousels, [type]: data } })),
}));


Then in each carousel:

const data = useCarouselsStore(state => state.carousels[type]);


✅ Scales easily
✅ Only affected carousel re-renders
✅ Ideal for 100+ dynamic UIs

4️⃣ Virtualization for Large Lists

If each carousel has many items — use libraries like:

react-window

react-virtualized

They render only what’s visible in the viewport — massive performance boost.

5️⃣ Lazy Loading / Suspense

For 300 carousels, don’t render all immediately:

const Carousels = dynamic(() => import('./Carousel'), { suspense: true });


or:

{visibleTypes.map(type => <Carousel key={type} ... />)}


Only mount when scrolled into view.

🧭 Summary
Concept	Description	Analogy
JS Single Threaded	One execution thread for JS code	One worker at a time
Event Loop	Scheduler that lets async work run later	Worker + message queue
Array Methods	Functional helpers to process data	Transformation pipeline
useMemo	Caches derived values	Mini local cache
Store (Zustand/Redux)	Global shared state manager	Warehouse for carousels
Virtualization	Only render visible items	Lazy painting on scroll