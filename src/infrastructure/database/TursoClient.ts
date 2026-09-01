import { createClient, Client } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Cliente singleton para la base de datos Turso
 * Implementa el patrón Singleton para mantener una única conexión
 */
export class TursoClient {
  private static instance: Client;
  private static isInitialized: boolean = false;

  /**
   * Constructor privado para prevenir instanciación directa
   */
  private constructor() {
    // Constructor privado para patrón Singleton
  }

  /**
   * Obtener la instancia del cliente Turso
   * @returns Client - Cliente de base de datos Turso
   * @throws Error si faltan las credenciales de configuración
   */
  public static getInstance(): Client {
    if (!TursoClient.instance) {
      const url = process.env.TURSO_DATABASE_URL;
      const authToken = process.env.TURSO_AUTH_TOKEN;

      if (!url || !authToken) {
        throw new Error(
          'Missing Turso database configuration. ' +
          'Please check your .env file and ensure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set.'
        );
      }

      TursoClient.instance = createClient({
        url: url,
        authToken: authToken
      });

      console.log('✅ Turso client created successfully');
    }
    
    return TursoClient.instance;
  }

  /**
   * Ejecutar statements SQL individuales
   */
  private static async executeStatements(statements: string[]): Promise<void> {
    const client = TursoClient.getInstance();
    
    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement.length > 0) {
        try {
          await client.execute(trimmedStatement);
        } catch (error) {
          console.error(`❌ Error executing statement: ${trimmedStatement.substring(0, 100)}...`);
          throw error;
        }
      }
    }
  }

  /**
   * Inicializar la base de datos con las tablas necesarias
   * Este método es idempotente y puede ser llamado múltiples veces
   */
  public static async initialize(): Promise<void> {
    if (TursoClient.isInitialized) {
      console.log('ℹ️  Database already initialized');
      return;
    }

    const client = TursoClient.getInstance();
    
    try {
      // Crear tabla contacts
      await client.execute(`
        CREATE TABLE IF NOT EXISTS contacts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          phone TEXT NOT NULL,
          message TEXT NOT NULL,
          budget REAL NOT NULL,
          company TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      console.log('✅ Table "contacts" created');

      // Crear tabla users
      await client.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      console.log('✅ Table "users" created');

      // Crear tabla notifications
      await client.execute(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          contact_id TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL,
          is_read INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          read_at TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Table "notifications" created');

      // Crear tabla webhook_subscriptions
      await client.execute(`
        CREATE TABLE IF NOT EXISTS webhook_subscriptions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          endpoint TEXT NOT NULL,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          user_agent TEXT,
          device_type TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          last_used_at TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Table "webhook_subscriptions" created');

      // Crear tabla migrations
      await client.execute(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          migration_name TEXT NOT NULL UNIQUE,
          executed_at TEXT NOT NULL
        )
      `);
      console.log('✅ Table "migrations" created');

      // Crear índices
      const indexStatements = [
        'CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email)',
        'CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status)',
        'CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC)',
        'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
        'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read)',
        'CREATE INDEX IF NOT EXISTS idx_webhook_user ON webhook_subscriptions(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_webhook_active ON webhook_subscriptions(is_active)'
      ];

      for (const indexStatement of indexStatements) {
        try {
          await client.execute(indexStatement);
        } catch (error) {
          // Ignorar errores de índices duplicados
          console.log(`ℹ️  Index already exists or created: ${indexStatement.substring(0, 50)}...`);
        }
      }
      console.log('✅ Indexes created');

      TursoClient.isInitialized = true;
      console.log('✅ Database initialized successfully');
      
    } catch (error) {
      console.error('❌ Error initializing database:', error);
      throw error;
    }
  }

  /**
   * Verificar la conexión a la base de datos
   * @returns Promise<boolean> - true si la conexión es exitosa
   */
  public static async testConnection(): Promise<boolean> {
    try {
      const client = TursoClient.getInstance();
      const result = await client.execute('SELECT 1 as test');
      return result.rows.length > 0;
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Obtener información de la base de datos
   */
  public static async getDatabaseInfo(): Promise<{
    tables: string[];
  }> {
    const client = TursoClient.getInstance();
    
    try {
      const tablesResult = await client.execute(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      
      const tables = tablesResult.rows.map(row => row.name as string);
      
      return { tables };
    } catch (error) {
      console.error('❌ Error getting database info:', error);
      return { tables: [] };
    }
  }

  /**
   * Limpiar todos los datos de la base de datos (¡usar con precaución!)
   */
  public static async clearAllData(): Promise<void> {
    const client = TursoClient.getInstance();
    
    console.warn('⚠️  WARNING: This will delete ALL data from the database!');
    
    try {
      await client.execute('DELETE FROM notifications');
      await client.execute('DELETE FROM webhook_subscriptions');
      await client.execute('DELETE FROM contacts');
      await client.execute('DELETE FROM users');
      await client.execute('DELETE FROM migrations');
      
      console.log('✅ All data cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing data:', error);
      throw error;
    }
  }

  /**
   * Cerrar la conexión a la base de datos
   */
  public static async closeConnection(): Promise<void> {
    if (TursoClient.instance) {
      TursoClient.instance = null as any;
      TursoClient.isInitialized = false;
      console.log('✅ Database connection closed');
    }
  }

  /**
   * Ejecutar una consulta con medición de tiempo
   */
  public static async executeWithTiming(sql: string, args?: any[]): Promise<{
    result: any;
    executionTime: number;
  }> {
    const client = TursoClient.getInstance();
    const startTime = Date.now();
    
    try {
      const result = await client.execute({
        sql,
        args
      });
      
      const executionTime = Date.now() - startTime;
      
      return { result, executionTime };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ Query failed after ${executionTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Ejecutar una transacción
   */
  public static async executeTransaction(
    queries: Array<{ sql: string; args?: any[] }>
  ): Promise<void> {
    const client = TursoClient.getInstance();
    
    try {
      await client.execute('BEGIN TRANSACTION');
      
      for (const query of queries) {
        await client.execute({
          sql: query.sql,
          args: query.args
        });
      }
      
      await client.execute('COMMIT');
      console.log('✅ Transaction completed successfully');
    } catch (error) {
      await client.execute('ROLLBACK');
      console.error('❌ Transaction failed, rolled back:', error);
      throw error;
    }
  }
}

export default TursoClient;