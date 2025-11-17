import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CleanUpUrlsTask } from './tasks';
import { UrlModule } from 'src/url';

@Module({
  imports: [ScheduleModule.forRoot(), UrlModule],
  providers: [CleanUpUrlsTask],
  exports: [
    // For manual triggering from other modules if needed
    CleanUpUrlsTask,
  ],
})
export class SchedulerModule {}
