import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { castQueryParams } from '../common/helpers/helpers';
import { UserInputModel } from './dto/input-models/user-input-model';
import { ValidateObjectIdTypePipe } from '../common/pipes/validate-object-id-type.pipe';
import { AuthGuard } from '@nestjs/passport';
import { UsersQueryRepository } from './providers/users.query.repository';
import {
  CreateNewUserCommand,
  CreateNewUserUseCase,
} from './providers/use-cases/create-new-user-use-case';
import { DeleteUserCommand } from './providers/use-cases/delete-user-use-case';
import { CommandBus } from '@nestjs/cqrs';
import { UsersService } from './providers/users.service';
import { UsersSqlRepository } from './providers/users.sql.repository';

@UseGuards(AuthGuard('basic'))
@Controller('users')
export class UsersController {
  constructor(
    private commandBus: CommandBus,
    private userService: UsersService,
    private createNewUserUseCase: CreateNewUserUseCase,
    private usersQueryRepository: UsersQueryRepository,
    private usersSqlRepository: UsersSqlRepository,
  ) {}

  @Get()
  async getUsers(
    @Query('searchLoginTerm') searchLoginTerm: string | null = null,
    @Query('searchEmailTerm') searchEmailTerm: string | null = null,
    @Query() query,
  ) {
    const paginatorParams = castQueryParams(query);
    return await this.usersQueryRepository.findUsers(
      paginatorParams,
      searchLoginTerm,
      searchEmailTerm,
    );
  }

  @Post()
  async createUser(@Body() userInputDto: UserInputModel) {
    const userId = await this.commandBus.execute(
      new CreateNewUserCommand(userInputDto),
    );
    return this.usersQueryRepository.getUserById(userId);
  }

  @Delete(':userId')
  @HttpCode(204)
  async deleteBlog(@Param('userId', ValidateObjectIdTypePipe) userId: string) {
    if (!(await this.usersQueryRepository.checkUserId(userId))) {
      throw new NotFoundException('Invalid blogId');
    }
    const result = await this.commandBus.execute(new DeleteUserCommand(userId));
    if (!result) {
      throw new InternalServerErrorException('Blog not deleted');
    }
    return;
  }
}
