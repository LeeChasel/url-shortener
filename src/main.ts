import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './libs';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.setGlobalPrefix(`api`);
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

  const configSerice = app.get(ConfigService);
  await app.listen(configSerice.get('APP_PORT'));
}

void bootstrap();
