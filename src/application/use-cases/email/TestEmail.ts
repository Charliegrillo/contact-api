import { IEmailService } from '../../../domain/services/IEmailService';
import { IUseCase } from '../../interfaces/IUseCase';

export interface TestEmailDTO {
    type: 'visitor' | 'admin' | 'both';
    email?: string;  // Email de prueba (opcional)
    name?: string;   // Nombre de prueba (opcional)
}

export interface TestEmailResult {
    visitorEmailSent: boolean;
    adminEmailSent: boolean;
    visitorEmailTo: string;
    adminEmailTo: string;
    timestamp: Date;
}

export class TestEmail implements IUseCase<TestEmailDTO, TestEmailResult> {
    constructor(private emailService: IEmailService) {}

    async execute(data: TestEmailDTO): Promise<TestEmailResult> {
        const testEmail = data.email || 'test@example.com';
        const testName = data.name || 'Usuario de Prueba';
        
        console.log(`\n🧪 Iniciando test de emails...`);
        console.log(`   Tipo: ${data.type}`);
        console.log(`   Email: ${testEmail}`);
        console.log(`   Nombre: ${testName}`);
        
        const result: TestEmailResult = {
            visitorEmailSent: false,
            adminEmailSent: false,
            visitorEmailTo: testEmail,
            adminEmailTo: process.env.ADMIN_EMAIL || 'charliegrillo@gmail.com',
            timestamp: new Date()
        };

        // Enviar email al visitante
        if (data.type === 'visitor' || data.type === 'both') {
            try {
                console.log('\n📧 Enviando email de prueba al VISITANTE...');
                await this.emailService.sendBudgetNotification(testName, testEmail);
                result.visitorEmailSent = true;
                console.log(`✅ Email al visitante enviado: ${testEmail}`);
            } catch (error) {
                console.error('❌ Error enviando email al visitante:', error);
            }
        }

        // Enviar email al administrador
        if (data.type === 'admin' || data.type === 'both') {
            try {
                console.log('\n📧 Enviando email de prueba al ADMINISTRADOR...');
                await this.emailService.sendAdminNotification({
                    name: testName,
                    email: testEmail,
                    phone: '+1234567890',
                    message: 'Este es un mensaje de prueba para verificar que el sistema de notificaciones funciona correctamente.',
                    budget: 5000,
                    company: 'Empresa de Prueba',
                    createdAt: new Date()
                });
                result.adminEmailSent = true;
                console.log(`✅ Email al administrador enviado: ${result.adminEmailTo}`);
            } catch (error) {
                console.error('❌ Error enviando email al administrador:', error);
            }
        }

        return result;
    }
}