import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { AssignInspectionDto } from './dto/assign-inspection.dto';
import { CompleteInspectionDto } from './dto/complete-inspection.dto';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { InspectionsService } from './inspections.service';

type AuthenticatedRequest = Request & {
  user: { id: number; email: string; role: UserRole; name: string };
};

@Controller('inspections')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InspectionsController {
  constructor(private readonly inspections: InspectionsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.inspections.findForUser(request.user);
  }

  @Post()
  @Roles(UserRole.Manager)
  create(@Body() dto: CreateInspectionDto = new CreateInspectionDto()) {
    return this.inspections.create(dto?.inspectorId);
  }

  @Patch(':id/assign')
  @Roles(UserRole.Manager)
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignInspectionDto,
  ) {
    return this.inspections.assign(id, dto.inspectorId);
  }

  @Patch(':id/complete')
  @Roles(UserRole.Inspector)
  complete(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteInspectionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.inspections.complete(id, request.user.id, dto);
  }
}
