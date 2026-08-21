# Password Reset Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix five bugs in the password reset flow and add a Redis reverse-lookup so requesting a new reset cancels any existing token for that user.

**Architecture:** Four small, sequential changes — jwt config gains `frontendUrl`, MailService gains a `resetLink` param, UserService gains `updatePassword` (single hash), and AuthenticationService's two reset methods are corrected. No new files, no new modules.

**Tech Stack:** NestJS, TypeORM, ioredis, @nestjs-modules/mailer, Jest

---

## File Map

| File | Change |
|---|---|
| `src/features/authentication/configs/jwt.config.ts` | add `frontendUrl` |
| `.env.development` | add `FRONTEND_URL` |
| `.env.production` | add `FRONTEND_URL` |
| `src/core/mail/enums/mail-text.enum.ts` | extend reset text to include link placeholder |
| `src/core/mail/services/mail.service.ts` | add `resetLink` param, fix `text` field |
| `src/core/mail/services/mail.service.spec.ts` | test updated signature |
| `src/features/user/services/user.service.ts` | add `updatePassword` method |
| `src/features/user/services/user.service.spec.ts` | test `updatePassword` |
| `src/features/authentication/services/authentication.service.ts` | fix `requestPasswordReset` and `resetPassword` |
| `src/features/authentication/services/authentication.service.spec.ts` | tests for both fixed methods |

---

## Task 1: Add `frontendUrl` to JWT config and env files

**Files:**
- Modify: `src/features/authentication/configs/jwt.config.ts`
- Modify: `.env.development`
- Modify: `.env.production`

- [ ] **Step 1: Update jwt.config.ts**

Replace the entire file content:

```typescript
import { registerAs } from '@nestjs/config';
import * as process from 'node:process';
export const JWT_CONFIG_KEY = 'jwt';

export default registerAs(JWT_CONFIG_KEY, () => {
  return {
    secret: process.env.JWT_SECRET,
    audience: process.env.JWT_TOKEN_AUDIENCE,
    issuer: process.env.JWT_TOKEN_ISSUER,
    accessTokenTtl: parseInt(process.env.JWT_ACCESS_TOKEN_TTL ?? '600', 10),
    refreshTokenTtl: parseInt(process.env.JWT_REFRESH_TOKEN_TTL ?? '86400', 10),
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:4200',
  };
});
```

- [ ] **Step 2: Add `FRONTEND_URL` to `.env.development`**

Append to the `# Application` section:

```
FRONTEND_URL=http://localhost:4200
```

- [ ] **Step 3: Add `FRONTEND_URL` to `.env.production`**

Append to the `# Application` section (set to your real domain):

```
FRONTEND_URL=https://your-production-domain.com
```

- [ ] **Step 4: Commit**

```bash
git add src/features/authentication/configs/jwt.config.ts .env.development .env.production
git commit -m "feat: add frontendUrl to jwt config"
```

---

## Task 2: Fix MailService — add reset link to email

**Files:**
- Modify: `src/core/mail/enums/mail-text.enum.ts`
- Modify: `src/core/mail/services/mail.service.ts`
- Modify: `src/core/mail/services/mail.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Replace `src/core/mail/services/mail.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { MailerService } from '@nestjs-modules/mailer';
import { mailConfig } from '@core/mail/configs/mail.config';
import { EmailSubject } from '@core/mail/enums/mail-subject.enum';
import { EmailText } from '@core/mail/enums/mail-text.enum';

