import { Test, TestingModule } from '@nestjs/testing';
import { ContactsPublicController } from './contacts-public.controller';

describe('ContactsPublicController', () => {
  let controller: ContactsPublicController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactsPublicController],
    }).compile();

    controller = module.get<ContactsPublicController>(ContactsPublicController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
