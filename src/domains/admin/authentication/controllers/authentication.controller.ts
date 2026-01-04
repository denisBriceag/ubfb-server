import { Auth } from '../decorators/auth.decorator';
import { AuthType } from '../types/auth-type.enum';
import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { AuthenticationService } from '../services/authentication.service';
import { REFRESH_TOKEN_KEY } from '@core/constants';
import type { Request, Response } from 'express';
import { CookieService } from '@core/cookies/services/cookie.service';
import { SignUpDto } from '../dto/sign-up.dto';
import { AuthResponse } from '../types/auth-response.type';
import { SignInDto } from '../dto/sign-in.dto';
import { ActiveUserData } from '../types/active-user-data.type';
import { getAccessToken } from '@core/utils';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

@ApiTags('Authentication')
@Auth(AuthType.None)
@Controller()
export class AuthenticationController {
  constructor(
    private readonly _authService: AuthenticationService,
    private readonly _cookiesService: CookieService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Auth(AuthType.Bearer)
  @Header('Cache-Control', 'no-store')
  @ApiBearerAuth('access-token')
  @Get('me')
  async me(@Req() request: Request): Promise<ActiveUserData> {
    return await this._authService.me(request);
  }

  @HttpCode(HttpStatus.OK)
  @Post('sign-up')
  async signUp(
    @Body() signUpDto: SignUpDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Pick<AuthResponse, 'accessToken'>> {
    const { accessToken, refreshToken } =
      await this._authService.signUp(signUpDto);

    this._cookiesService.setCookie(response, REFRESH_TOKEN_KEY, refreshToken);

    return { accessToken };
  }

  @Post('password-reset-request')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this._authService.requestPasswordReset(dto.email);
  }

  @Post('password-reset-confirm')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this._authService.resetPassword(dto.token, dto.newPassword);
  }

  @HttpCode(HttpStatus.OK)
  @Post('sign-in')
  async signIn(
    @Body() signInDto: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Pick<AuthResponse, 'accessToken'>> {
    const { accessToken, refreshToken } =
      await this._authService.signIn(signInDto);

    this._cookiesService.setCookie(response, REFRESH_TOKEN_KEY, refreshToken);

    return { accessToken };
  }

  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiCookieAuth(REFRESH_TOKEN_KEY)
  @Get('sign-out')
  signOut(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    this._cookiesService.clearCookie(response, REFRESH_TOKEN_KEY);

    return this._authService.signOut(
      request.cookies[REFRESH_TOKEN_KEY],
      getAccessToken(request),
    );
  }

  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiCookieAuth(REFRESH_TOKEN_KEY)
  @Get('refresh-tokens')
  async refreshTokens(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Pick<AuthResponse, 'accessToken'>> {
    const { accessToken, refreshToken } = await this._authService.refreshTokens(
      {
        accessToken: getAccessToken(request),
        refreshToken: request.cookies[REFRESH_TOKEN_KEY],
      },
    );

    this._cookiesService.setCookie(response, REFRESH_TOKEN_KEY, refreshToken);

    return { accessToken };
  }
}