describe('MailService', () => {
  let service: MailService;
  let mailerService: jest.Mocked<MailerService>;

  const mockMailConfig = { fromName: 'UBFB Admin <noreply@ubfb.com>' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: MailerService,
          useValue: { sendMail: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: mailConfig.KEY,
          useValue: mockMailConfig,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    mailerService = module.get(MailerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendPasswordResetEmail', () => {
    it('sends email with reset link in body', async () => {
      const email = 'user@example.com';
      const resetLink = 'http://localhost:4200/password-reset-confirm?token=abc-123';

      await service.sendPasswordResetEmail(email, resetLink);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: email,
        from: mockMailConfig.fromName,
        subject: EmailSubject.PASSWORD_RESET,
        text: `${EmailText.PASSWORD_RESET}${resetLink}`,
      });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm run test -- --testPathPattern=mail.service
```

Expected: FAIL — `sendPasswordResetEmail` does not accept a second argument yet.

- [ ] **Step 3: Update `mail-text.enum.ts`**

Replace file content:

```typescript
export enum EmailText {
  PASSWORD_RESET = 'You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\nClick the link below to reset your password:\n\n',
}
```

- [ ] **Step 4: Update `mail.service.ts`**

Replace file content:

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { mailConfig } from '@core/mail/configs/mail.config';
import type { ConfigType } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailSubject } from '@core/mail/enums/mail-subject.enum';
import { EmailText } from '@core/mail/enums/mail-text.enum';

@Injectable()
export class MailService {
  constructor(
    private readonly _mailerService: MailerService,
    @Inject(mailConfig.KEY)
    private readonly _config: ConfigType<typeof mailConfig>,
  ) {}

  sendPasswordResetEmail(emailTo: string, resetLink: string): Promise<void> {
    return this._mailerService.sendMail({
      to: emailTo,
      from: this._config.fromName,
      subject: EmailSubject.PASSWORD_RESET,
      text: `${EmailText.PASSWORD_RESET}${resetLink}`,
    });
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm run test -- --testPathPattern=mail.service
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/core/mail/enums/mail-text.enum.ts src/core/mail/services/mail.service.ts src/core/mail/services/mail.service.spec.ts
git commit -m "fix: pass reset link to email body, use EmailText enum"
```

---

## Task 3: Add `updatePassword` to UserService

**Files:**
- Modify: `src/features/user/services/user.service.ts`
- Modify: `src/features/user/services/user.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Replace `src/features/user/services/user.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { HashingService } from '@core/hashing';

describe('UserService', () => {
  let service: UserService;
  let mockRepository: { update: jest.Mock };
  let mockHashingService: { hash: jest.Mock };

  beforeEach(async () => {
    mockRepository = { update: jest.fn().mockResolvedValue(undefined) };
    mockHashingService = { hash: jest.fn().mockResolvedValue('hashed_password') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: mockRepository },
        { provide: HashingService, useValue: mockHashingService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updatePassword', () => {
    it('hashes the new password once and saves it', async () => {
      await service.updatePassword('user-id-123', 'newPassword1');

      expect(mockHashingService.hash).toHaveBeenCalledTimes(1);
      expect(mockHashingService.hash).toHaveBeenCalledWith('newPassword1');
      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: 'user-id-123' },
        { password: 'hashed_password' },
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm run test -- --testPathPattern=user.service
```

Expected: FAIL — `updatePassword is not a function`

- [ ] **Step 3: Add `updatePassword` method to `user.service.ts`**

Add the following method at the end of the `UserService` class, before the closing `}`:

```typescript
async updatePassword(userId: string, newPassword: string): Promise<void> {
  const hashed = await this._hashingService.hash(newPassword);
  await this._userRepository.update({ id: userId }, { password: hashed });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm run test -- --testPathPattern=user.service
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/user/services/user.service.ts src/features/user/services/user.service.spec.ts
git commit -m "feat: add updatePassword method to UserService"
```

---

## Task 4: Fix `requestPasswordReset`

**Files:**
- Modify: `src/features/authentication/services/authentication.service.ts`
- Modify: `src/features/authentication/services/authentication.service.spec.ts`

### Background

Three bugs exist in `requestPasswordReset` (lines 171-186):
1. `findOneByEmail` throws `NotFoundException` when email is unknown — the `if (!user) return` guard is never reached, so the caller learns whether an email is registered (data leak).
2. No reverse-lookup: requesting a new reset while an old token is still active leaves both tokens valid.
3. The `resetToken` is stored in Redis but never sent in the email — the user receives a blank email with no link.

### Fix

- [ ] **Step 1: Write the failing tests**

Replace `src/features/authentication/services/authentication.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationService } from './authentication.service';
import { JwtService } from '@nestjs/jwt';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RedisService } from '@core/redis';
import { HashingService } from '@core/hashing';
import { MailService } from '@core/mail/services/mail.service';
import { UserService } from '@features/user/services/user.service';
import jwtConfig from '../configs/jwt.config';

const mockJwtConfig = {
  secret: 'test-secret',
  audience: 'localhost:3000',
  issuer: 'localhost:3000',
  accessTokenTtl: 600,
  refreshTokenTtl: 86400,
  frontendUrl: 'http://localhost:4200',
};

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let userService: jest.Mocked<Pick<UserService, 'findOneByEmail' | 'findOneById' | 'updatePassword'>>;
  let redisService: jest.Mocked<Pick<RedisService, 'get' | 'set' | 'invalidate'>>;
  let mailService: jest.Mocked<Pick<MailService, 'sendPasswordResetEmail'>>;

  beforeEach(async () => {
    userService = {
      findOneByEmail: jest.fn(),
      findOneById: jest.fn(),
      updatePassword: jest.fn().mockResolvedValue(undefined),
    };

    redisService = {
      get: jest.fn().mockResolvedValue('null'),
      set: jest.fn().mockResolvedValue(undefined),
      invalidate: jest.fn().mockResolvedValue(undefined),
    };

    mailService = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        { provide: JwtService, useValue: { signAsync: jest.fn(), verifyAsync: jest.fn() } },
        { provide: RedisService, useValue: redisService },
        { provide: HashingService, useValue: { hash: jest.fn(), compare: jest.fn() } },
        { provide: MailService, useValue: mailService },
        { provide: UserService, useValue: userService },
        { provide: jwtConfig.KEY, useValue: mockJwtConfig },
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestPasswordReset', () => {
    it('returns silently when email is not found — does not leak existence', async () => {
      userService.findOneByEmail.mockRejectedValue(new NotFoundException());

      await expect(service.requestPasswordReset('unknown@example.com')).resolves.toBeUndefined();
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('sends email with a reset link containing the token', async () => {
      userService.findOneByEmail.mockResolvedValue({ id: 'user-123' } as any);
      redisService.get.mockResolvedValue('null');

      await service.requestPasswordReset('user@example.com');

      expect(mailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      const [emailArg, linkArg] = mailService.sendPasswordResetEmail.mock.calls[0];
      expect(emailArg).toBe('user@example.com');
      expect(linkArg).toMatch(/^http:\/\/localhost:4200\/password-reset-confirm\?token=.+/);
    });

    it('cancels the existing token before issuing a new one', async () => {
      userService.findOneByEmail.mockResolvedValue({ id: 'user-123' } as any);
      redisService.get.mockResolvedValue('old-token-uuid');

      await service.requestPasswordReset('user@example.com');

      expect(redisService.invalidate).toHaveBeenCalledWith('pass:reset:old-token-uuid');
    });

    it('stores both the token→userId and userId→token keys in Redis', async () => {
      userService.findOneByEmail.mockResolvedValue({ id: 'user-123' } as any);
      redisService.get.mockResolvedValue('null');

      await service.requestPasswordReset('user@example.com');

      const setCalls = redisService.set.mock.calls;
      const tokenKey = setCalls.find(([k]) => k.startsWith('pass:reset:') && !k.includes('user:'));
      const userKey = setCalls.find(([k]) => k === 'pass:reset:user:user-123');

      expect(tokenKey).toBeDefined();
      expect(userKey).toBeDefined();
    });
  });

  describe('resetPassword', () => {
    it('throws UnauthorizedException when token does not exist in Redis', async () => {
      redisService.get.mockResolvedValue('null');

      await expect(service.resetPassword('bad-token', 'newPass1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('calls updatePassword and cleans up all three Redis keys on success', async () => {
      redisService.get.mockResolvedValue('user-123');
      userService.findOneById.mockResolvedValue({ id: 'user-123' } as any);

      await service.resetPassword('valid-token', 'newPassword1');

      expect(userService.updatePassword).toHaveBeenCalledWith('user-123', 'newPassword1');
      expect(redisService.invalidate).toHaveBeenCalledWith('pass:reset:valid-token');
      expect(redisService.invalidate).toHaveBeenCalledWith('pass:reset:user:user-123');
      expect(redisService.invalidate).toHaveBeenCalledWith('user-user-123');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm run test -- --testPathPattern=authentication.service
```

Expected: FAIL on all new test cases.

- [ ] **Step 3: Fix `requestPasswordReset` in `authentication.service.ts`**

Replace the `requestPasswordReset` method (lines 171–186):

```typescript
async requestPasswordReset(email: string): Promise<void> {
  let user: User;

  try {
    user = await this._userService.findOneByEmail(email);
  } catch {
    return;
  }

  const existingToken = await this._redisService.get(
    `${this._passResetKey}user:${user.id}`,
  );

  if (existingToken !== 'null') {
    await this._redisService.invalidate(`${this._passResetKey}${existingToken}`);
  }

  const resetToken = crypto.randomUUID();
  const resetLink = `${this._jwtConfig.frontendUrl}/password-reset-confirm?token=${resetToken}`;

  await this._redisService.set(
    `${this._passResetKey}${resetToken}`,
    user.id,
    'PX',
    this._passResetTtl,
  );

  await this._redisService.set(
    `${this._passResetKey}user:${user.id}`,
    resetToken,
    'PX',
    this._passResetTtl,
  );

  await this._mailService.sendPasswordResetEmail(email, resetLink);
}
```

- [ ] **Step 4: Fix `resetPassword` in `authentication.service.ts`**

Replace the `resetPassword` method (lines 188–216):

```typescript
async resetPassword(token: string, newPassword: string): Promise<void> {
  const userId = await this._redisService.get(`${this._passResetKey}${token}`);

  if (userId === 'null') {
    throw new UnauthorizedException({
      message: ErrorsEnum.INVALID_RESET_TOKEN,
      errorCode: ERROR_MAP.INVALID_RESET_TOKEN,
    });
  }

  const user = await this._userService.findOneById(userId, false);

  await this._userService.updatePassword(user.id, newPassword);

  await this._redisService.invalidate(`${this._passResetKey}${token}`);
  await this._redisService.invalidate(`${this._passResetKey}user:${user.id}`);
  await this._redisService.invalidate(`${this._redisKey}${user.id}`);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm run test -- --testPathPattern=authentication.service
```

Expected: all tests PASS.

- [ ] **Step 6: Run full test suite to check for regressions**

```bash
pnpm run test
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/authentication/services/authentication.service.ts src/features/authentication/services/authentication.service.spec.ts
git commit -m "fix: correct requestPasswordReset and resetPassword — link in email, single hash, silent 404, reverse lookup"
```

---

## Task 5: Verify end-to-end with Mailtrap

- [ ] **Step 1: Configure Mailtrap SMTP credentials in `.env.development`**

Add to `.env.development` (get credentials from mailtrap.io → Email Testing → Inboxes → SMTP Settings):

```
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=<your-mailtrap-user>
MAIL_PASS=<your-mailtrap-password>
```

- [ ] **Step 2: Start the server**

```bash
pnpm run start:dev
```

- [ ] **Step 3: Request a password reset**

```bash
curl -X POST http://localhost:3000/admin/auth/password-reset-request \
  -H "Content-Type: application/json" \
  -d '{"email":"<a user email that exists in your DB>"}'
```

Expected: `200 OK`, empty body.

- [ ] **Step 4: Verify email in Mailtrap**

Open [https://mailtrap.io](https://mailtrap.io) → your inbox. You should see the email with subject `UBFB Admin Panel Password Reset` and a body containing a link like:

```
http://localhost:4200/password-reset-confirm?token=<uuid>
```

- [ ] **Step 5: Confirm the reset via the API**

Copy the token from the link and run:

```bash
curl -X POST http://localhost:3000/admin/auth/password-reset-confirm \
  -H "Content-Type: application/json" \
  -d '{"token":"<uuid-from-email>","newPassword":"NewPassword123"}'
```

Expected: `200 OK`.

- [ ] **Step 6: Verify old sessions are invalidated**

Try signing in with the old password — should return `401`. Sign in with `NewPassword123` — should return `200` with a new access token.

- [ ] **Step 7: Verify unknown email returns 200 (no data leak)**

```bash
curl -X POST http://localhost:3000/admin/auth/password-reset-request \
  -H "Content-Type: application/json" \
  -d '{"email":"doesnotexist@example.com"}'
```

Expected: `200 OK` — same response as a known email.
