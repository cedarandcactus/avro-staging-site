import "server-only"

/**
 * Shopify Storefront API client.
 *
 * Uses the Storefront GraphQL API to read live product/pricing data and to
 * create carts for checkout. All product data is fetched dynamically at
 * runtime so the storefront stays in sync with the Shopify catalog.
 *
 * Required environment variables (provided by the Shopify integration):
 *   - SHOPIFY_STORE_DOMAIN
 *   - SHOPIFY_STOREFRONT_ACCESS_TOKEN
 */

const API_VERSION = "2025-10"

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN
const TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN

export function isShopifyConfigured() {
  return Boolean(DOMAIN && TOKEN)
}

/**
 * Maps the site's local formula ids to Shopify product handles.
 * Adjust the handles here if the connected store uses different handles.
 */
export const FORMULA_HANDLES: Record<string, string> = {
  calm: "avro-calm",
  focus: "avro-focus",
  energy: "avro-energy",
}

type GraphQLResponse<T> = {
  data?: T
  errors?: Array<{ message: string }>
}

async function storefrontFetch<T>(
  query: string,
  variables: Record<string, unknown> = {},
  cache: RequestCache = "no-store",
): Promise<T> {
  if (!DOMAIN || !TOKEN) {
    throw new Error(
      "Shopify is not configured. Set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN.",
    )
  }

  const res = await fetch(`https://${DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    cache,
  })

  if (!res.ok) {
    throw new Error(`Shopify Storefront API error: ${res.status} ${res.statusText}`)
  }

  const json = (await res.json()) as GraphQLResponse<T>
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "))
  }
  if (!json.data) {
    throw new Error("Shopify Storefront API returned no data.")
  }
  return json.data
}

/* ------------------------------------------------------------------ */
/* Product types                                                       */
/* ------------------------------------------------------------------ */

export interface ShopifyVariant {
  id: string
  title: string
  availableForSale: boolean
  price: { amount: string; currencyCode: string }
  selectedOptions: Array<{ name: string; value: string }>
}

export interface ShopifyProduct {
  id: string
  handle: string
  title: string
  description: string
  featuredImage: { url: string; altText: string | null } | null
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } }
  variants: ShopifyVariant[]
}

const PRODUCT_FRAGMENT = /* GraphQL */ `
  fragment ProductFields on Product {
    id
    handle
    title
    description
    featuredImage {
      url
      altText
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    variants(first: 50) {
      edges {
        node {
          id
          title
          availableForSale
          price {
            amount
            currencyCode
          }
          selectedOptions {
            name
            value
          }
        }
      }
    }
  }
`

type RawProduct = Omit<ShopifyProduct, "variants"> & {
  variants: { edges: Array<{ node: ShopifyVariant }> }
}

function normalizeProduct(raw: RawProduct | null): ShopifyProduct | null {
  if (!raw) return null
  return {
    ...raw,
    variants: raw.variants.edges.map((e) => e.node),
  }
}

export async function getProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  const query = /* GraphQL */ `
    ${PRODUCT_FRAGMENT}
    query ProductByHandle($handle: String!) {
      product(handle: $handle) {
        ...ProductFields
      }
    }
  `
  const data = await storefrontFetch<{ product: RawProduct | null }>(query, { handle })
  return normalizeProduct(data.product)
}

export async function getAllProducts(first = 20): Promise<ShopifyProduct[]> {
  const query = /* GraphQL */ `
    ${PRODUCT_FRAGMENT}
    query AllProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            ...ProductFields
          }
        }
      }
    }
  `
  const data = await storefrontFetch<{ products: { edges: Array<{ node: RawProduct }> } }>(
    query,
    { first },
  )
  return data.products.edges
    .map((e) => normalizeProduct(e.node))
    .filter((p): p is ShopifyProduct => p !== null)
}

/**
 * Resolve a specific Shopify variant id for a formula + flavor.
 * Falls back to the first available variant when no flavor match is found.
 */
export async function resolveVariantId(
  formulaId: string,
  flavorName?: string,
): Promise<string | null> {
  const handle = FORMULA_HANDLES[formulaId]
  if (!handle) return null

  const product = await getProductByHandle(handle)
  if (!product || product.variants.length === 0) return null

  if (flavorName) {
    const match = product.variants.find((v) =>
      v.selectedOptions.some(
        (o) => o.value.toLowerCase().trim() === flavorName.toLowerCase().trim(),
      ),
    )
    if (match) return match.id
  }

  const firstAvailable = product.variants.find((v) => v.availableForSale)
  return (firstAvailable ?? product.variants[0]).id
}

/* ------------------------------------------------------------------ */
/* Cart / checkout                                                     */
/* ------------------------------------------------------------------ */

export interface CartLineInput {
  merchandiseId: string
  quantity: number
}

export async function createCart(
  lines: CartLineInput[],
): Promise<{ checkoutUrl: string }> {
  const mutation = /* GraphQL */ `
    mutation CartCreate($lines: [CartLineInput!]!) {
      cartCreate(input: { lines: $lines }) {
        cart {
          id
          checkoutUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `
  const data = await storefrontFetch<{
    cartCreate: {
      cart: { id: string; checkoutUrl: string } | null
      userErrors: Array<{ field: string[] | null; message: string }>
    }
  }>(mutation, { lines })

  const { cart, userErrors } = data.cartCreate
  if (userErrors?.length) {
    throw new Error(userErrors.map((e) => e.message).join("; "))
  }
  if (!cart) {
    throw new Error("Shopify did not return a cart.")
  }
  return { checkoutUrl: cart.checkoutUrl }
}
