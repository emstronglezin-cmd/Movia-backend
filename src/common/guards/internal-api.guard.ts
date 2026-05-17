import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class InternalApiGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const secret = process.env.SIMULATOR_SECRET;
    if (!secret) return false;
    const key = req.headers['x-internal-key'];
    if (key !== secret) throw new UnauthorizedException('Clé interne invalide');
    return true;
  }
}
