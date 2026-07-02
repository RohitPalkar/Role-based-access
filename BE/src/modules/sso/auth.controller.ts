import {
  Body,
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { LocalLoginDto } from './dto/local-login.dto';
import { SsoService } from './sso.service';
import { SUCCESS } from 'src/config/constants';

@ApiTags('Local Authentication')
@Controller('auth/local')
export class AuthController {
  constructor(private readonly ssoService: SsoService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local'))
  @ApiOperation({ summary: 'Local login with username/email and password' })
  @ApiBody({ type: LocalLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Login successful' },
        data: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            userRole: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' },
                email: { type: 'string' },
                username: { type: 'string' },
                role: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async login(@Body() _dto: LocalLoginDto, @Req() req: any): Promise<any> {
    const user = req.user;

    const result = await this.ssoService.generateLocalAuthToken(user);

    return result;
  }
}