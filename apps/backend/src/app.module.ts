import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { CarriersModule } from './carriers/carriers.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { TrackingModule } from './tracking/tracking.module';
import { GlobalValidationPipe } from './common/pipes/validation.pipe';
import { SecurityInterceptor } from './common/interceptors/security.interceptor';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { CompanyGuard } from './auth/guards/company.guard';
import { APP_PIPE, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { 
  UserEntity, 
  RoleEntity, 
  CompanyEntity 
} from './users/entities/user.entity';
import { 
  ShipmentEntity, 
  LocationEntity, 
  AuditLogEntity 
} from './shipments/entities';
import { 
  CarrierEntity, 
  CarrierLaneEntity, 
  LoadTenderEntity 
} from './carriers/entities';
import { 
  DriverEntity, 
  DispatchAssignmentEntity 
} from './dispatch/entities';
import { 
  TrackingPingEntity, 
  ShipmentEventEntity, 
  PublicShareTokenEntity 
} from './tracking/entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [
          UserEntity,
          RoleEntity,
          CompanyEntity,
          ShipmentEntity,
          LocationEntity,
          AuditLogEntity,
          CarrierEntity,
          CarrierLaneEntity,
          LoadTenderEntity,
          DriverEntity,
          DispatchAssignmentEntity,
          TrackingPingEntity,
          ShipmentEventEntity,
          PublicShareTokenEntity,
        ],
        synchronize: configService.get<string>('NODE_ENV') === 'development',
        logging: configService.get<string>('NODE_ENV') === 'development',
        ssl: configService.get<boolean>('DB_SSL', false),
        extra: {
          max: configService.get<number>('DB_POOL_MAX', 10),
          min: configService.get<number>('DB_POOL_MIN', 2),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    AuthModule,
    UsersModule,
    ShipmentsModule,
    CarriersModule,
    DispatchModule,
    TrackingModule,
  ],
  providers: [
    // Global validation pipe
    {
      provide: APP_PIPE,
      useClass: GlobalValidationPipe,
    },
    // Global authentication guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global roles guard
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Global permissions guard
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    // Global company guard (for multi-tenancy)
    {
      provide: APP_GUARD,
      useClass: CompanyGuard,
    },
    // Global security interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: SecurityInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: any) {
    // Configure global middleware here if needed
  }
}