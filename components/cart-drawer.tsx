"use client"

import { useCart } from "@/lib/cart-context"
import { createCheckout } from "@/app/actions/checkout"
import { X, Minus, Plus, Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

const BLUE = "var(--avro-blue)"

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, total, itemCount } = useCart()
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  async function handleCheckout() {
    if (items.length === 0 || isCheckingOut) return
    setCheckoutError(null)
    setIsCheckingOut(true)
    try {
      const result = await createCheckout(
        items.map((item) => ({
          formulaId: item.formula.id,
          flavor: item.formula.flavor,
          variant: item.variant,
          quantity: item.quantity,
        })),
      )

      if (!result.ok) {
        setCheckoutError(result.error)
        return
      }

      // Bypass the store password screen for staging stores.
      const url = new URL(result.checkoutUrl)
      url.searchParams.set("channel", "online_store")
      const checkoutUrl = url.toString()

      // If embedded in an iframe (e.g. the v0 preview), open in a new tab.
      if (typeof window !== "undefined" && window.self !== window.top) {
        window.open(checkoutUrl, "_blank", "noopener,noreferrer")
      } else {
        window.location.href = checkoutUrl
      }
    } catch {
      setCheckoutError("Something went wrong starting checkout. Please try again.")
    } finally {
      setIsCheckingOut(false)
    }
  }

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[9998] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ backgroundColor: "rgba(21,21,21,0.45)" }}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-[440px] z-[9999] shadow-[0_0_60px_rgba(21,21,21,0.18)] transform transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ backgroundColor: "var(--base)", color: "var(--ink)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-6"
            style={{ borderBottom: "1px solid rgba(21,21,21,0.1)" }}
          >
            <div className="flex items-center gap-3">
              <Image
                src="/brand/sumo-cart-icon.svg"
                alt=""
                width={44}
                height={44}
                className="flex-shrink-0"
                aria-hidden="true"
              />
              <h2 className="font-serif font-black text-[32px] leading-[1.0] tracking-[-0.01em]" style={{ color: "var(--ink)" }}>
                Your Cart
              </h2>
              <span
                className="inline-flex items-center justify-center min-w-[36px] h-[32px] px-2.5 rounded-full font-serif font-black text-[16px] leading-none"
                style={{ backgroundColor: BLUE, color: "var(--charcoal)" }}
                aria-label={`${itemCount} items`}
              >
                {itemCount}
              </span>
            </div>
            <button
              onClick={closeCart}
              className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
              style={{ color: "var(--ink)" }}
              aria-label="Close cart"
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(21,21,21,0.08)" }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent" }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                  style={{ backgroundColor: BLUE }}
                  aria-hidden="true"
                >
                  <span className="font-serif font-black text-[26px] leading-none" style={{ color: "var(--charcoal)" }}>+</span>
                </div>
                <h3 className="font-serif font-black text-[28px] leading-[1.05] mb-2" style={{ color: "var(--ink)" }}>
                  Your cart is empty
                </h3>
                <p className="text-[14px] leading-[1.5] mb-7 max-w-[260px]" style={{ color: "rgba(21,21,21,0.6)" }}>
                  Start with a formula built for your moment — Calm, Focus, or Energy.
                </p>
                <Link
                  href="/shop"
                  onClick={closeCart}
                  className="inline-flex items-center justify-center font-serif font-black text-[15px] leading-none transition-colors"
                  style={{
                    backgroundColor: "var(--charcoal)",
                    color: "var(--bone)",
                    border: "2px solid var(--charcoal)",
                    padding: "14px 36px",
                    borderRadius: 999,
                    textDecoration: "none",
                    letterSpacing: "0.01em",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--bone)"
                    e.currentTarget.style.color = "var(--charcoal)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--charcoal)"
                    e.currentTarget.style.color = "var(--bone)"
                  }}
                >
                  Browse Formulas
                </Link>
              </div>
            ) : (
              <ul className="flex flex-col gap-5">
                {items.map((item) => (
                  <li
                    key={`${item.formula.id}-${item.variant}`}
                    className="flex gap-4 pb-5"
                    style={{ borderBottom: "1px solid rgba(21,21,21,0.08)" }}
                  >
                    <div
                      className="w-[88px] h-[88px] rounded-[18px] flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: item.formula.color }}
                    >
                      <Image
                        src="/brand/avro-logo.svg"
                        alt=""
                        width={44}
                        height={44}
                        className="opacity-25"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-serif font-black text-[19px] leading-[1.1] tracking-[-0.01em] truncate" style={{ color: "var(--ink)" }}>
                            {item.formula.name}
                          </h3>
                          <p className="text-[12px] font-bold tracking-[0.08em] uppercase mt-1" style={{ color: "rgba(21,21,21,0.55)" }}>
                            {item.variant === "bundle" ? "3-Pack Bundle" : "Single Pack"}
                          </p>
                        </div>
                        <p className="font-serif font-black text-[18px] leading-[1.1] flex-shrink-0" style={{ color: "var(--ink)" }}>
                          ${item.variant === "bundle" ? item.formula.bundlePrice : item.formula.price}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 mt-auto pt-3">
                        <div
                          className="flex items-center rounded-full"
                          style={{ border: "1.5px solid var(--ink)" }}
                        >
                          <button
                            onClick={() => updateQuantity(item.formula.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-full"
                            style={{ color: "var(--ink)" }}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-serif font-black text-[15px]" style={{ color: "var(--ink)" }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.formula.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-full"
                            style={{ color: "var(--ink)" }}
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.formula.id)}
                          className="ml-auto text-[12px] font-bold tracking-[0.08em] uppercase transition-colors"
                          style={{ color: "rgba(21,21,21,0.5)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ink)" }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(21,21,21,0.5)" }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div
              className="px-6 pt-5 pb-6"
              style={{
                borderTop: "1px solid rgba(21,21,21,0.1)",
                backgroundColor: "var(--base-light)",
              }}
            >
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[12px] font-bold tracking-[0.12em] uppercase" style={{ color: "rgba(21,21,21,0.6)" }}>
                  Subtotal
                </span>
                <span className="font-serif font-black text-[26px] leading-[1.05] tracking-[-0.01em]" style={{ color: "var(--ink)" }}>
                  ${total.toFixed(2)}
                </span>
              </div>
              <p className="text-[12px] mb-5" style={{ color: "rgba(21,21,21,0.55)" }}>
                Shipping and taxes calculated at checkout.
              </p>
              {checkoutError && (
                <p
                  className="text-[12px] leading-[1.4] mb-3"
                  role="alert"
                  style={{ color: "#b3261e" }}
                >
                  {checkoutError}
                </p>
              )}
              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                aria-busy={isCheckingOut}
                className="w-full inline-flex items-center justify-center gap-2 font-serif font-black text-[16px] leading-none transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "var(--charcoal)",
                  color: "var(--bone)",
                  border: "2px solid var(--charcoal)",
                  padding: "16px 28px",
                  borderRadius: 999,
                  letterSpacing: "0.01em",
                }}
                onMouseEnter={(e) => {
                  if (isCheckingOut) return
                  e.currentTarget.style.backgroundColor = "var(--bone)"
                  e.currentTarget.style.color = "var(--charcoal)"
                }}
                onMouseLeave={(e) => {
                  if (isCheckingOut) return
                  e.currentTarget.style.backgroundColor = "var(--charcoal)"
                  e.currentTarget.style.color = "var(--bone)"
                }}
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Starting checkout…
                  </>
                ) : (
                  "Checkout"
                )}
              </button>
              <button
                onClick={closeCart}
                className="w-full mt-3 text-center text-[13px] font-bold tracking-[0.08em] uppercase transition-colors"
                style={{ color: "rgba(21,21,21,0.55)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ink)" }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(21,21,21,0.55)" }}
              >
                Continue Shopping
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
