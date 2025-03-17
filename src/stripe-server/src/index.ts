#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import Stripe from 'stripe';

function convertRecurringToCreateParams(
  recurring: Stripe.Price.Recurring | null | undefined
): Stripe.PriceCreateParams.Recurring | undefined {
  if (!recurring) {
    return undefined;
  }
  return {
    interval: recurring.interval,
    interval_count: recurring.interval_count,
    aggregate_usage: recurring.aggregate_usage ?? undefined,
    trial_period_days: recurring.trial_period_days ?? undefined,
    usage_type: recurring.usage_type,
  };
}

const STRIPE_SECRET_KEY_TEST = process.env.STRIPE_SECRET_KEY_TEST;
const STRIPE_SECRET_KEY_LIVE = process.env.STRIPE_SECRET_KEY_LIVE;
const MODE = process.env.MODE;

if (!STRIPE_SECRET_KEY_TEST || !STRIPE_SECRET_KEY_LIVE) {
  throw new Error(
    'STRIPE_SECRET_KEY_TEST and STRIPE_SECRET_KEY_LIVE environment variables are required'
  );
}

if (!MODE || (MODE !== 'test' && MODE !== 'live')) {
  throw new Error("MODE environment variable must be 'test' or 'live'");
}

const STRIPE_SECRET_KEY =
  MODE === 'test' ? STRIPE_SECRET_KEY_TEST : STRIPE_SECRET_KEY_LIVE;

class StripeServer {
  private server: Server;
  private stripe: Stripe;

  constructor() {
    this.server = new Server(
      {
        name: 'stripe-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    });

    this.setupToolHandlers();

    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async createProductWithPrices(
    product: Stripe.Product,
    prices: Stripe.Price[]
  ) {
    // Create the product in the test environment
    const createdProduct = await this.stripe.products.create({
      name: product.name,
      description: product.description || undefined, // description can be null
      default_price_data: undefined,
      images: product.images && product.images.length > 0 ? product.images : undefined,
        metadata: product.metadata,
      });
  
      // Create the prices in the test environment
      for (const price of prices) {
        await this.stripe.prices.create({
          product: createdProduct.id,
          currency: price.currency,
          unit_amount: price.unit_amount ?? undefined,
          recurring: convertRecurringToCreateParams(price.recurring),
          metadata: price.metadata,
        });
      }
    }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_products',
          description: 'List Stripe products',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'get_prices',
          description: 'Get prices for a Stripe product',
          inputSchema: {
            type: 'object',
            properties: {
              product_id: {
                type: 'string',
                description: 'Product ID',
              },
            },
            required: ['product_id'],
          },
        },
        {
          name: 'copy_products_and_prices_to_test',
          description: 'Copy products and prices from live to test environment',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'list_products') {
        try {
          const products = await this.stripe.products.list();

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(products.data, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error('Stripe API error:', error);
          return {
            content: [
              {
                type: 'text',
                text: `Stripe API error: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
              },
            ],
            isError: true,
          };
        }
      } else if (request.params.name === 'get_prices') {
        if (
          typeof request.params.arguments !== 'object' ||
          request.params.arguments === null ||
          typeof request.params.arguments.product_id !== 'string'
        ) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Invalid arguments for get_prices'
          );
        }

        const productId = request.params.arguments.product_id;

        try {
          const prices = await this.stripe.prices.list({
            product: productId,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(prices.data, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error('Stripe API error:', error);
          return {
            content: [
              {
                type: 'text',
                text: `Stripe API error: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
              },
            ],
            isError: true,
          };
        }
      } else if (request.params.name === 'copy_products_and_prices_to_test') {
          if(MODE === 'test') {
            return {
                content: [{type: 'text', text: 'Cannot copy to test environment when already in test mode.'}],
                isError: true
            }
          }
        try {
          // 1. Fetch products from the live environment
          const liveProducts = await this.stripe.products.list();

          // 2. For each product, fetch its prices
          for (const product of liveProducts.data) {
            const livePrices = await this.stripe.prices.list({
              product: product.id,
            });

            // 3. Create the product and prices in the test environment.
            // Temporarily switch to test Stripe instance
            const tempStripe = new Stripe(STRIPE_SECRET_KEY_TEST!, {
              apiVersion: '2025-02-24.acacia',
            });
            // Create the product in the test environment
            const createdProduct = await tempStripe.products.create({
              name: product.name,
              description: product.description || undefined, // description can be null
              default_price_data: undefined,
              images:
                product.images && product.images.length > 0
                  ? product.images
                  : undefined,
              metadata: product.metadata,
            });

            // Create the prices in the test environment
            for (const price of livePrices.data) {
              await tempStripe.prices.create({
                product: createdProduct.id,
                currency: price.currency,
                unit_amount: price.unit_amount ?? undefined,
                recurring: convertRecurringToCreateParams(price.recurring),
                metadata: price.metadata,
              });
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: 'Products and prices copied to test environment.',
              },
            ],
          };
        } catch (error) {
          console.error('Stripe API error:', error);
          return {
            content: [
              {
                type: 'text',
                text: `Stripe API error: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
              },
            ],
            isError: true,
          };
        }
      } else {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Stripe MCP server running on stdio');
  }
}

const server = new StripeServer();
server.run().catch(console.error);
