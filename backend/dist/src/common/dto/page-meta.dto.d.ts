import { PageOptionsDto } from './page-options.dto';
export interface PageMetaDtoParameters {
    pageOptionsDto: PageOptionsDto;
    itemCount: number;
}
export declare class PageMetaDto {
    readonly page: number;
    readonly take: number;
    readonly itemCount: number;
    readonly pageCount: number;
    readonly hasPreviousPage: boolean;
    readonly hasNextPage: boolean;
    constructor({ pageOptionsDto, itemCount }: PageMetaDtoParameters);
}
