import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Unit } from '../enums/unit.enum';
import { Type } from 'class-transformer';

class SpecificationDto {
  @ApiProperty({ example: 'Cor' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Azul' })
  @IsString()
  value: string;
}

class AttachmentDto {
  @ApiProperty()
  @IsString()
  fileName: string;

  @ApiProperty()
  @IsString()
  filePath: string;

  @ApiProperty()
  @IsString()
  fileType: string;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Parafusadeira 12V' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Ferramentas' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'PAR-001', description: 'Código único interno' })
  @IsString()
  @IsNotEmpty()
  internalCode: string;

  @ApiProperty({ example: '7890000000000', description: 'EAN/GTIN' })
  @IsString()
  @IsNotEmpty()
  barcode: string;

  @ApiProperty({ enum: Unit, example: Unit.UN })
  @IsEnum(Unit)
  unit: Unit;

  @ApiProperty({ example: 150.0 })
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiPropertyOptional({ example: 299.9 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  currentStock: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(0)
  minStock: number;

  @ApiPropertyOptional({ example: 'Corredor 3, Prateleira B' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ type: [SpecificationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecificationDto)
  specifications?: SpecificationDto[];

  @ApiPropertyOptional({ type: [AttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
