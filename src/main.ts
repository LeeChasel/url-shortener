import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './libs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configSerice = app.get(ConfigService);
  await app.listen(configSerice.get('APP_PORT'));
}
bootstrap();
