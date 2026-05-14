import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Prisma } from '@prisma/client';

@Injectable()
export class DecimalInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.transform(data)));
  }

  private transform(data: any, seen = new WeakSet()): any {
    // Retorna rapidamente se for primitivo ou nulo
    if (data === null || typeof data !== 'object') return data;

    // Se for o Decimal do Prisma, faz a conversão direta para Number
    if (data instanceof Prisma.Decimal) return data.toNumber();

    // Pula datas
    if (data instanceof Date) return data;

    // Previne loops infinitos em caso de relacionamentos circulares no banco
    if (seen.has(data)) return data;
    seen.add(data);

    if (Array.isArray(data)) {
      return data.map((item) => this.transform(item, seen));
    }

    // Percorre as propriedades do objeto mantendo a instância original (vital para o ClassSerializer agir depois)
    for (const key of Object.keys(data)) {
      data[key] = this.transform(data[key], seen);
    }

    return data;
  }
}
