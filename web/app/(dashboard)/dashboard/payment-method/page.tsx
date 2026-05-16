"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { ArrowLeft, CreditCard, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "@/lib/api/AuthContext";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import {
  addStoredPaymentMethod,
  getStoredPaymentMethods,
  removeStoredPaymentMethod,
  type PaymentMethod,
} from "@/lib/api/payments";

// Initialize Stripe - Replace with your publishable key
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_your_publishable_key_here"
);

// Card Element styling
const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#1f2937",
      fontFamily: '"Inter", sans-serif',
      "::placeholder": {
        color: "#9ca3af",
      },
      iconColor: "#6b7280",
    },
    invalid: {
      color: "#ef4444",
      iconColor: "#ef4444",
    },
  },
  hidePostalCode: false,
};

// Payment Form Component (Modal)
function AddPaymentForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardholderName, setCardholderName] = useState("");

  const handleCardChange = (event: any) => {
    setCardError(event.error ? event.error.message : null);
    setCardComplete(event.complete);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !user) {
      return;
    }

    if (!cardholderName.trim()) {
      setCardError("Please enter the cardholder name");
      return;
    }

    setIsProcessing(true);
    setCardError(null);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setIsProcessing(false);
      return;
    }

    try {
      // Create a payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: {
          name: cardholderName,
          email: user.email || undefined,
        },
      });

      if (error) {
        setCardError(error.message || "An error occurred");
        setIsProcessing(false);
        return;
      }

      if (!paymentMethod) {
        setCardError("Failed to create payment method");
        setIsProcessing(false);
        return;
      }

      const paymentMethodData: PaymentMethod = {
        id: paymentMethod.id,
        paymentMethodId: paymentMethod.id,
        cardBrand: paymentMethod.card?.brand || "unknown",
        last4: paymentMethod.card?.last4 || "",
        expMonth: paymentMethod.card?.exp_month || 0,
        expYear: paymentMethod.card?.exp_year || 0,
        createdAt: new Date().toISOString(),
        cardholderName,
      };
      addStoredPaymentMethod(user.uid, paymentMethodData);

      // Success - close modal and refresh list
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error saving payment method:", err);
      setCardError(err.message || "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-darkBlue-013 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("payment.addNewCard")}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Cardholder Name */}
          <div>
            <label
              htmlFor="cardholderName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {t("payment.cardholderName")}
            </label>
            <input
              type="text"
              id="cardholderName"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:!border-transparent dark:bg-gray-700 dark:text-white transition-all"
              required
            />
          </div>

          {/* Card Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("payment.cardDetails")}
            </label>
            <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 transition-all focus-within:ring-2 focus-within:ring-red-500 focus-within:border-transparent">
              <CardElement options={cardElementOptions} onChange={handleCardChange} />
            </div>
            {cardError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{cardError}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!stripe || isProcessing || !cardComplete}
            className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? t("payment.saving") : t("payment.addCard")}
          </button>
        </form>
      </div>
    </div>
  );
}

// Main Page Component
export default function PaymentMethodPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load payment methods
  useEffect(() => {
    if (user) {
      loadPaymentMethods();
    }
  }, [user]);

  const loadPaymentMethods = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const methods = getStoredPaymentMethods(user.uid).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setPaymentMethods(methods);
    } catch (error) {
      console.error("Error loading payment methods:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (paymentMethodId: string, docId: string) => {
    if (!confirm(t("payment.deleteConfirm"))) {
      return;
    }

    if (!user) {
      console.error("No user available when deleting payment method");
      return;
    }

    setDeletingId(docId);
    try {
      removeStoredPaymentMethod(user.uid, paymentMethodId);
      await loadPaymentMethods();
    } catch (error) {
      console.error("Error deleting payment method:", error);
      alert("Failed to delete payment method. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const getCardIcon = (brand: string | undefined | null) => {
    if (!brand) return "Card";
    const brandLower = brand.toLowerCase();
    if (brandLower.includes("visa")) return "VISA";
    if (brandLower.includes("mastercard") || brandLower.includes("master")) return "MasterCard";
    if (brandLower.includes("amex") || brandLower.includes("american")) return "AMEX";
    if (brandLower.includes("discover")) return "Discover";
    return brand.toUpperCase();
  };

  const formatExpiryDate = (month: number | undefined | null, year: number | undefined | null) => {
    if (!month || !year) return "--/--";
    const formattedMonth = month.toString().padStart(2, "0");
    const formattedYear = year.toString().slice(-2);
    return `${formattedMonth}/${formattedYear}`;
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="h-6 w-6 text-gray-900 dark:text-gray-100" />
        </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("payment.title")}</h1>
          <button
            onClick={() => router.push("/dashboard/settings")}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            {t("common.cancel")}
          </button>
        </div>

      {/* Add New Card Button */}
      <button
        onClick={() => setShowAddForm(true)}
        className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors mb-6"
      >
        <CreditCard className="h-5 w-5" />
        <Plus className="h-5 w-5" />
        <span>{t("payment.addNewCard")}</span>
      </button>

      {/* Payment Methods List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {t("payment.loading")}
        </div>
      ) : paymentMethods.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>{t("payment.noMethods")}</p>
          <p className="text-sm mt-2">{t("payment.clickToAdd")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className="bg-white dark:bg-darkBlue-013 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {getCardIcon(method.cardBrand)}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      •••• {method.last4}
                    </span>
                  </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t("payment.expires")} {formatExpiryDate(method.expMonth, method.expYear)}
                      </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(method.paymentMethodId, method.id)}
                disabled={deletingId === method.id}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                aria-label="Delete payment method"
              >
                {deletingId === method.id ? (
                  <div className="h-5 w-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Payment Form Modal */}
      {showAddForm && (
        <Elements stripe={stripePromise}>
          <AddPaymentForm
            onClose={() => setShowAddForm(false)}
            onSuccess={() => {
              loadPaymentMethods();
            }}
          />
        </Elements>
      )}
    </div>
  );
}
