import { Request, Response } from 'express';
import { TestEmail } from '../../../application/use-cases/email/TestEmail';

export class TestController {
    constructor(
        private testEmailUseCase: TestEmail
    ) {}

    /**
     * Endpoint para probar envío de emails
     * GET /api/test/email?type=both&email=test@example.com
     */
    async testEmail(req: Request, res: Response): Promise<void> {
        try {
            const type = (req.query.type as string) || 'both';
            const email = req.query.email as string;
            const name = req.query.name as string;
            
            // Validar tipo
            const validTypes = ['visitor', 'admin', 'both'];
            if (!validTypes.includes(type)) {
                res.status(400).json({
                    success: false,
                    message: 'Tipo inválido. Usar: visitor, admin, o both',
                    validTypes
                });
                return;
            }

            console.log(`\n📧 Test de email solicitado:`);
            console.log(`   Tipo: ${type}`);
            console.log(`   Email: ${email || 'test@example.com'}`);
            console.log(`   Nombre: ${name || 'Usuario de Prueba'}`);

            // Ejecutar test
            const result = await this.testEmailUseCase.execute({
                type: type as 'visitor' | 'admin' | 'both',
                email: email,
                name: name
            });

            res.status(200).json({
                success: true,
                message: 'Test de email completado',
                data: result
            });
        } catch (error) {
            console.error('Error en test de email:', error);
            res.status(500).json({
                success: false,
                message: 'Error en test de email',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Endpoint de health check
     * GET /api/test/health
     */
    async healthCheck(req: Request, res: Response): Promise<void> {
        res.status(200).json({
            success: true,
            message: 'Test API funcionando',
            timestamp: new Date().toISOString(),
            endpoints: [
                '/api/test/email?type=visitor',
                '/api/test/email?type=admin',
                '/api/test/email?type=both',
                '/api/test/email?type=both&email=tu-email@test.com'
            ]
        });
    }
}