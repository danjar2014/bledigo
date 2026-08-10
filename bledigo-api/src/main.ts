import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS
  // Render fournit l hote sans protocole quand la variable vient d un autre
  // service : on le complete en https. Plusieurs origines peuvent etre
  // separees par des virgules.
  const origins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .map((o) => (/^https?:\/\//i.test(o) ? o : `https://${o}`))
    .map((o) => o.replace(/\/+$/, ''));

  app.enableCors({ origin: origins, credentials: true });

  // Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle('BlediGo API')
    .setDescription('API de la plateforme BlediGo - Location de logements en Tunisie')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  Logger.log(`BlediGo API sur http://localhost:${port}`, 'Bootstrap');
  Logger.log(`Swagger sur http://localhost:${port}/api/docs`, 'Bootstrap');
}
bootstrap();
