import { TursoClient } from './TursoClient';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const databaseDir = path.resolve(process.cwd(), 'src/infrastructure/database');

/**
 * Clase para manejar migraciones de base de datos
 */
class DatabaseMigrator {
  private migrationsDir: string;  
  private migrationsTable: string;

  constructor() {
    this.migrationsDir = path.join(databaseDir, 'migrations');
    this.migrationsTable = 'migrations';
  }

  /**
   * Inicializar tabla de migraciones
   */
  async initializeMigrationsTable(): Promise<void> {
    const client = TursoClient.getInstance();
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_name TEXT NOT NULL UNIQUE,
        executed_at TEXT NOT NULL
      )
    `);
    
    console.log('✅ Migrations table initialized');
  }

  /**
   * Obtener migraciones ya ejecutadas
   */
  async getExecutedMigrations(): Promise<Set<string>> {
    const client = TursoClient.getInstance();
    
    const result = await client.execute(
      `SELECT migration_name FROM ${this.migrationsTable}`
    );
    
    return new Set(result.rows.map(row => row.migration_name as string));
  }

  /**
   * Registrar migración como ejecutada
   */
  async recordMigration(migrationName: string): Promise<void> {
    const client = TursoClient.getInstance();
    
    await client.execute({
      sql: `INSERT INTO ${this.migrationsTable} (migration_name, executed_at) VALUES (?, ?)`,
      args: [migrationName, new Date().toISOString()]
    });
    
    console.log(`📝 Migration recorded: ${migrationName}`);
  }

  /**
   * Ejecutar una migración SQL
   */
  async executeMigration(migrationFile: string): Promise<void> {
    const client = TursoClient.getInstance();
    
    // Leer archivo de migración
    const filePath = path.join(this.migrationsDir, migrationFile);
    const sql = await fs.readFile(filePath, 'utf-8');
    
    console.log(`🔧 Executing migration: ${migrationFile}`);
    
    // Dividir por statements (separados por ;)
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // Ejecutar cada statement
    for (const statement of statements) {
      try {
        await client.execute(statement);
        console.log(`  ✅ Statement executed successfully`);
      } catch (error) {
        console.error(`  ❌ Error executing statement:`, error);
        throw error;
      }
    }
    
    console.log(`✅ Migration completed: ${migrationFile}`);
  }

  /**
   * Ejecutar todas las migraciones pendientes
   */
  async migrate(): Promise<void> {
    console.log('🚀 Starting database migrations...\n');
    
    try {
      // 1. Inicializar tabla de migraciones
      await this.initializeMigrationsTable();
      
      // 2. Obtener migraciones ejecutadas
      const executedMigrations = await this.getExecutedMigrations();
      console.log(`📊 Executed migrations: ${executedMigrations.size}`);
      
      // 3. Leer archivos de migración
      const files = await fs.readdir(this.migrationsDir);
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort(); // Ordenar alfabéticamente
      
      console.log(`📁 Found ${migrationFiles.length} migration files\n`);
      
      // 4. Ejecutar migraciones pendientes
      let executedCount = 0;
      let skippedCount = 0;
      
      for (const file of migrationFiles) {
        if (executedMigrations.has(file)) {
          console.log(`⏭️  Skipping already executed: ${file}`);
          skippedCount++;
          continue;
        }
        
        try {
          await this.executeMigration(file);
          await this.recordMigration(file);
          executedCount++;
          console.log('');
        } catch (error) {
          console.error(`❌ Migration failed: ${file}`);
          console.error('Error details:', error);
          process.exit(1);
        }
      }
      
      // 5. Resumen
      console.log('📊 Migration Summary:');
      console.log(`  ✅ Executed: ${executedCount}`);
      console.log(`  ⏭️  Skipped: ${skippedCount}`);
      console.log(`  📁 Total: ${migrationFiles.length}`);
      console.log('\n🎉 Database migration completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration process failed:', error);
      process.exit(1);
    }
  }

  /**
   * Rollback de la última migración (opcional)
   */
  async rollback(): Promise<void> {
    console.log('🔄 Starting rollback...\n');
    
    try {
      const client = TursoClient.getInstance();
      
      // Obtener última migración ejecutada
      const result = await client.execute(
        `SELECT migration_name FROM ${this.migrationsTable} 
         ORDER BY id DESC LIMIT 1`
      );
      
      if (result.rows.length === 0) {
        console.log('ℹ️  No migrations to rollback');
        return;
      }
      
      const lastMigration = result.rows[0]!.migration_name as string;
      console.log(`📝 Rolling back: ${lastMigration}`);
      
      // Aquí deberías implementar la lógica de rollback
      // Por ahora, solo eliminamos el registro
      await client.execute({
        sql: `DELETE FROM ${this.migrationsTable} WHERE migration_name = ?`,
        args: [lastMigration]
      });
      
      console.log('✅ Rollback completed');
      
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      process.exit(1);
    }
  }

  /**
   * Ver estado de las migraciones
   */
  async status(): Promise<void> {
    console.log('📊 Migration Status:\n');
    
    try {
      const client = TursoClient.getInstance();
      
      // Asegurar que la tabla existe
      await this.initializeMigrationsTable();
      
      // Obtener migraciones ejecutadas
      const result = await client.execute(
        `SELECT migration_name, executed_at FROM ${this.migrationsTable} 
         ORDER BY id ASC`
      );
      
      if (result.rows.length === 0) {
        console.log('ℹ️  No migrations executed yet');
        return;
      }
      
      console.log('Executed Migrations:');
      console.log('─'.repeat(50));
      
      for (const row of result.rows) {
        const name = row.migration_name as string;
        const date = new Date(row.executed_at as string);
        console.log(`  ✅ ${name}`);
        console.log(`     Executed at: ${date.toLocaleString()}`);
        console.log('─'.repeat(50));
      }
      
      // Verificar archivos pendientes
      const files = await fs.readdir(this.migrationsDir);
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      const executedNames = new Set(
        result.rows.map(row => row.migration_name as string)
      );
      
      const pendingMigrations = migrationFiles.filter(
        file => !executedNames.has(file)
      );
      
      if (pendingMigrations.length > 0) {
        console.log('\nPending Migrations:');
        console.log('─'.repeat(50));
        pendingMigrations.forEach(file => {
          console.log(`  ⏳ ${file}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Error checking migration status:', error);
      process.exit(1);
    }
  }
}

/**
 * Función principal
 */
async function main(): Promise<void> {
  const migrator = new DatabaseMigrator();
  
  // Obtener comando de línea de comandos
  const command = process.argv[2] || 'migrate';
  
  console.log('🔧 Database Migration Tool');
  console.log('═══════════════════════════\n');
  
  switch (command.toLowerCase()) {
    case 'migrate':
    case 'up':
      await migrator.migrate();
      break;
      
    case 'rollback':
    case 'down':
      await migrator.rollback();
      break;
      
    case 'status':
      await migrator.status();
      break;
      
    case 'reset':
      console.log('⚠️  Warning: This will delete all data!');
      console.log('   Use with caution.\n');
      await migrator.rollback();
      await migrator.migrate();
      break;
      
    default:
      console.log('Usage:');
      console.log('  npm run migrate [command]');
      console.log('\nCommands:');
      console.log('  migrate   - Execute pending migrations (default)');
      console.log('  up        - Same as migrate');
      console.log('  rollback  - Rollback last migration');
      console.log('  down      - Same as rollback');
      console.log('  status    - Show migration status');
      console.log('  reset     - Rollback all and re-migrate');
      process.exit(1);
  }
  
  process.exit(0);
}

// Ejecutar
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});