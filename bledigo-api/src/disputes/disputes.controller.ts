import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto, AddEvidenceDto, DecideDisputeDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('disputes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  create(@CurrentUser('id') me: string, @Body() dto: CreateDisputeDto) {
    return this.disputesService.create(me, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin, UserRole.support)
  findAll(@Query() q: any) {
    return this.disputesService.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.disputesService.findOne(id);
  }

  @Post(':id/evidence')
  addEvidence(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: AddEvidenceDto) {
    return this.disputesService.addEvidence(id, me, dto);
  }

  @Post(':id/decide')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin, UserRole.support)
  decide(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: DecideDisputeDto) {
    return this.disputesService.decide(me, id, dto);
  }
}
