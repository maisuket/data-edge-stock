// Chaves e valores alinham com o enum Role definido no schema.prisma.
// Após rodar `prisma generate`, este arquivo pode ser substituído por:
// export { Role } from '@prisma/client';
export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}
