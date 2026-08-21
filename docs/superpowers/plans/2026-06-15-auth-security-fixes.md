# Auth Security Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all Critical, High, and Medium authentication vulnerabilities identified in the security review.

**Architecture:** Six sequential tasks — each touches one concern. Tasks 1–2 touch different files independently. Tasks 3–6 each modify a different method in `authentication.service.ts` and must run in order (each reads the file left by the previous task). No new files, no new modules, no new error codes needed — `INVALID_CREDENTIALS` already exists in `ERROR_MAP` and `ErrorsEnum`.

**Tech Stack:** NestJS, TypeORM, ioredis, @nestjs/swagger (OmitType), bcrypt, JWT

---

## File Map

| File | Tasks |
|---|---|
| `src/features/authentication/dto/sign-up.dto.ts` | Task 1 |
| `src/features/authentication/services/authentication.service.ts` | Tasks 1, 3, 4, 5, 6 |
| `src/features/user/services/user.service.ts` | Task 2 |

---

## Task 1: Fix sign-up — remove role field, force Roles.USER

**Issue:** `sign-up` is public and `SignUpDto extends CreateUserDto` which includes `role: Roles`. Anyone can self-register as `SUPER_ADMIN`.

**Files:**
- Modify: `src/features/authentication/dto/sign-up.dto.ts`
- Modify: `src/features/authentication/services/authentication.service.ts` — `signUp` method only

### Background

`SignUpDto` currently is:
```typescript
import { CreateUserDto } from '@features/user/dto/create-user.dto';
export class SignUpDto extends CreateUserDto {}
```

This exposes `role` in the request body. The fix uses `OmitType` from `@nestjs/swagger` (already a project dependency) to strip `role` from the DTO, then forces `Roles.USER` in the service.

- [ ] **Step 1: Replace `sign-up.dto.ts`**

```typescript
import { OmitType } from '@nestjs/swagger';
import { CreateUserDto } from '@features/user/dto/create-user.dto';

export class SignUpDto extends OmitType(CreateUserDto, ['role'] as const) {}
```

- [ ] **Step 2: Update `signUp` in `authentication.service.ts`**

Find the `signUp` method and replace it:

```typescript
async signUp(signUpDto: SignUpDto): Promise<AuthResponse> {
  try {
    const user = (await this._userService.create(
      { ...signUpDto, role: Roles.USER },
      true,
    )) as User;

    return await this._generateTokens(user);
  } catch (err) {
    if (err.code === ErrorsEnum.PG_UNIQUE_VIOLATION) {
      throw new ConflictException({
        message: ErrorsEnum.SIGN_UP_CONFLICT,
        errorCode: ERROR_MAP.SIGN_UP_CONFLICT,
      });
    }

    throw err;
  }
}
```

Add `Roles` to the imports at the top of `authentication.service.ts` — it comes from `@core/types/roles.enum`:

```typescript
import { Roles } from '@core/types/roles.enum';
```

- [ ] **Step 3: Build to verify**

```bash
pnpm run build 2>&1 | tail -5
```

Expected: clean build, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/authentication/dto/sign-up.dto.ts src/features/authentication/services/authentication.service.ts
git commit -m "fix(auth): remove role from SignUpDto, force Roles.USER on self-registration"
```

---

## Task 2: Fix findOneByEmail — exclude soft-deleted users

**Issue:** `findOneByEmail` always uses `.withDeleted()`, allowing soft-deleted users to sign in and receive password reset emails.

**Files:**
- Modify: `src/features/user/services/user.service.ts` — `findOneByEmail` method only

### Background

Current signature:
```typescript
async findOneByEmail(email: User['email'], withPassword = false): Promise<User>
```

The method has `.withDeleted()` hardcoded. Both callers in `authentication.service.ts` (`signIn` and `requestPasswordReset`) should not find deleted users. Adding `withDeleted = false` as a third parameter with a safe default fixes all callers without touching them.

- [ ] **Step 1: Update `findOneByEmail` in `user.service.ts`**

Find the `findOneByEmail` method and replace it entirely:

```typescript
async findOneByEmail(
  email: User['email'],
  withPassword = false,
  withDeleted = false,
): Promise<User> {
  const queryBuilder = this._userRepository
    .createQueryBuilder('user')
    .leftJoin('user.updater', 'updater')
    .addSelect(['updater.id', 'updater.email'])
    .where('user.email = :email', { email });

  if (withDeleted) {
    queryBuilder.withDeleted();
  }

  if (withPassword) {
    queryBuilder.addSelect('user.password');
  }

  const user = await queryBuilder.getOne();

  if (!user) {
    throw new NotFoundException({
      message: ERROR_MESSAGES.notFound('email', email, 'user'),
      errorCode: ERROR_MAP.INVALID_EMAIL,
    });
  }

  return user;
}
```

- [ ] **Step 2: Build to verify**

```bash
pnpm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/features/user/services/user.service.ts
git commit -m "fix(auth): exclude soft-deleted users from findOneByEmail"
```

---

## Task 3: Fix signIn — unified error + timing attack

**Issues:**
- Unknown email → 404 (from `findOneByEmail`), wrong password → 401: leaks email existence
- Different `errorCode` values (`USER_DOES_NO_EXIST` vs `PASS_DOES_NOT_MATCH`): leaks email existence even with unified status
- Timing attack: bcrypt only runs when email exists, response time reveals existence

**Files:**
- Modify: `src/features/authentication/services/authentication.service.ts` — add `_DUMMY_HASH` field + replace `signIn` method

### Background

`INVALID_CREDENTIALS` already exists in both `ErrorsEnum` and `ERROR_MAP`. A static bcrypt hash is used as a dummy target when the email isn't found so bcrypt always runs, equalising response time regardless of email existence.

The dummy hash must be a valid bcrypt hash string (cost factor 10). We use a hardcoded constant — it never matches any real password, its only purpose is to keep bcrypt running.

- [ ] **Step 1: Add `_DUMMY_HASH` private field to `AuthenticationService`**

Find the class fields block (where `_redisKey`, `_redisDenyKey`, etc. are defined) and add:

```typescript
private readonly _DUMMY_HASH =
  '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
