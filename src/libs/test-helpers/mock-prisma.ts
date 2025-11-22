import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaService } from '../modules/prisma/prisma.service';

export type MockPrismaService = DeepMockProxy<PrismaService>;

export const createMockPrismaService = () => mockDeep<PrismaService>();
