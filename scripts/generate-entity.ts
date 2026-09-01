import fs from 'fs';
import path from 'path';
import readline from 'readline';

/**
 * Script para generar todos los archivos de una nueva entidad
 * Uso: npm run generate:entity -- Product
 */

// Configuración
const ENTITY_NAME = process.argv[2]; // Ej: Product
const ENTITY_NAME_LOWER = ENTITY_NAME.toLowerCase(); // product
const ENTITY_NAME_PLURAL = `${ENTITY_NAME_LOWER}s`; // products
const ENTITY_NAME_PLURAL_CAPITAL = `${ENTITY_NAME}s`; // Products

// Rutas base
const BASE_PATH = path.join(__dirname, '..', 'src');
const DOMAIN_PATH = path.join(BASE_PATH, 'domain');
const APPLICATION_PATH = path.join(BASE_PATH, 'application');
const INFRASTRUCTURE_PATH = path.join(BASE_PATH, 'infrastructure');

// Verificar que se proporcionó el nombre
if (!ENTITY_NAME) {
    console.error('❌ Debes proporcionar el nombre de la entidad');
    console.log('Uso: npm run generate:entity -- Product');
    process.exit(1);
}

// ============ PLANTILLAS ============

// 1. Entidad
const entityTemplate = (entityName: string) => `
export interface ${entityName} {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Create${entityName}DTO {
    name: string;
    description: string;
}
`;

// 2. Interfaz de Repositorio
const repositoryInterfaceTemplate = (entityName: string) => `
import { ${entityName}, Create${entityName}DTO } from '../entities/${entityName}';

export interface I${entityName}Repository {
    create(data: ${entityName}): Promise<${entityName}>;
    findById(id: string): Promise<${entityName} | null>;
    findAll(): Promise<${entityName}[]>;
    update(id: string, data: Partial<${entityName}>): Promise<${entityName}>;
    delete(id: string): Promise<void>;
    
    // Métodos de caché (opcionales)
    findCached?<T>(key: string): Promise<T | null>;
    saveCached?<T>(key: string, value: T, resource?: string): Promise<void>;
    deleteCachedByPattern?(pattern: string): Promise<void>;
}
`;

// 3. Create Use Case
const createUseCaseTemplate = (entityName: string, entityLower: string) => `
import { ${entityName}, Create${entityName}DTO } from '../../../domain/entities/${entityName}';
import { I${entityName}Repository } from '../../../domain/repositories/I${entityName}Repository';
import { IUseCase } from '../../interfaces/IUseCase';
import { v4 as uuidv4 } from 'uuid';

export class Create${entityName} implements IUseCase<Create${entityName}DTO, ${entityName}> {
    constructor(private repository: I${entityName}Repository) {}

    async execute(data: Create${entityName}DTO): Promise<${entityName}> {
        const entity: ${entityName} = {
            id: uuidv4(),
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const created = await this.repository.create(entity);
        
        // Invalidar caché de lista
        await this.repository.deleteCachedByPattern?.('${entityLower}s:page:1:');
        
        return created;
    }
}
`;

// 4. Get All Use Case
const getAllUseCaseTemplate = (entityName: string, entityLower: string) => `
import { ${entityName} } from '../../../domain/entities/${entityName}';
import { I${entityName}Repository } from '../../../domain/repositories/I${entityName}Repository';
import { IUseCase } from '../../interfaces/IUseCase';

export class Get${entityName}s implements IUseCase<void, ${entityName}[]> {
    constructor(private repository: I${entityName}Repository) {}

    async execute(): Promise<${entityName}[]> {
        const cacheKey = '${entityLower}s:all';
        const cached = await this.repository.findCached?.<${entityName}[]>(cacheKey);
        
        if (cached) {
            return cached;
        }

        const entities = await this.repository.findAll();
        await this.repository.saveCached?.(cacheKey, entities, '${entityLower}s');
        
        return entities;
    }
}
`;

// 5. Get By ID Use Case
const getByIdUseCaseTemplate = (entityName: string, entityLower: string) => `
import { ${entityName} } from '../../../domain/entities/${entityName}';
import { I${entityName}Repository } from '../../../domain/repositories/I${entityName}Repository';
import { IUseCase } from '../../interfaces/IUseCase';

export class Get${entityName}ById implements IUseCase<string, ${entityName} | null> {
    constructor(private repository: I${entityName}Repository) {}

    async execute(id: string): Promise<${entityName} | null> {
        const cacheKey = '${entityLower}s:' + id;
        const cached = await this.repository.findCached?.<${entityName}>(cacheKey);
        
        if (cached) {
            return cached;
        }

        const entity = await this.repository.findById(id);
        
        if (entity) {
            await this.repository.saveCached?.(cacheKey, entity, '${entityLower}s');
        }
        
        return entity;
    }
}
`;

