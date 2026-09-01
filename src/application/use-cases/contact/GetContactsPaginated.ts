import { Contact } from '../../../domain/entities/Contact';
import { IContactRepository } from '../../../domain/repositories/IContactRepository';
import { IUseCase } from '../../interfaces/IUseCase';

export interface PaginationParams {
    page: number;
    limit: number;
}

export interface PaginatedResult {
    data: Contact[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        cached: boolean;
    };
}

export class GetContactsPaginated implements IUseCase<PaginationParams, PaginatedResult> {
    constructor(
        private contactRepository: IContactRepository
    ) {}

    async execute(params: PaginationParams): Promise<PaginatedResult> {
        const { page, limit } = params;
        
        // El repositorio decide si cachear o no
        if (page === 1) {
            return this.getPage1WithCache(limit);
        }
        
        return this.getPageDirectFromBD(page, limit);
    }

    private async getPage1WithCache(limit: number): Promise<PaginatedResult> {
        const cacheKey = `contacts:page:1:limit:${limit}`;
        
        console.log(`\n🔍 [PÁGINA 1] Buscando en caché: ${cacheKey}`);
        
        // ✅ CORRECTO: Especificar el tipo explícitamente
        const cached = await this.contactRepository.findCached?.<PaginatedResult>(cacheKey);
        
        if (cached) {
            console.log('✅ Página 1 servida desde caché');
            return cached;
        }

        console.log('🔄 Página 1 no está en caché, consultando BD...');
        const result = await this.getPageDirectFromBD(1, limit);
        
        // ✅ Cachear página 1 con tipo correcto
        await this.contactRepository.saveCached?.<PaginatedResult>(cacheKey, result, 'contacts');
        console.log('💾 Página 1 cacheada');
        
        return result;
    }

    private async getPageDirectFromBD(page: number, limit: number): Promise<PaginatedResult> {
        console.log(`\n🔄 [PÁGINA ${page}] Consultando BD directamente...`);
        
        const allContacts = await this.contactRepository.findAll();
        
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedData = allContacts.slice(startIndex, endIndex);
        
        return {
            data: paginatedData,
            pagination: {
                page,
                limit,
                total: allContacts.length,
                totalPages: Math.ceil(allContacts.length / limit),
                cached: page === 1
            }
        };
    }
}