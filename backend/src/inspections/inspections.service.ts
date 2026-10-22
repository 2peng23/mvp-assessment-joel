import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from '../locations/location.entity';
import { User, UserRole } from '../users/user.entity';
import { AssignInspectionDto } from './dto/assign-inspection.dto';
import { CompleteInspectionDto } from './dto/complete-inspection.dto';
import { Inspection, InspectionStatus } from './inspection.entity';

type InspectionUser = Pick<User, 'id' | 'email' | 'name' | 'role'>;

@Injectable()
export class InspectionsService {
  constructor(
    @InjectRepository(Inspection)
    private readonly inspections: Repository<Inspection>,
    @InjectRepository(Location)
    private readonly locations: Repository<Location>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async create(inspectorId: number | undefined) {
    if (
      typeof inspectorId !== 'number' ||
      !Number.isInteger(inspectorId) ||
      inspectorId < 1
    ) {
      throw new BadRequestException('A valid Inspector ID is required');
    }

    const inspector = await this.users.findOneBy({
      id: inspectorId,
      role: UserRole.Inspector,
    });
    if (!inspector) {
      throw new NotFoundException('Inspector not found');
    }

    const inspection = this.inspections.create({
      status: InspectionStatus.YetToStart,
      location: null,
      assignedInspector: inspector,
      startedAt: null,
      durationMinutes: null,
      passed: null,
      comments: null,
    });
    return this.toResponse(await this.inspections.save(inspection));
  }

  async findForUser(user: InspectionUser) {
    const inspections = await this.inspections.find({
      where:
        user.role === UserRole.Manager
          ? {}
          : { assignedInspector: { id: user.id } },
      relations: { location: true, assignedInspector: true },
      order: { createdAt: 'DESC' },
    });
    return inspections.map((inspection) => this.toResponse(inspection));
  }

  async assign(inspectionId: number, inspectorId: number) {
    const inspection = await this.findOne(inspectionId);
    if (inspection.status !== InspectionStatus.YetToStart) {
      throw new ConflictException('Only inspections yet to start can be assigned');
    }

    const inspector = await this.users.findOneBy({
      id: inspectorId,
      role: UserRole.Inspector,
    });
    if (!inspector) {
      throw new NotFoundException('Inspector not found');
    }

    inspection.assignedInspector = inspector;
    return this.toResponse(await this.inspections.save(inspection));
  }

  async complete(
    inspectionId: number,
    inspectorId: number,
    completion: CompleteInspectionDto,
  ) {
    const inspection = await this.findOne(inspectionId);
    if (inspection.assignedInspector?.id !== inspectorId) {
      throw new NotFoundException('Inspection not found');
    }
    if (inspection.status !== InspectionStatus.YetToStart) {
      throw new ConflictException('Only inspections yet to start can be completed');
    }

    const location = await this.locations.findOneBy({ id: completion.locationId });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    inspection.location = location;
    inspection.startedAt = new Date(completion.startedAt);
    inspection.durationMinutes = completion.durationMinutes;
    inspection.passed = completion.passed;
    inspection.comments = completion.comments ?? null;
    inspection.status = InspectionStatus.Completed;

    return this.toResponse(await this.inspections.save(inspection));
  }

  private async findOne(id: number) {
    const inspection = await this.inspections.findOne({
      where: { id },
      relations: { location: true, assignedInspector: true },
    });
    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }
    return inspection;
  }

  private toResponse(inspection: Inspection) {
    return {
      id: inspection.id,
      status: inspection.status,
      createdAt: inspection.createdAt,
      location: inspection.location
        ? { id: inspection.location.id, name: inspection.location.name }
        : null,
      assignedInspector: inspection.assignedInspector
        ? {
            id: inspection.assignedInspector.id,
            name: inspection.assignedInspector.name,
            email: inspection.assignedInspector.email,
          }
        : null,
      startedAt: inspection.startedAt,
      durationMinutes: inspection.durationMinutes,
      passed: inspection.passed,
      comments: inspection.comments,
    };
  }
}
