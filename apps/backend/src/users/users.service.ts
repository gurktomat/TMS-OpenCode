import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, RoleEntity, CompanyEntity } from './entities/user.entity';
import { User } from '@tms-platform/types';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly rolesRepository: Repository<RoleEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companiesRepository: Repository<CompanyEntity>,
  ) {}

  /**
   * Find user by ID with relations
   */
  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id, isActive: true },
      relations: ['role', 'company'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUserToResponse(user);
  }

  /**
   * Find user by email with relations
   */
  async findByEmail(email: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { email, isActive: true },
      relations: ['role', 'company'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUserToResponse(user);
  }

  /**
   * Find all users (admin only)
   */
  async findAll(): Promise<User[]> {
    const users = await this.usersRepository.find({
      where: { isActive: true },
      relations: ['role', 'company'],
    });

    return users.map(user => this.mapUserToResponse(user));
  }

  /**
   * Create new user
   */
  async create(userData: Partial<UserEntity>): Promise<User> {
    const user = this.usersRepository.create(userData);
    const savedUser = await this.usersRepository.save(user);
    
    return this.findById(savedUser.id);
  }

  /**
   * Update user
   */
  async update(id: string, userData: Partial<UserEntity>): Promise<User> {
    await this.usersRepository.update(id, userData);
    return this.findById(id);
  }

  /**
   * Soft delete user (deactivate)
   */
  async remove(id: string): Promise<void> {
    await this.usersRepository.update(id, { isActive: false });
  }

  /**
   * Map database entity to response object
   */
  private mapUserToResponse(user: UserEntity): User {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      roleId: user.roleId,
      companyId: user.companyId,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: user.role ? {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
        permissions: user.role.permissions,
        createdAt: user.role.createdAt,
        updatedAt: user.role.updatedAt,
      } : undefined,
    };
  }
}