// 6. Update Use Case
const updateUseCaseTemplate = (entityName: string, entityLower: string) => `
import { ${entityName} } from '../../../domain/entities/${entityName}';
import { I${entityName}Repository } from '../../../domain/repositories/I${entityName}Repository';
import { IUseCase } from '../../interfaces/IUseCase';

export class Update${entityName} implements IUseCase<{ id: string; data: Partial<${entityName}> }, ${entityName}> {
    constructor(private repository: I${entityName}Repository) {}

    async execute(input: { id: string; data: Partial<${entityName}> }): Promise<${entityName}> {
        const updated = await this.repository.update(input.id, input.data);
        
        // Invalidar caché
        await this.repository.deleteCachedByPattern?.('${entityLower}s:page:1:');
        await this.repository.deleteCachedByPattern?.('${entityLower}s:' + input.id);
        
        return updated;
    }
}
`;

// 7. Delete Use Case
const deleteUseCaseTemplate = (entityName: string, entityLower: string) => `
import { I${entityName}Repository } from '../../../domain/repositories/I${entityName}Repository';
import { IUseCase } from '../../interfaces/IUseCase';

export class Delete${entityName} implements IUseCase<string, void> {
    constructor(private repository: I${entityName}Repository) {}

    async execute(id: string): Promise<void> {
        await this.repository.delete(id);
        
        // Invalidar caché
        await this.repository.deleteCachedByPattern?.('${entityLower}s:page:1:');
        await this.repository.deleteCachedByPattern?.('${entityLower}s:' + id);
    }
}
`;

// 8. Repositorio Cacheado
const cachedRepositoryTemplate = (entityName: string, entityLower: string) => `
import { ${entityName} } from '../../domain/entities/${entityName}';
import { I${entityName}Repository } from '../../domain/repositories/I${entityName}Repository';
import { HybridCacheManager } from '../cache/HybridCacheManager';
import { TursoClient } from '../database/TursoClient';

export class HybridCached${entityName}Repository implements I${entityName}Repository {
    private cacheManager: HybridCacheManager;
    private client = TursoClient.getInstance();

    constructor() {
        this.cacheManager = HybridCacheManager.getInstance();
    }

    async findCached<T>(key: string): Promise<T | null> {
        return this.cacheManager.get<T>(key, '${entityLower}s');
    }

    async saveCached<T>(key: string, value: T, resource?: string): Promise<void> {
        await this.cacheManager.set(key, value, resource || '${entityLower}s');
    }

    async deleteCachedByPattern(pattern: string): Promise<void> {
        await this.cacheManager.deleteByPattern(pattern);
    }

    async create(data: ${entityName}): Promise<${entityName}> {
        await this.client.execute({
            sql: \`INSERT INTO ${entityLower}s (id, name, description, created_at, updated_at) 
                  VALUES (?, ?, ?, ?, ?)\`,
            args: [data.id, data.name, data.description, data.createdAt.toISOString(), data.updatedAt.toISOString()]
        });
        return data;
    }

    async findById(id: string): Promise<${entityName} | null> {
        const result = await this.client.execute({
            sql: 'SELECT * FROM ${entityLower}s WHERE id = ?',
            args: [id]
        });
        
        if (result.rows.length === 0) return null;
        return this.mapToEntity(result.rows[0]);
    }

    async findAll(): Promise<${entityName}[]> {
        const result = await this.client.execute('SELECT * FROM ${entityLower}s');
        return result.rows.map(row => this.mapToEntity(row));
    }

    async update(id: string, data: Partial<${entityName}>): Promise<${entityName}> {
        const existing = await this.findById(id);
        if (!existing) throw new Error('${entityName} not found');
        
        const updated = { ...existing, ...data, updatedAt: new Date() };
        
        await this.client.execute({
            sql: 'UPDATE ${entityLower}s SET name = ?, description = ?, updated_at = ? WHERE id = ?',
            args: [updated.name, updated.description, updated.updatedAt.toISOString(), id]
        });
        
        return updated;
    }

    async delete(id: string): Promise<void> {
        await this.client.execute({
            sql: 'DELETE FROM ${entityLower}s WHERE id = ?',
            args: [id]
        });
    }

    private mapToEntity(row: any): ${entityName} {
        return {
            id: row.id as string,
            name: row.name as string,
            description: row.description as string,
            createdAt: new Date(row.created_at as string),
            updatedAt: new Date(row.updated_at as string)
        };
    }
}
`;

