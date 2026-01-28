import { Headers } from '@nestjs/common';

export const ActiveLang = () => Headers('x-accept-language');
