import { Test, TestingModule } from '@nestjs/testing';
import { MapsPublicController } from './maps-public.controller';

describe('MapsPublicController', () => {
  let controller: MapsPublicController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MapsPublicController],
    }).compile();

    controller = module.get<MapsPublicController>(MapsPublicController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