// 9. Controlador
const controllerTemplate = (entityName: string, entityLower: string) => `
import { Request, Response } from 'express';
import { Create${entityName} } from '../../../application/use-cases/${entityLower}/Create${entityName}';
import { Get${entityName}s } from '../../../application/use-cases/${entityLower}/Get${entityName}s';
import { Get${entityName}ById } from '../../../application/use-cases/${entityLower}/Get${entityName}ById';
import { Update${entityName} } from '../../../application/use-cases/${entityLower}/Update${entityName}';
import { Delete${entityName} } from '../../../application/use-cases/${entityLower}/Delete${entityName}';

export class ${entityName}Controller {
    constructor(
        private create${entityName}UseCase: Create${entityName},
        private get${entityName}sUseCase: Get${entityName}s,
        private get${entityName}ByIdUseCase: Get${entityName}ById,
        private update${entityName}UseCase: Update${entityName},
        private delete${entityName}UseCase: Delete${entityName}
    ) {}

    async create(req: Request, res: Response): Promise<void> {
        try {
            const entity = await this.create${entityName}UseCase.execute(req.body);
            res.status(201).json({ success: true, data: entity });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error creating ${entityLower}' });
        }
    }

    async getAll(req: Request, res: Response): Promise<void> {
        try {
            const entities = await this.get${entityName}sUseCase.execute();
            res.status(200).json({ success: true, data: entities });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error getting ${entityLower}s' });
        }
    }

    async getById(req: Request, res: Response): Promise<void> {
        try {
            const entity = await this.get${entityName}ByIdUseCase.execute(req.params.id);
            if (!entity) {
                res.status(404).json({ success: false, message: '${entityName} not found' });
                return;
            }
            res.status(200).json({ success: true, data: entity });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error getting ${entityLower}' });
        }
    }

    async update(req: Request, res: Response): Promise<void> {
        try {
            const entity = await this.update${entityName}UseCase.execute({
                id: req.params.id,
                data: req.body
            });
            res.status(200).json({ success: true, data: entity });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error updating ${entityLower}' });
        }
    }

    async delete(req: Request, res: Response): Promise<void> {
        try {
            await this.delete${entityName}UseCase.execute(req.params.id);
            res.status(200).json({ success: true, message: '${entityName} deleted' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error deleting ${entityLower}' });
        }
    }
}
`;

// 10. Rutas
const routesTemplate = (entityName: string, entityLower: string) => `
import { Router } from 'express';
import { ${entityName}Controller } from '../controllers/${entityName}Controller';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { Create${entityName} } from '../../../application/use-cases/${entityLower}/Create${entityName}';
import { Get${entityName}s } from '../../../application/use-cases/${entityLower}/Get${entityName}s';
import { Get${entityName}ById } from '../../../application/use-cases/${entityLower}/Get${entityName}ById';
import { Update${entityName} } from '../../../application/use-cases/${entityLower}/Update${entityName}';
import { Delete${entityName} } from '../../../application/use-cases/${entityLower}/Delete${entityName}';
import { HybridCached${entityName}Repository } from '../../repositories/HybridCached${entityName}Repository';

export function create${entityName}Routes(): Router {
    const router = Router();
    
    const repository = new HybridCached${entityName}Repository();
    const createUseCase = new Create${entityName}(repository);
    const getAllUseCase = new Get${entityName}s(repository);
    const getByIdUseCase = new Get${entityName}ById(repository);
    const updateUseCase = new Update${entityName}(repository);
    const deleteUseCase = new Delete${entityName}(repository);
    
    const controller = new ${entityName}Controller(
        createUseCase,
        getAllUseCase,
        getByIdUseCase,
        updateUseCase,
        deleteUseCase
    );
    
    const authMiddleware = new AuthMiddleware();

    router.get(
        '/',
        authMiddleware.authenticate.bind(authMiddleware),
        controller.getAll.bind(controller)
    );

    router.get(
        '/:id',
        authMiddleware.authenticate.bind(authMiddleware),
        controller.getById.bind(controller)
    );

    router.post(
        '/',
        authMiddleware.authenticate.bind(authMiddleware),
        authMiddleware.authorize('admin'),
        controller.create.bind(controller)
    );

    router.patch(
        '/:id',
        authMiddleware.authenticate.bind(authMiddleware),
        authMiddleware.authorize('admin'),
        controller.update.bind(controller)
    );

    router.delete(
        '/:id',
        authMiddleware.authenticate.bind(authMiddleware),
        authMiddleware.authorize('admin'),
        controller.delete.bind(controller)
    );

    return router;
}
`;

// 11. Migración
const migrationTemplate = (entityName: string, entityLower: string) => `
CREATE TABLE IF NOT EXISTS ${entityLower}s (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_${entityLower}s_name ON ${entityLower}s(name);
CREATE INDEX IF NOT EXISTS idx_${entityLower}s_created_at ON ${entityLower}s(created_at DESC);
`;

