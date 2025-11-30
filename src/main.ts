import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './libs';
import { RequestMethod, ValidationPipe, VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.setBaseViewsDir(join(__dirname, '..', 'src', 'views'));
  app.setViewEngine('hbs');

  app.setGlobalPrefix(`api`, {
    exclude: [
      {
        method: RequestMethod.GET,
        path: ':shortCode',
      },
    ],
  });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  app.useLogger(app.get(Logger));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('URL Shortener API')
    .setDescription('A URL shortener service API')
    .setVersion('1.0')
    .addTag('urls', 'URL shortening operations')
    .addTag('redirect', 'URL redirect operations')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  const configSerice = app.get(ConfigService);
  await app.listen(configSerice.get('APP_PORT'));
}

void bootstrap();
