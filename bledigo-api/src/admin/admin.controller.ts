import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ListingStatus, CertificationLevel } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin, UserRole.support, UserRole.agent)
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.service.dashboard();
  }

  @Get('audit-logs')
  logs(@Query('page') page = 1, @Query('limit') limit = 50) {
    return this.service.auditLogs(Number(page), Number(limit));
  }

  @Patch('listings/:id/status')
  moderate(@Param('id') id: string, @Body('status') status: ListingStatus) {
    return this.service.moderateListing(id, status);
  }

  @Post('listings/:id/certify')
  certify(@CurrentUser('id') me: string, @Param('id') id: string, @Body('level') level: CertificationLevel) {
    return this.service.certify(id, level, me);
  }

  @Post('sanctions')
  sanction(@CurrentUser('id') me: string, @Body() dto: any) {
    return this.service.sanction(me, dto);
  }

  @Get('sanctions')
  activeSanctions() {
    return this.service.activeSanctions();
  }

  @Post('sanctions/:id/revoke')
  revoke(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.service.revokeSanction(me, id);
  }

  @Get('payments/held')
  heldPayments() {
    return this.service.heldPayments();
  }

  @Post('payments/:id/settle')
  settle(
    @CurrentUser('id') me: string,
    @Param('id') id: string,
    @Body() dto: { decision: 'release' | 'refund'; motif?: string },
  ) {
    return this.service.settleHeldPayment(me, id, dto.decision, dto.motif ?? 'Decision administrateur');
  }

  @Post('control-visits')
  visit(@CurrentUser('id') me: string, @Body() dto: any) {
    return this.service.scheduleControlVisit(me, dto);
  }
}
