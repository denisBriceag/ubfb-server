import { DataSource } from 'typeorm';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: path.join(process.cwd(), '.env.development') });

// ─── Entity imports ──────────────────────────────────────────────────────────
// We import from the compiled JS or use ts-node to run directly.
// All imports use relative paths from this file's location.

async function bootstrap() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '1',
    database: process.env.DB_NAME || 'ubfb_db',
    entities: [path.join(__dirname, '../../**/*.entity.{ts,js}')],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('DataSource initialized');

  try {
    await seed(dataSource);
    console.log('Seeding complete!');
  } finally {
    await dataSource.destroy();
  }
}

async function seed(ds: DataSource) {
  // ─── 1. Languages ──────────────────────────────────────────────────────────
  const langRepo = ds.getRepository('languages');
  const langs = [
    { code: 'ru', name: 'Русский' },
    { code: 'ro', name: 'Română' },
    { code: 'en', name: 'English' },
  ];
  for (const l of langs) {
    const exists = await langRepo.findOne({ where: { code: l.code } });
    if (!exists) {
      await langRepo.save(langRepo.create(l));
      console.log(`Language created: ${l.code}`);
    }
  }

  // ─── 2. Volume Units ───────────────────────────────────────────────────────
  const vuRepo = ds.getRepository('volume_units');
  const vuTransRepo = ds.getRepository('volume_unit_translations');

  const volumeUnits = [
    { code: 'l',  ru: 'л',    ro: 'l',   en: 'l'  },
    { code: 'ml', ru: 'мл',   ro: 'ml',  en: 'ml' },
    { code: 'g',  ru: 'г',    ro: 'g',   en: 'g'  },
    { code: 'kg', ru: 'кг',   ro: 'kg',  en: 'kg' },
    { code: 'cl', ru: 'кл',   ro: 'cl',  en: 'cl' },
    { code: 'oz', ru: 'унц',  ro: 'oz',  en: 'oz' },
  ];

  for (const vu of volumeUnits) {
    let entity = await vuRepo.findOne({ where: { code: vu.code } });
    if (!entity) {
      entity = await vuRepo.save(vuRepo.create({ code: vu.code, isActive: true, updatedBy: null }));
      console.log(`VolumeUnit created: ${vu.code}`);
    }
    for (const [lang, label] of [['ru', vu.ru], ['ro', vu.ro], ['en', vu.en]]) {
      const t = await vuTransRepo.findOne({ where: { volumeUnitId: entity.id, languageCode: lang } });
      if (!t) {
        await vuTransRepo.save(vuTransRepo.create({ volumeUnitId: entity.id, languageCode: lang, label }));
      }
    }
  }

  // ─── 3. Countries ──────────────────────────────────────────────────────────
  const countryRepo = ds.getRepository('countries');
  const countryTransRepo = ds.getRepository('country_translations');

  const countries = [
    { code: 'MD', ru: 'Молдова',        ro: 'Moldova',       en: 'Moldova'        },
    { code: 'FR', ru: 'Франция',        ro: 'Franța',        en: 'France'         },
    { code: 'GB', ru: 'Великобритания', ro: 'Marea Britanie', en: 'United Kingdom' },
    { code: 'IT', ru: 'Италия',         ro: 'Italia',        en: 'Italy'          },
    { code: 'ES', ru: 'Испания',        ro: 'Spania',        en: 'Spain'          },
    { code: 'DE', ru: 'Германия',       ro: 'Germania',      en: 'Germany'        },
    { code: 'US', ru: 'США',            ro: 'SUA',           en: 'USA'            },
    { code: 'MX', ru: 'Мексика',        ro: 'Mexic',         en: 'Mexico'         },
    { code: 'CU', ru: 'Куба',           ro: 'Cuba',          en: 'Cuba'           },
    { code: 'FI', ru: 'Финляндия',      ro: 'Finlanda',      en: 'Finland'        },
    { code: 'AU', ru: 'Австралия',      ro: 'Australia',     en: 'Australia'      },
    { code: 'RU', ru: 'Россия',         ro: 'Rusia',         en: 'Russia'         },
  ];

  for (const c of countries) {
    let entity = await countryRepo.findOne({ where: { code: c.code } });
    if (!entity) {
      entity = await countryRepo.save(countryRepo.create({ code: c.code, isActive: true, updatedBy: null }));
      console.log(`Country created: ${c.code}`);
    }
    for (const [lang, name] of [['ru', c.ru], ['ro', c.ro], ['en', c.en]]) {
      const t = await countryTransRepo.findOne({ where: { countryId: entity.id, languageCode: lang } });
      if (!t) {
        await countryTransRepo.save(countryTransRepo.create({ countryId: entity.id, languageCode: lang, name }));
      }
    }
  }

  // ─── 4. Brands ─────────────────────────────────────────────────────────────
  const brandRepo = ds.getRepository('brands');
  const brandTransRepo = ds.getRepository('brand_translations');

  const brands = [
    { slug: 'johnnie-walker', ru: 'Johnnie Walker',   ro: 'Johnnie Walker',  en: 'Johnnie Walker'  },
    { slug: 'hennessy',       ru: 'Hennessy',          ro: 'Hennessy',        en: 'Hennessy'        },
    { slug: 'glenfiddich',    ru: 'Гленфиддик',        ro: 'Glenfiddich',     en: 'Glenfiddich'     },
    { slug: 'jack-daniels',   ru: 'Джек Дэниелс',      ro: 'Jack Daniel\'s',  en: 'Jack Daniel\'s'  },
    { slug: 'bacardi',        ru: 'Бакарди',           ro: 'Bacardi',         en: 'Bacardi'         },
    { slug: 'moet-chandon',   ru: 'Моэт & Шандон',     ro: 'Moët & Chandon',  en: 'Moët & Chandon'  },
    { slug: 'baileys',        ru: 'Бейлис',            ro: 'Baileys',         en: 'Baileys'         },
    { slug: 'finlandia',      ru: 'Финляндия',         ro: 'Finlandia',       en: 'Finlandia'       },
    { slug: 'patron',         ru: 'Патрон',            ro: 'Patrón',          en: 'Patrón'          },
    { slug: 'borjomi',        ru: 'Боржоми',           ro: 'Borjomi',         en: 'Borjomi'         },
  ];

  for (const b of brands) {
    let entity = await brandRepo.findOne({ where: { slug: b.slug } });
    if (!entity) {
      entity = await brandRepo.save(brandRepo.create({ slug: b.slug, isActive: true, sortOrder: 0, updatedBy: null }));
      console.log(`Brand created: ${b.slug}`);
    }
    for (const [lang, name] of [['ru', b.ru], ['ro', b.ro], ['en', b.en]]) {
      const t = await brandTransRepo.findOne({ where: { brandId: entity.id, languageCode: lang } });
      if (!t) {
        await brandTransRepo.save(brandTransRepo.create({ brandId: entity.id, languageCode: lang, name }));
      }
    }
  }

  // ─── 5. Categories ─────────────────────────────────────────────────────────
  const catRepo = ds.getRepository('categories');
  const catTransRepo = ds.getRepository('category_translations');

  type CatDef = {
    slug: string; ru: string; ro: string; en: string;
    isOther?: boolean; children?: CatDef[];
  };

  const categoryDefs: CatDef[] = [
    {
      slug: 'whisky', ru: 'Виски', ro: 'Whisky', en: 'Whisky',
      children: [
        { slug: 'single-malt',   ru: 'Односолодовый', ro: 'Single Malt',  en: 'Single Malt'  },
        { slug: 'blended',       ru: 'Купажированный', ro: 'Blended',       en: 'Blended'      },
        { slug: 'bourbon',       ru: 'Бурбон',         ro: 'Bourbon',       en: 'Bourbon'      },
      ],
    },
    { slug: 'cognac',    ru: 'Коньяк',           ro: 'Coniac',          en: 'Cognac'          },
    { slug: 'vodka',     ru: 'Водка',            ro: 'Vodcă',           en: 'Vodka'           },
    { slug: 'rum',       ru: 'Ром',              ro: 'Rom',             en: 'Rum'             },
    { slug: 'tequila',   ru: 'Текила',           ro: 'Tequila',         en: 'Tequila'         },
    { slug: 'gin',       ru: 'Джин',             ro: 'Gin',             en: 'Gin'             },
    {
      slug: 'wine', ru: 'Вино', ro: 'Vin', en: 'Wine',
      children: [
        { slug: 'red-wine',   ru: 'Красное',  ro: 'Roșu',   en: 'Red'   },
        { slug: 'white-wine', ru: 'Белое',    ro: 'Alb',    en: 'White' },
        { slug: 'rose-wine',  ru: 'Розовое',  ro: 'Rosé',   en: 'Rosé'  },
      ],
    },
    { slug: 'sparkling-wine', ru: 'Игристое вино',  ro: 'Vin spumant',    en: 'Sparkling Wine'  },
    { slug: 'champagne',      ru: 'Шампанское',     ro: 'Șampanie',       en: 'Champagne'       },
    { slug: 'liqueurs',       ru: 'Ликеры',         ro: 'Lichioruri',     en: 'Liqueurs'        },
    { slug: 'non-alcoholic',  ru: 'Безалкогольные', ro: 'Nealcoolice',    en: 'Non-Alcoholic'   },
    {
      slug: 'other', ru: 'Другое', ro: 'Altele', en: 'Other', isOther: true,
      children: [
        { slug: 'coffee', ru: 'Кофе', ro: 'Cafea', en: 'Coffee' },
        { slug: 'tea',    ru: 'Чай',  ro: 'Ceai',  en: 'Tea'    },
      ],
    },
  ];

  async function upsertCategory(def: CatDef, parentId: string | null = null) {
    let entity = await catRepo.findOne({ where: { slug: def.slug } });
    if (!entity) {
      entity = await catRepo.save(
        catRepo.create({
          slug: def.slug,
          parentId,
          isOther: def.isOther ?? false,
          isActive: true,
          sortOrder: 0,
          updatedBy: null,
        }),
      );
      console.log(`Category created: ${def.slug}`);
    }
    for (const [lang, name] of [['ru', def.ru], ['ro', def.ro], ['en', def.en]]) {
      const t = await catTransRepo.findOne({ where: { categoryId: entity.id, languageCode: lang } });
      if (!t) {
        await catTransRepo.save(catTransRepo.create({ categoryId: entity.id, languageCode: lang, name }));
      }
    }
    if (def.children) {
      for (const child of def.children) {
        await upsertCategory(child, entity.id);
      }
    }
    return entity;
  }

  for (const def of categoryDefs) {
    await upsertCategory(def);
  }

  // ─── 6 & 7. Attribute Definitions for Coffee and Tea ──────────────────────
  const attrDefRepo = ds.getRepository('attribute_definitions');
  const attrDefTransRepo = ds.getRepository('attribute_definition_translations');

  const coffeeCat = await catRepo.findOne({ where: { slug: 'coffee' } });
  if (coffeeCat) {
    const coffeeAttrs = [
      {
        key: 'roast_level', type: 'text',
        ru: 'Степень обжарки', ro: 'Grad de prăjire', en: 'Roast Level',
      },
      {
        key: 'grind_type', type: 'text',
        ru: 'Помол', ro: 'Tip măcinare', en: 'Grind Type',
      },
    ];
    for (const a of coffeeAttrs) {
      let attr = await attrDefRepo.findOne({ where: { categoryId: coffeeCat.id, key: a.key } });
      if (!attr) {
        attr = await attrDefRepo.save(
          attrDefRepo.create({ categoryId: coffeeCat.id, key: a.key, type: a.type, unit: null, sortOrder: 0, updatedBy: null }),
        );
        console.log(`AttributeDefinition created: ${a.key}`);
      }
      for (const [lang, label] of [['ru', a.ru], ['ro', a.ro], ['en', a.en]]) {
        const t = await attrDefTransRepo.findOne({ where: { attributeDefinitionId: attr.id, languageCode: lang } });
        if (!t) {
          await attrDefTransRepo.save(attrDefTransRepo.create({ attributeDefinitionId: attr.id, languageCode: lang, label }));
        }
      }
    }
  }

  const teaCat = await catRepo.findOne({ where: { slug: 'tea' } });
  if (teaCat) {
    const teaAttrs = [
      {
        key: 'tea_type', type: 'text', unit: null,
        ru: 'Вид чая', ro: 'Tip ceai', en: 'Tea Type',
      },
      {
        key: 'steeping_time', type: 'number', unit: 'min',
        ru: 'Время заваривания', ro: 'Timp infuzie', en: 'Steeping Time',
      },
      {
        key: 'temperature', type: 'number', unit: '°C',
        ru: 'Температура', ro: 'Temperatură', en: 'Temperature',
      },
    ];
    for (const a of teaAttrs) {
      let attr = await attrDefRepo.findOne({ where: { categoryId: teaCat.id, key: a.key } });
      if (!attr) {
        attr = await attrDefRepo.save(
          attrDefRepo.create({ categoryId: teaCat.id, key: a.key, type: a.type, unit: a.unit ?? null, sortOrder: 0, updatedBy: null }),
        );
        console.log(`AttributeDefinition created: ${a.key}`);
      }
      for (const [lang, label] of [['ru', a.ru], ['ro', a.ro], ['en', a.en]]) {
        const t = await attrDefTransRepo.findOne({ where: { attributeDefinitionId: attr.id, languageCode: lang } });
        if (!t) {
          await attrDefTransRepo.save(attrDefTransRepo.create({ attributeDefinitionId: attr.id, languageCode: lang, label }));
        }
      }
    }
  }

  // ─── 8. Products ───────────────────────────────────────────────────────────
  const productRepo = ds.getRepository('products');
  const productTransRepo = ds.getRepository('product_translations');
  const productImageRepo = ds.getRepository('product_images');
  const productAttrRepo = ds.getRepository('product_attributes');

  // Helper to get IDs
  async function getBrandId(slug: string) {
    const b = await brandRepo.findOne({ where: { slug } });
    return b?.id;
  }
  async function getCatId(slug: string) {
    const c = await catRepo.findOne({ where: { slug } });
    return c?.id;
  }
  async function getCountryId(code: string) {
    const c = await countryRepo.findOne({ where: { code } });
    return c?.id;
  }
  async function getVuId(code: string) {
    const v = await vuRepo.findOne({ where: { code } });
    return v?.id;
  }

  const products = [
    {
      slug: 'johnnie-walker-black-label',
      brandSlug: 'johnnie-walker', catSlug: 'blended', countryCode: 'GB',
      volumeValue: 0.7, vuCode: 'l', alcoholDegree: 40.0, isNew: false,
      ru: { name: 'Johnnie Walker Black Label', descriptionDelta: null, descriptionText: 'Легендарный купажированный шотландский виски с 12-летней выдержкой.' },
      ro: { name: 'Johnnie Walker Black Label', descriptionText: 'Whisky scoțian blended cu 12 ani vechime.' },
      en: { name: 'Johnnie Walker Black Label', descriptionText: '12-year-old blended Scotch whisky with rich, complex character.' },
    },
    {
      slug: 'hennessy-vs',
      brandSlug: 'hennessy', catSlug: 'cognac', countryCode: 'FR',
      volumeValue: 0.7, vuCode: 'l', alcoholDegree: 40.0, isNew: false,
      ru: { name: 'Hennessy VS', descriptionText: 'Классический коньяк с мягким вкусом.' },
      ro: { name: 'Hennessy VS', descriptionText: 'Coniac clasic cu gust fin.' },
      en: { name: 'Hennessy VS', descriptionText: 'Classic cognac with smooth, rich taste.' },
    },
    {
      slug: 'glenfiddich-12',
      brandSlug: 'glenfiddich', catSlug: 'single-malt', countryCode: 'GB',
      volumeValue: 0.7, vuCode: 'l', alcoholDegree: 40.0, isNew: false,
      ru: { name: 'Glenfiddich 12 лет', descriptionText: 'Односолодовый шотландский виски с фруктовым ароматом.' },
      ro: { name: 'Glenfiddich 12 ani', descriptionText: 'Whisky single malt cu arome fructate.' },
      en: { name: 'Glenfiddich 12 Years', descriptionText: 'Single malt Scotch whisky with fruity notes.' },
    },
    {
      slug: 'jack-daniels-old-no7',
      brandSlug: 'jack-daniels', catSlug: 'bourbon', countryCode: 'US',
      volumeValue: 0.7, vuCode: 'l', alcoholDegree: 40.0, isNew: false,
      ru: { name: 'Jack Daniel\'s Old No.7', descriptionText: 'Американский теннесийский виски.' },
      ro: { name: 'Jack Daniel\'s Old No.7', descriptionText: 'Whisky american Tennessee.' },
      en: { name: 'Jack Daniel\'s Old No.7', descriptionText: 'Classic Tennessee whiskey.' },
    },
    {
      slug: 'bacardi-superior',
      brandSlug: 'bacardi', catSlug: 'rum', countryCode: 'CU',
      volumeValue: 0.7, vuCode: 'l', alcoholDegree: 37.5, isNew: false,
      ru: { name: 'Bacardi Superior', descriptionText: 'Белый ром с мягким чистым вкусом.' },
      ro: { name: 'Bacardi Superior', descriptionText: 'Rom alb cu gust curat.' },
      en: { name: 'Bacardi Superior', descriptionText: 'White rum with a clean, smooth taste.' },
    },
    {
      slug: 'moet-imperial',
      brandSlug: 'moet-chandon', catSlug: 'champagne', countryCode: 'FR',
      volumeValue: 0.75, vuCode: 'l', alcoholDegree: 12.0, isNew: true,
      ru: { name: 'Moët Impérial', descriptionText: 'Легендарное шампанское с фруктовым вкусом.' },
      ro: { name: 'Moët Impérial', descriptionText: 'Șampanie legendară cu aromă de fructe.' },
      en: { name: 'Moët Impérial', descriptionText: 'Legendary champagne with fruit-forward taste.' },
    },
    {
      slug: 'baileys-original',
      brandSlug: 'baileys', catSlug: 'liqueurs', countryCode: 'GB',
      volumeValue: 0.7, vuCode: 'l', alcoholDegree: 17.0, isNew: false,
      ru: { name: 'Baileys Original', descriptionText: 'Ирландский кремовый ликёр со вкусом шоколада.' },
      ro: { name: 'Baileys Original', descriptionText: 'Lichior cremos irlandez cu aromă de ciocolată.' },
      en: { name: 'Baileys Original', descriptionText: 'Irish cream liqueur with chocolate notes.' },
    },
    {
      slug: 'finlandia-classic',
      brandSlug: 'finlandia', catSlug: 'vodka', countryCode: 'FI',
      volumeValue: 0.7, vuCode: 'l', alcoholDegree: 40.0, isNew: false,
      ru: { name: 'Finlandia Classic', descriptionText: 'Чистая финская водка.' },
      ro: { name: 'Finlandia Classic', descriptionText: 'Vodcă finlandeză pură.' },
      en: { name: 'Finlandia Classic', descriptionText: 'Pure Finnish vodka.' },
    },
    {
      slug: 'patron-silver',
      brandSlug: 'patron', catSlug: 'tequila', countryCode: 'MX',
      volumeValue: 0.7, vuCode: 'l', alcoholDegree: 40.0, isNew: true,
      ru: { name: 'Patrón Silver', descriptionText: 'Серебряная текила премиум класса.' },
      ro: { name: 'Patrón Silver', descriptionText: 'Tequila silver premium.' },
      en: { name: 'Patrón Silver', descriptionText: 'Premium silver tequila.' },
    },
    {
      slug: 'borjomi-sparkling',
      brandSlug: 'borjomi', catSlug: 'non-alcoholic', countryCode: 'GE',
      volumeValue: 0.5, vuCode: 'l', alcoholDegree: null, isNew: false,
      ru: { name: 'Боржоми', descriptionText: 'Минеральная вода с природной газацией.' },
      ro: { name: 'Borjomi', descriptionText: 'Apă minerală naturală carbogazoasă.' },
      en: { name: 'Borjomi', descriptionText: 'Natural sparkling mineral water.' },
    },
    {
      slug: 'johnnie-walker-red-label',
      brandSlug: 'johnnie-walker', catSlug: 'blended', countryCode: 'GB',
      volumeValue: 1.0, vuCode: 'l', alcoholDegree: 40.0, isNew: false,
      ru: { name: 'Johnnie Walker Red Label', descriptionText: 'Доступный купажированный шотландский виски.' },
      ro: { name: 'Johnnie Walker Red Label', descriptionText: 'Whisky scoțian blended accesibil.' },
      en: { name: 'Johnnie Walker Red Label', descriptionText: 'Accessible blended Scotch whisky.' },
    },
    {
      slug: 'glenfiddich-15',
      brandSlug: 'glenfiddich', catSlug: 'single-malt', countryCode: 'GB',
      volumeValue: 0.7, vuCode: 'l', alcoholDegree: 40.0, isNew: true,
      ru: { name: 'Glenfiddich 15 лет', descriptionText: 'Односолодовый виски с ореховым ароматом.' },
      ro: { name: 'Glenfiddich 15 ani', descriptionText: 'Whisky single malt cu note de nuci.' },
      en: { name: 'Glenfiddich 15 Years', descriptionText: 'Single malt with rich nutty notes.' },
    },
    {
      slug: 'hennessy-xo',
      brandSlug: 'hennessy', catSlug: 'cognac', countryCode: 'FR',
      volumeValue: 0.7, vuCode: 'l', alcoholDegree: 40.0, isNew: false,
      ru: { name: 'Hennessy XO', descriptionText: 'Выдержанный коньяк с богатым букетом.' },
      ro: { name: 'Hennessy XO', descriptionText: 'Coniac maturat cu buchet bogat.' },
      en: { name: 'Hennessy XO', descriptionText: 'Aged cognac with a rich bouquet.' },
    },
    {
      slug: 'patron-reposado',
      brandSlug: 'patron', catSlug: 'tequila', countryCode: 'MX',
      volumeValue: 0.7, vuCode: 'l', alcoholDegree: 40.0, isNew: true,
      ru: { name: 'Patrón Reposado', descriptionText: 'Выдержанная текила со сладким ароматом.' },
      ro: { name: 'Patrón Reposado', descriptionText: 'Tequila reposado cu aromă dulce.' },
      en: { name: 'Patrón Reposado', descriptionText: 'Aged tequila with sweet notes.' },
    },
    {
      slug: 'bacardi-gold',
      brandSlug: 'bacardi', catSlug: 'rum', countryCode: 'CU',
      volumeValue: 0.7, vuCode: 'l', alcoholDegree: 37.5, isNew: false,
      ru: { name: 'Bacardi Gold', descriptionText: 'Золотой ром с карамельным вкусом.' },
      ro: { name: 'Bacardi Gold', descriptionText: 'Rom auriu cu aromă de caramel.' },
      en: { name: 'Bacardi Gold', descriptionText: 'Gold rum with caramel flavors.' },
    },
  ];

  for (const p of products) {
    const existing = await productRepo.findOne({ where: { slug: p.slug } });
    if (existing) continue;

    const brandId = await getBrandId(p.brandSlug);
    const categoryId = await getCatId(p.catSlug);
    const countryId = p.countryCode ? await getCountryId(p.countryCode) : null;
    const vuId = p.vuCode ? await getVuId(p.vuCode) : null;

    if (!brandId || !categoryId) {
      console.warn(`Skipping product ${p.slug}: missing brand or category`);
      continue;
    }

    const product = await productRepo.save(
      productRepo.create({
        slug: p.slug,
        brandId,
        categoryId,
        countryId: countryId ?? null,
        volumeValue: p.volumeValue ?? null,
        volumeUnitId: vuId ?? null,
        alcoholDegree: p.alcoholDegree ?? null,
        isNew: p.isNew,
        isActive: true,
        sortOrder: 0,
        updatedBy: null,
      }),
    );
    console.log(`Product created: ${p.slug}`);

    for (const [lang, t] of [['ru', p.ru], ['ro', p.ro], ['en', p.en]] as [string, any][]) {
      await productTransRepo.save(
        productTransRepo.create({
          productId: product.id,
          languageCode: lang,
          name: t.name,
          descriptionDelta: t.descriptionDelta ?? null,
          descriptionText: t.descriptionText ?? null,
        }),
      );
    }
  }

  // Add a couple extra images for the first two products to satisfy "at least 2 with multiple images"
  const firstProduct = await productRepo.findOne({ where: { slug: 'johnnie-walker-black-label' } });
  if (firstProduct) {
    const imgCount = await productImageRepo.count({ where: { productId: firstProduct.id } });
    if (imgCount === 0) {
      await productImageRepo.save(productImageRepo.create({ productId: firstProduct.id, url: '/uploads/products/placeholder-1.jpg', alt: 'Johnnie Walker Black Label', sortOrder: 0 }));
      await productImageRepo.save(productImageRepo.create({ productId: firstProduct.id, url: '/uploads/products/placeholder-2.jpg', alt: 'Johnnie Walker Black Label bottle', sortOrder: 1 }));
    }
  }

  const secondProduct = await productRepo.findOne({ where: { slug: 'hennessy-vs' } });
  if (secondProduct) {
    const imgCount = await productImageRepo.count({ where: { productId: secondProduct.id } });
    if (imgCount === 0) {
      await productImageRepo.save(productImageRepo.create({ productId: secondProduct.id, url: '/uploads/products/placeholder-3.jpg', alt: 'Hennessy VS', sortOrder: 0 }));
      await productImageRepo.save(productImageRepo.create({ productId: secondProduct.id, url: '/uploads/products/placeholder-4.jpg', alt: 'Hennessy VS box', sortOrder: 1 }));
    }
  }

  // Add attributes to coffee/tea products (none seeded, but attribute defs exist)
  // Add attributes to the first 3 products that have attribute defs
  const patronSilver = await productRepo.findOne({ where: { slug: 'patron-silver' } });
  const coffeeCatFinal = await catRepo.findOne({ where: { slug: 'coffee' } });
  if (coffeeCat && patronSilver) {
    // patron is tequila, not coffee - skip attribute assignment for now
  }

  console.log('All seed data applied.');
}

bootstrap().catch(console.error);