```

- [ ] **Step 2: Replace `signIn` method**

```typescript
async signIn(signInDto: SignInDto): Promise<AuthResponse> {
  const invalidCredentials = new UnauthorizedException({
    message: ErrorsEnum.INVALID_CREDENTIALS,
    errorCode: ERROR_MAP.INVALID_CREDENTIALS,
  });

  let user: User | null = null;

  try {
    user = await this._userService.findOneByEmail(signInDto.email, true);
  } catch {}

  const isEqual = await this._hashingService.compare(
    signInDto.password,
    user?.password ?? this._DUMMY_HASH,
  );

  if (!user || !isEqual) throw invalidCredentials;

  return this._generateTokens(user);
}
```

- [ ] **Step 3: Build to verify**

```bash
pnpm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add src/features/authentication/services/authentication.service.ts
git commit -m "fix(auth): unify signIn error, prevent email enumeration and timing attack"
```

---

## Task 4: Fix me() — remove redundant JWT verification

**Issue:** `AccessTokenGuard` already verifies the JWT and sets `request['user']`. `me()` re-reads the header, re-verifies the JWT (without the deny-list check), then hits the DB. The broad `try/catch` also swallows DB errors as 401.

**Files:**
- Modify: `src/features/authentication/services/authentication.service.ts` — `me` method only

### Background

`AccessTokenGuard` sets `request[REQUEST_USER_KEY] = payload` after full validation (including deny-list). `REQUEST_USER_KEY = 'user'` is already exported from `@core/constants` and already imported in `authentication.service.ts`. `TokenSignature` is also already imported.

`findOneById(sub, false)` throws `NotFoundException` if the user was deleted after the token was issued — that should become a 401, not a 404. All other errors (DB down etc.) should propagate as 500.

- [ ] **Step 1: Update imports in `authentication.service.ts`**

**Add `NotFoundException`** to the `@nestjs/common` import block:
```typescript
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
```

**Add `REQUEST_USER_KEY`** to the `@core/constants` import:
```typescript
import { ERROR_MAP, ErrorsEnum, REQUEST_USER_KEY } from '@core/constants';
```

- [ ] **Step 2: Replace `me` method**

```typescript
async me(request: Request): Promise<ActiveUserData> {
  const { sub } = request[REQUEST_USER_KEY] as TokenSignature;

  try {
    const { id, email, name, surname, role } =
      await this._userService.findOneById(sub, false);

    return { sub: id, email, name, surname, role };
  } catch (err) {
    if (err instanceof NotFoundException) {
      throw new UnauthorizedException({
        message: ErrorsEnum.USER_DOES_NO_EXIST,
        errorCode: ERROR_MAP.USER_DOES_NO_EXIST,
      });
    }

    throw err;
  }
}
```

- [ ] **Step 3: Build to verify**

```bash
pnpm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add src/features/authentication/services/authentication.service.ts
git commit -m "fix(auth): remove redundant JWT verification in me(), surface DB errors as 500"
```

---

## Task 5: Fix refreshTokens — kill session on reuse, emit REFRESH_TOKEN_REUSE

**Issues:**
- When a reused refresh token is detected, the user's session in Redis is not invalidated — an attacker who triggered the reuse keeps their access
- `REFRESH_TOKEN_REUSE` error code is never emitted — the outer catch swallows it as `ACCESS_DENIED`

**Files:**
- Modify: `src/features/authentication/services/authentication.service.ts` — `refreshTokens` method only

### Background

`validate()` in `RedisService` throws `InvalidatedRefreshTokenError` (never returns `false`) when the stored token ID doesn't match. This error currently gets caught by the outer `catch` and becomes `ACCESS_DENIED`, losing the specific error code and skipping session invalidation.

The fix restructures `refreshTokens` into explicit try/catch blocks so `InvalidatedRefreshTokenError` can be caught specifically.

`InvalidatedRefreshTokenError` is exported from `@core/redis`. It must be imported at the top of `authentication.service.ts`.

- [ ] **Step 1: Add `InvalidatedRefreshTokenError` import**

Add to the imports in `authentication.service.ts`:

```typescript
import { InvalidatedRefreshTokenError, RedisService } from '@core/redis';
```

(Replace the existing `import { RedisService } from '@core/redis';` line.)

- [ ] **Step 2: Replace `refreshTokens` method**

```typescript
async refreshTokens({
  refreshToken,
  accessToken,
}: RefreshTokenDto): Promise<AuthResponse> {
  if (!refreshToken) {
    throw new ForbiddenException({
      message: ErrorsEnum.ACCESS_DENIED_NO_REFRESH_TOKEN,
      errorCode: ERROR_MAP.ACCESS_DENIED_NO_REFRESH_TOKEN,
    });
  }

  let sub: string;
  let refreshTokenId: string;
  let typ: string;

  try {
    ({ sub, refreshTokenId, typ } =
      await this._jwtService.verifyAsync<RefreshTokenSignature>(refreshToken, {
        secret: this._jwtConfig.secret,
        audience: this._jwtConfig.audience,
        issuer: this._jwtConfig.issuer,
      }));
  } catch {
    throw new ForbiddenException({
      message: ErrorsEnum.ACCESS_DENIED,
      errorCode: ERROR_MAP.ACCESS_DENIED,
    });
  }

  if (typ !== TokenTypes.REFRESH) {
    throw new UnauthorizedException({
      message: ErrorsEnum.INVALID_TOKEN_TYPE,
      errorCode: ERROR_MAP.INVALID_TOKEN_TYPE,
    });
  }

  const user = await this._userService.findOneById(sub, false);

  try {
    await this._redisService.validate(
      `${this._redisKey}${user.id}`,
      refreshTokenId,
    );
  } catch (err) {
    if (err instanceof InvalidatedRefreshTokenError) {
      await this._redisService.invalidate(`${this._redisKey}${user.id}`);
      throw new UnauthorizedException({
        message: ErrorsEnum.REFRESH_TOKEN_REUSE,
        errorCode: ERROR_MAP.REFRESH_TOKEN_REUSE,
      });
    }
    throw new ForbiddenException({
      message: ErrorsEnum.ACCESS_DENIED,
      errorCode: ERROR_MAP.ACCESS_DENIED,
    });
  }

  await this._redisService.invalidate(`${this._redisKey}${user.id}`);

  if (accessToken) {
    try {
      const at = await this._jwtService.verifyAsync<TokenSignature>(
        accessToken,
        this._jwtConfig,
      );

      if (at?.jti && at?.exp) {
        const ttl = Math.max(0, at.exp * 1000 - Date.now());
        if (ttl > 0) await this._denyAccessToken(at.jti, ttl);
      }
    } catch {
      // ignore invalid access token
    }
  }

  return this._generateTokens(user);
}
```

- [ ] **Step 3: Build to verify**

```bash
pnpm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add src/features/authentication/services/authentication.service.ts
git commit -m "fix(auth): kill session on refresh token reuse, emit REFRESH_TOKEN_REUSE error code"
```

---

## Task 6: Fix _generateTokens — add TTL to Redis refresh token entry

**Issue:** `redisService.insert()` stores the refresh token ID in Redis with no expiry. The JWT itself expires after 24 hours, but the Redis key (`user-<userId>`) persists forever, accumulating orphaned entries and creating a potential attack surface.

**Files:**
- Modify: `src/features/authentication/services/authentication.service.ts` — `_generateTokens` method only

### Background

`_jwtConfig.refreshTokenTtl` is in **seconds** (default: 86400). Redis `set()` with `'PX'` expects **milliseconds**, so multiply by 1000. `RedisService.set()` already supports TTL — it has signature `set(id, value, 'PX', milliseconds)`.

- [ ] **Step 1: Replace `_generateTokens` method**

```typescript
private async _generateTokens(user: User): Promise<AuthResponse> {
  const refreshTokenId = crypto.randomUUID();
  const accessJti = crypto.randomUUID();

  const [accessToken, refreshToken] = await Promise.all([
    this._signToken<Partial<TokenSignature>>(
      user.id,
      this._jwtConfig.accessTokenTtl,
      {
        email: user.email,
        name: user.name,
        surname: user.surname,
        role: user.role,
        jti: accessJti,
        typ: TokenTypes.ACCESS,
      },
    ),

    this._signToken<RefreshTokenSignature>(
      user.id,
      this._jwtConfig.refreshTokenTtl,
      {
        refreshTokenId,
        typ: TokenTypes.REFRESH,
      } as RefreshTokenSignature,
    ),
  ]);

  await this._redisService.set(
    `${this._redisKey}${user.id}`,
    refreshTokenId,
    'PX',
    this._jwtConfig.refreshTokenTtl * 1000,
  );

  return {
    accessToken,
    refreshToken,
  };
}
```

- [ ] **Step 2: Build to verify**

```bash
pnpm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/features/authentication/services/authentication.service.ts
git commit -m "fix(auth): set TTL on Redis refresh token entry matching JWT expiry"
```
