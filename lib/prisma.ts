// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// declare const global: NodeJS.Global & {
 declare const global: any & {
  prisma?: PrismaClient;
};

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default prisma;