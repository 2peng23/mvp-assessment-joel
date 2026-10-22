const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
} = require('@nestjs/common');
const {
  InspectionStatus,
} = require('../dist/inspections/inspection.entity');
const {
  InspectionsService,
} = require('../dist/inspections/inspections.service');
const { UserRole } = require('../dist/users/user.entity');

function createService(overrides = {}) {
  const repositories = {
    inspections: {
      create: (value) => value,
      find: async () => [],
      findOne: async () => null,
      save: async (value) => value,
    },
    locations: { findOneBy: async () => null },
    users: { findOneBy: async () => null },
    ...overrides,
  };
  return { service: new InspectionsService(
    repositories.inspections,
    repositories.locations,
    repositories.users,
  ), repositories };
}

test('inspector listing is scoped to the authenticated inspector', async () => {
  let query;
  const { service } = createService({
    inspections: {
      find: async (options) => {
        query = options;
        return [];
      },
    },
  });

  await service.findForUser({ id: 7, role: UserRole.Inspector });

  assert.deepEqual(query.where, { assignedInspector: { id: 7 } });
});

test('manager can list all inspections', async () => {
  let query;
  const { service } = createService({
    inspections: {
      find: async (options) => {
        query = options;
        return [];
      },
    },
  });

  await service.findForUser({ id: 1, role: UserRole.Manager });

  assert.deepEqual(query.where, {});
});

test('manager creates an inspection with an existing Inspector assigned', async () => {
  const inspector = {
    id: 7,
    email: 'inspector@example.com',
    name: 'Inspector',
    role: UserRole.Inspector,
  };
  let saved;
  const { service } = createService({
    inspections: {
      create: (value) => value,
      save: async (value) => {
        saved = value;
        return { id: 4, ...value };
      },
    },
    users: { findOneBy: async () => inspector },
  });

  const result = await service.create(7);

  assert.equal(saved.assignedInspector, inspector);
  assert.equal(result.assignedInspector.id, 7);
  assert.equal(result.status, InspectionStatus.YetToStart);
});

test('inspection creation rejects an invalid Inspector ID without saving', async () => {
  let saved = false;
  let lookedUpUser = false;
  const { service } = createService({
    inspections: {
      create: (value) => value,
      save: async (value) => {
        saved = true;
        return value;
      },
    },
    users: {
      findOneBy: async () => {
        lookedUpUser = true;
        return null;
      },
    },
  });

  await assert.rejects(
    service.create(undefined),
    (error) => error instanceof BadRequestException,
  );
  assert.equal(lookedUpUser, false);
  assert.equal(saved, false);
});

test('inspection creation rejects a missing or non-Inspector user', async () => {
  let saved = false;
  const { service } = createService({
    inspections: {
      create: (value) => value,
      save: async (value) => {
        saved = true;
        return value;
      },
    },
    users: { findOneBy: async () => null },
  });

  await assert.rejects(
    service.create(7),
    (error) => error instanceof NotFoundException,
  );
  assert.equal(saved, false);
});

test('manager assignment accepts only an existing Inspector', async () => {
  const inspection = {
    id: 4,
    status: InspectionStatus.YetToStart,
    assignedInspector: null,
    location: null,
  };
  const inspector = {
    id: 7,
    email: 'inspector@example.com',
    name: 'Inspector',
    role: UserRole.Inspector,
  };
  let saved;
  const { service } = createService({
    inspections: {
      findOne: async () => inspection,
      save: async (value) => {
        saved = value;
        return value;
      },
    },
    users: { findOneBy: async () => inspector },
  });

  const result = await service.assign(4, 7);

  assert.equal(saved.assignedInspector, inspector);
  assert.equal(result.assignedInspector.id, 7);
});

test('an Inspector cannot complete another Inspector’s inspection', async () => {
  let saved = false;
  let lookedUpLocation = false;
  const { service } = createService({
    inspections: {
      findOne: async () => ({
        id: 4,
        status: InspectionStatus.YetToStart,
        assignedInspector: { id: 8 },
        location: null,
      }),
      save: async () => {
        saved = true;
      },
    },
    locations: {
      findOneBy: async () => {
        lookedUpLocation = true;
      },
    },
  });

  await assert.rejects(
    service.complete(4, 7, {
      locationId: 2,
      startedAt: '2026-10-22T01:00:00.000Z',
      durationMinutes: 30,
      passed: true,
    }),
    (error) => error instanceof NotFoundException,
  );
  assert.equal(lookedUpLocation, false);
  assert.equal(saved, false);
});

test('completion records the submitted fields and allows a Fail result', async () => {
  const inspection = {
    id: 4,
    status: InspectionStatus.YetToStart,
    assignedInspector: { id: 7 },
    location: null,
  };
  const location = { id: 2, name: 'Workshop' };
  const { service } = createService({
    inspections: { findOne: async () => inspection, save: async (value) => value },
    locations: { findOneBy: async () => location },
  });
  const startedAt = '2026-10-22T01:00:00.000Z';

  const result = await service.complete(4, 7, {
    locationId: 2,
    startedAt,
    durationMinutes: 45,
    passed: false,
    comments: 'Guard rail requires repair',
  });

  assert.equal(result.status, InspectionStatus.Completed);
  assert.equal(result.location.name, 'Workshop');
  assert.equal(new Date(result.startedAt).toISOString(), startedAt);
  assert.equal(result.durationMinutes, 45);
  assert.equal(result.passed, false);
  assert.equal(result.comments, 'Guard rail requires repair');
});

test('completed inspections cannot be reassigned', async () => {
  const { service } = createService({
    inspections: {
      findOne: async () => ({
        id: 4,
        status: InspectionStatus.Completed,
        assignedInspector: { id: 7 },
        location: null,
      }),
    },
  });

  await assert.rejects(
    service.assign(4, 8),
    (error) => error instanceof ConflictException,
  );
});
