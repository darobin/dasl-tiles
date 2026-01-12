
export const maslHTTPHeaders = {
  'content-type': { type: 'string' },
  'content-disposition': { type: 'string' },
  'content-encoding': { type: 'string' },
  'content-language': { type: 'string' },
  'content-security-policy': { type: 'string' },
  'link': { type: 'string' },
  'permissions-policy': { type: 'string' },
  'referrer-policy': { type: 'string' },
  'service-worker-allowed': { type: 'string' },
  'sourcemap': { type: 'string' },
  'speculation-rules': { type: 'string' },
  'supports-loading-mode': { type: 'string' },
  'x-content-type-options': { type: 'string' },
};

export const masl = {
  lexicon: 1,
  id: 'ing.dasl.masl',
  description: 'Lexicon for DASL (https://dasl.ing/) types used on AT, notably for Web Tiles.',
  defs: {
    main: {
      type: 'object',
      description: 'MASL metadata as defined in https://dasl.ing/masl.html',
      properties: {
        // These are for small MASL wrappers, don't use this for tiles
        // src: { type: 'cid-link' },
        // ...maslHTTPHeaders,
        // Full MASL for tiles
        name: {
          type: 'string',
          description: 'The name for the tile, can be a title or app name',
          maxLength: 1000,
          maxGraphemes: 100,
        },
        description: {
          type: 'string',
          description: 'Short overview of the contetn',
          maxLength: 3000,
          maxGraphemes: 300,
        },
        categories: {
          type: 'array',
          description: 'Tags categorising the tile',
          items: {
            type: 'string',
          },
        },
        background_color: {
          type: 'string',
          description: 'A colour for the background of the tile',
        },
        icons: {
          type: 'array',
          description: 'Icons for the tile',
          items: {
            type: 'object',
            required: ['src'],
            properties:{
              src: { type: 'string' }, // has to be in resources
              sizes: { type: 'string' },
              purpose: { type: 'string' },
            },
          },
        },
        screenshots: {
          type: 'array',
          description: 'Screenshots, can be used for banner or card images',
          items: {
            type: 'object',
            required: ['src'],
            properties:{
              src: { type: 'string' },
              sizes: { type: 'string' },
              label: { type: 'string' },
              // form_factor: {
              //   type: 'string',
              //   knownValues: ['narrow', 'wide'],
              // },
              // platform: {
              //   type: 'string',
              //   knownValues: ['android', 'chromeos', 'ios', 'ipados', 'kaios', 'macos', 'windows', 'xbox', 'chrome_web_store', 'itunes', 'microsoft', 'microsoft', 'play'],
              // },
            },
          },
        },
        sizing: {
          type: 'object',
          description: 'Requesting sizing properties for the content',
          properties: {
            width: {
              type: 'integer',
              mininum: 1,
            },
            height: {
              type: 'integer',
              mininum: 1,
            },
          },
          required: ['width', 'height'],
        },
        // Add this when we know what it looks like
        // wishes: {
        //   type: 'array',
        //   items: {
        //     type: 'ref',
        //     ref: '#wish',
        //   },
        // },
        // The problem is that Lexicon cannot represent objects with arbitrary keys,
        // even if they have predictable values as is the case here.
        // Values are ing.dasl.masl#item.
        resources: {
          type: 'unknown',
          description: 'A mapping of path to object with a CID src and HTTP headers',
        },
        short_name: {
          type: 'string',
          description: 'A name, in case the basic name cannot fit',
        },
        theme_color: {
          type: 'string',
          description: 'Theme colour',
        },
        // versioning
        prev: {
          type: 'cid-link',
          description: 'In case there are multiple versions of this tile, this is the CID of the previous one',
        },
        // CAR compatibility
        version: {
          type: 'integer',
          description: 'The CAR version — avoid using this',
          const: 1
        },
        roots: {
          type: 'array',
          description: 'The CAR roots — avoid using this',
          items: { type: 'cid-link' }
        },
      },
      required: ['name', 'resources'],
    },
    tile: {
      type: 'record',
      description: 'A tile, instantiating MASL metadata into a record',
      key: 'tid',
      record: {
        type: 'object',
        required: ['cid', 'tile', 'createdAt'],
        properties: {
          cid: {
            type: 'string',
            description: 'The DRISL CID of the MASL for the tile',
            format: 'cid',
          },
          tile: {
            type: 'ref',
            description: 'The MASL content',
            ref: 'ing.dasl.masl#main',
          },
          createdAt: {
            type: 'string',
            description: 'Timestamp',
            format: 'datetime',
          },
        },
      },
    },
  },
};

// $type: com.atproto.lexicon.schema



// For when we have views of tiles
// view: {
//   type: 'object',
//   properties: {
//     uri: {
//       type: 'string',
//       format: 'at-uri',
//     },
//     cid: {
//       type: 'string',
//       format: 'cid',
//     },
//     author: {
//       type: 'ref',
//       ref: 'app.bsky.actor.defs#profileViewBasic',
//     },
//     tile: {
//       type: 'ref',
//       ref: 'ing.dasl#tile',
//     },
//     createdAt: {
//       type: 'string',
//       format: 'datetime',
//     },
//     indexedAt: {
//       type: 'string',
//       format: 'datetime',
//     },
//   },
//   required: ['cid', 'uri', 'author', 'tile', 'createdAt', 'indexedAt'],
// }
