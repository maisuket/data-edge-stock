import { ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
export declare class PrismaClientExceptionFilter extends BaseExceptionFilter {
    catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost): void;
}