// ============ FUNCIÓN PARA CREAR ARCHIVOS ============

function createDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 Directorio creado: ${dirPath}`);
    }
}

function createFile(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content.trim() + '\n');
    console.log(`📄 Archivo creado: ${filePath}`);
}

// ============ EJECUCIÓN ============

async function generate(): Promise<void> {
    console.log(`\n🚀 Generando archivos para la entidad: ${ENTITY_NAME}\n`);

    // 1. Domain
    const domainEntitiesPath = path.join(DOMAIN_PATH, 'entities');
    const domainRepositoriesPath = path.join(DOMAIN_PATH, 'repositories');
    
    createDirectory(domainEntitiesPath);
    createDirectory(domainRepositoriesPath);
    
    createFile(
        path.join(domainEntitiesPath, `${ENTITY_NAME}.ts`),
        entityTemplate(ENTITY_NAME)
    );
    
    createFile(
        path.join(domainRepositoriesPath, `I${ENTITY_NAME}Repository.ts`),
        repositoryInterfaceTemplate(ENTITY_NAME)
    );

    // 2. Application
    const applicationUseCasesPath = path.join(APPLICATION_PATH, 'use-cases', ENTITY_NAME_LOWER);
    createDirectory(applicationUseCasesPath);
    
    createFile(
        path.join(applicationUseCasesPath, `Create${ENTITY_NAME}.ts`),
        createUseCaseTemplate(ENTITY_NAME, ENTITY_NAME_LOWER)
    );
    
    createFile(
        path.join(applicationUseCasesPath, `Get${ENTITY_NAME}s.ts`),
        getAllUseCaseTemplate(ENTITY_NAME, ENTITY_NAME_LOWER)
    );
    
    createFile(
        path.join(applicationUseCasesPath, `Get${ENTITY_NAME}ById.ts`),
        getByIdUseCaseTemplate(ENTITY_NAME, ENTITY_NAME_LOWER)
    );
    
    createFile(
        path.join(applicationUseCasesPath, `Update${ENTITY_NAME}.ts`),
        updateUseCaseTemplate(ENTITY_NAME, ENTITY_NAME_LOWER)
    );
    
    createFile(
        path.join(applicationUseCasesPath, `Delete${ENTITY_NAME}.ts`),
        deleteUseCaseTemplate(ENTITY_NAME, ENTITY_NAME_LOWER)
    );

    // 3. Infrastructure
    const infrastructureRepositoriesPath = path.join(INFRASTRUCTURE_PATH, 'repositories');
    const infrastructureControllersPath = path.join(INFRASTRUCTURE_PATH, 'web', 'controllers');
    const infrastructureRoutesPath = path.join(INFRASTRUCTURE_PATH, 'web', 'routes');
    const infrastructureMigrationsPath = path.join(INFRASTRUCTURE_PATH, 'database', 'migrations');
    
    createDirectory(infrastructureRepositoriesPath);
    createDirectory(infrastructureControllersPath);
    createDirectory(infrastructureRoutesPath);
    createDirectory(infrastructureMigrationsPath);
    
    createFile(
        path.join(infrastructureRepositoriesPath, `HybridCached${ENTITY_NAME}Repository.ts`),
        cachedRepositoryTemplate(ENTITY_NAME, ENTITY_NAME_LOWER)
    );
    
    createFile(
        path.join(infrastructureControllersPath, `${ENTITY_NAME}Controller.ts`),
        controllerTemplate(ENTITY_NAME, ENTITY_NAME_LOWER)
    );
    
    createFile(
        path.join(infrastructureRoutesPath, `${ENTITY_NAME_LOWER}.routes.ts`),
        routesTemplate(ENTITY_NAME, ENTITY_NAME_LOWER)
    );
    
    createFile(
        path.join(infrastructureMigrationsPath, `006_${ENTITY_NAME_LOWER}s.sql`),
        migrationTemplate(ENTITY_NAME, ENTITY_NAME_LOWER)
    );

    console.log(`\n✅ ¡Archivos generados exitosamente para ${ENTITY_NAME}!`);
    console.log('\n📝 Siguientes pasos:');
    console.log(`1. Revisar y personalizar los archivos generados`);
    console.log(`2. Agregar la ruta en server.ts: this.app.use('/api/${ENTITY_NAME_LOWER}s', create${ENTITY_NAME}Routes());`);
    console.log(`3. Ejecutar la migración: npm run migrate`);
    console.log(`4. Actualizar HybridCacheManager si es necesario\n`);
}

generate().catch(console.error);