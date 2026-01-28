import { Module } from '@nestjs/common';
import { AuthenticationService } from './services/authentication.service';
import { CookiesModule } from '@core/cookies';
import { RedisModule } from '@core/redis';
import { AccessTokenGuard } from './guards/access-token/access-token.guard';
import { APP_GUARD } from '@nestjs/core';
import { AuthenticationGuard } from './guards/authentication/authentication.guard';
import { RolesGuard } from './guards/roles/roles.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@features/user/entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import jwtConfig from './configs/jwt.config';
import { ConfigModule } from '@nestjs/config';
import { HashingModule } from '@core/hashing';
import { AuthenticationController } from './controllers/authentication.controller';
import { UserModule } from '@features/user/user.module';

@Module({
  controllers: [AuthenticationController],
  providers: [
    AuthenticationService,
    AccessTokenGuard,
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
    UserModule,
    RedisModule,
    CookiesModule,
    HashingModule,
  ],
})
export class AuthenticationModule {}
