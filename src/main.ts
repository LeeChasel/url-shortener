import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './libs';
import { ValidationPipe, VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(`api`);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const configSerice = app.get(ConfigService);
  await app.listen(configSerice.get('APP_PORT'));
}
bootstrap();
