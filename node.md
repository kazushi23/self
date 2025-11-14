# Node.js TypeScript Express Setup Guide

A comprehensive guide to setting up a production-ready Node.js application with TypeScript, Express, and TypeORM.

## Table of Contents

- [Environment Configuration](#environment-configuration)
- [Error Handling](#error-handling)
- [Logging & Audit Trail](#logging--audit-trail)
- [Database Setup (TypeORM)](#database-setup-typeorm)
- [Authentication](#authentication)
- [Form Validation](#form-validation)
- [Base Service Pattern](#base-service-pattern)
- [JWT Implementation](#jwt-implementation)

---

## Environment Configuration

### Dynamic Environment Management

Create environment-specific files:
- `.env.local`
- `.env.development`
- `.env.production`

### Config Setup

Create a `config.ts` file that reads from the appropriate environment file based on runtime:

```typescript
interface Config {
  port: number;
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
  };
  jwtSecret: string;
  expiresIn: string;
}

// Export a single config object that pulls from the right env file
export const config: Config = {
  // ... values from process.env
};
```

---

## Error Handling

### Custom Error Class

Create a custom `HttpError` class for consistent error handling:

```typescript
export class HttpError extends Error {
  status: number;
  
  constructor(message: string, status = 400, options?: ErrorOptions) {
    super(message, options);
    this.status = status;
  }
}
```

### Usage in Services

```typescript
// In your service layer
throw new HttpError("User not found", 404);
throw new HttpError("Unauthorized", 401);
```

### Controller Error Handling

```typescript
// In your controller
try {
  const result = await userService.getUser(id);
  return res.json(result);
} catch (error) {
  next(error); // Pass to error handler middleware
}
```

### Global Error Handler Middleware

```typescript
function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log the error
  console.error(err);
  
  // Send error response
  const status = err instanceof HttpError ? err.status : 500;
  const message = err.message || "Internal Server Error";
  
  res.status(status).json({
    success: false,
    message,
  });
}

// Register in app
app.use(errorHandler);
```

---

## Logging & Audit Trail

### Request Logging Middleware

Track request duration and log all API calls:

```typescript
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});
```

---

## Database Setup (TypeORM)

### Entity Definitions

#### Document Entity (Many-to-One)

```typescript
@Entity()
export class Document {
  @PrimaryGeneratedColumn()
  id!: number;
  
  @Column({ type: "varchar", length: 255 })
  title!: string;
  
  @Column()
  userId!: number;
  
  @ManyToOne(() => User, user => user.documents)
  @JoinColumn({ name: "userId" })
  user!: User;
}
```

#### User Entity (One-to-Many)

```typescript
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;
  
  @Column({ type: "varchar", length: 255 })
  email!: string;
  
  @OneToMany(() => Document, document => document.user)
  documents!: Document[];
}
```

### Data Source Configuration

```typescript
// data-source.ts
export const AppDataSource = new DataSource({
  type: "postgres",
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.name,
  entities: [Document, User], // Register all entities here
  synchronize: false,
  logging: true,
});
```

---

## Authentication

### Extending Express Request Type

Create type declarations to add user to Request:

```typescript
// types/express/index.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
```

### Authentication Middleware

```typescript
// auth.middleware.ts
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Extract token from header
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      throw new HttpError("No token provided", 401);
    }
    
    // Verify and decode token
    const decoded = verifyToken(token);
    
    // Fetch user from database
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: decoded.id }
    });
    
    if (!user) {
      throw new HttpError("User not found", 401);
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
```

### Route Structure

```
/api
├── index.ts (main router - /api/v1)
├── documentApi.ts
├── fileApi.ts
├── folderApi.ts
└── userApi.ts
```

#### API Index Router

```typescript
// api/index.ts
import { Router } from "express";
import documentRouter from "./documentApi";
import fileRouter from "./fileApi";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.use("/document", authenticate, documentRouter);
router.use("/file", authenticate, fileRouter);

export default router;
```

#### Main App Router

```typescript
// app.ts
import apiRouter from "./api";

app.use("/api/v1", apiRouter);
```

### Using Authenticated User in Controllers

```typescript
async function getUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Access authenticated user
    const currentUser = req.user!;
    
    // Pass to service
    const result = await userService.getUser(id, currentUser);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
}
```

---

## Form Validation

### Using Zod for Schema Validation

Create a schemas folder for validation schemas:

```typescript
// schemas/auth.schema.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email({ message: "Email is not valid" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" })
    // Optional: Add regex for password complexity
    // .regex(/^(?=.*[A-Za-z])(?=.*\d)/, "Password must contain letters and numbers")
});

export type LoginInput = z.infer<typeof loginSchema>;
```

### Validation in Controllers

```typescript
async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsedLogin = loginSchema.safeParse(req.body);
    
    if (!parsedLogin.success) {
      // Use || for falsy values (0, "", null, undefined)
      // Use ?? for only null and undefined
      const message = parsedLogin.error.issues[0].message || "Validation failed";
      return res.status(400).json({
        success: false,
        message,
      });
    }
    
    const { email, password } = parsedLogin.data;
    const result = await authService.login(email, password);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
}
```

---

## Base Service Pattern

### Generic Response Interface

```typescript
export interface ResponseData<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}
```

### Base Service Class

Create a reusable base service with common CRUD operations:

```typescript
import { Repository, ObjectLiteral } from "typeorm";

export class BaseService<T extends ObjectLiteral> {
  protected repository: Repository<T>; // Accessible in class and subclasses
  private defaultLimit = 10; // Only accessible in this class
  
  constructor(repository: Repository<T>) {
    this.repository = repository;
  }
  
  async createOne(data: T): Promise<T> {
    return await this.repository.save(data);
  }
  
  async findById(id: number): Promise<T | null> {
    return await this.repository.findOne({ where: { id } as any });
  }
  
  async findAll(): Promise<T[]> {
    return await this.repository.find({ take: this.defaultLimit });
  }
  
  async updateOne(id: number, data: Partial<T>): Promise<T | null> {
    await this.repository.update(id, data as any);
    return this.findById(id);
  }
  
  async deleteOne(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected !== 0;
  }
}
```

### Extending Base Service

```typescript
import { AppDataSource } from "../data-source";
import bcrypt from "bcrypt";

export class UserService extends BaseService<User> {
  constructor() {
    const userRepository = AppDataSource.getRepository(User);
    super(userRepository);
  }
  
  async createUser(
    email: string,
    name: string,
    password: string
  ): Promise<User> {
    const user = new User();
    user.email = email;
    user.name = name;
    user.password = await bcrypt.hash(password, 10);
    
    return await this.createOne(user);
  }
  
  async findByEmail(email: string): Promise<User | null> {
    return await this.repository.findOne({ where: { email } });
  }
}
```

---

## JWT Implementation

### Environment Variables

```bash
# .env
JWT_SECRET=your-super-secret-key
EXPIRES_IN=7d
```

### JWT Utility

```typescript
// utils/jwt.ts
import jwt from "jsonwebtoken";
import { config } from "../config";

export interface JwtPayload {
  id: number;
  name: string;
  email: string;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.expiresIn,
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}
```

### Usage in Authentication

```typescript
// auth.middleware.ts
import { verifyToken } from "../utils/jwt";

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      throw new HttpError("No token provided", 401);
    }
    
    // Verify token
    const jwtPayload = verifyToken(token);
    
    // ... rest of authentication logic
  } catch (error) {
    next(error);
  }
}
```

### Usage in Login

```typescript
// auth.service.ts
import { generateToken } from "../utils/jwt";

async function login(email: string, password: string) {
  const user = await userService.findByEmail(email);
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new HttpError("Invalid credentials", 401);
  }
  
  const token = generateToken({
    id: user.id,
    name: user.name,
    email: user.email,
  });
  
  return { token, user };
}
```

---

## Project Structure

```
src/
├── config/
│   └── index.ts
├── entities/
│   ├── User.ts
│   └── Document.ts
├── middleware/
│   ├── auth.middleware.ts
│   └── errorHandler.ts
├── services/
│   ├── BaseService.ts
│   └── UserService.ts
├── controllers/
│   └── userController.ts
├── api/
│   ├── index.ts
│   └── userApi.ts
├── schemas/
│   └── auth.schema.ts
├── utils/
│   └── jwt.ts
├── types/
│   └── express/
│       └── index.d.ts
├── data-source.ts
└── app.ts
```

---

## Best Practices

1. **Operator Choice**: Use `||` for all falsy values (0, "", null, undefined), use `??` for only null and undefined
2. **Access Modifiers**: 
   - `protected`: Accessible in class and subclasses
   - `private`: Only accessible in the class itself
3. **Error Handling**: Always use `try-catch` in controllers and pass errors to `next()`
4. **Type Safety**: Leverage TypeScript generics for reusable components
5. **Validation**: Validate all incoming data with Zod schemas
6. **Security**: Always hash passwords and use environment variables for secrets