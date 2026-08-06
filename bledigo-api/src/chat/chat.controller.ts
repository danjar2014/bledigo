import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ChatService } from './chat.service';
import { MessageType } from '../common/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

export class CreateConversationDto {
  @IsString() withUserId: string;
  @IsOptional() @IsString() listingId?: string;
  @IsOptional() @IsString() bookingId?: string;
}
export class SendMessageDto {
  @IsString() content: string;
  @IsOptional() @IsEnum(MessageType) type?: MessageType;
}

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/conversations')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  mine(@CurrentUser('id') me: string) {
    return this.chatService.myConversations(me);
  }

  @Post()
  create(@CurrentUser('id') me: string, @Body() dto: CreateConversationDto) {
    return this.chatService.createConversation(me, dto);
  }

  @Get(':id/messages')
  messages(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.chatService.messages(me, id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Envoyer un message (filtre anti-desintermediation actif)' })
  send(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.chatService.send(me, id, dto);
  }
}
