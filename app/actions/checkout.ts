"use server"

import { createCart, resolveVariantId, isShopifyConfigured, type CartLineInput } from "@/lib/shopify"

export interface CheckoutLine {
  formulaId: string
  /** Optional flavor name to match a specific Shopify variant. */
  flavor?: string
  variant: "single" | "bundle"
  quantity: number
}

export type CheckoutResult =
  | { ok: true; checkoutUrl: string }
  | { ok: false; error: string }

/**
 * Resolves each cart line to a real Shopify variant, creates a Shopify cart,
 * and returns the hosted checkout URL.
 *
 * A "bundle" line is treated as 3 units of the resolved variant. Once the
 * connected store defines dedicated bundle variants, map them in
 * FORMULA_HANDLES / resolveVariantId instead.
 */
export async function createCheckout(lines: CheckoutLine[]): Promise<CheckoutResult> {
  if (!isShopifyConfigured()) {
    return {
      ok: false,
      error:
        "Shopify is not connected. Add SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN to enable checkout.",
    }
  }

  if (!lines.length) {
    return { ok: false, error: "Your cart is empty." }
  }

  try {
    const cartLines: CartLineInput[] = []

    for (const line of lines) {
      const merchandiseId = await resolveVariantId(line.formulaId, line.flavor)
      if (!merchandiseId) {
        return {
          ok: false,
          error: `We couldn't find "${line.formulaId}" in the store. Make sure it's published to the sales channel for your Storefront token.`,
        }
      }
      const quantity = line.variant === "bundle" ? line.quantity * 3 : line.quantity
      cartLines.push({ merchandiseId, quantity })
    }

    const { checkoutUrl } = await createCart(cartLines)
    return { ok: true, checkoutUrl }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed. Please try again."
    return { ok: false, error: message }
  }
}
