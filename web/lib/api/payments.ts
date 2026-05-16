export interface PaymentMethod {
  id: string;
  paymentMethodId: string;
  cardBrand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  createdAt: string;
  cardholderName?: string;
  tokenId?: string;
  isDefault?: boolean;
}

const getPaymentStorageKey = (userId: string) => `taskzing_payment_methods_${userId}`;

export function getStoredPaymentMethods(userId: string): PaymentMethod[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(getPaymentStorageKey(userId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PaymentMethod[]) : [];
  } catch {
    return [];
  }
}

export function saveStoredPaymentMethods(
  userId: string,
  methods: PaymentMethod[]
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getPaymentStorageKey(userId), JSON.stringify(methods));
}

export function addStoredPaymentMethod(
  userId: string,
  method: PaymentMethod
): PaymentMethod[] {
  const nextMethods = [method, ...getStoredPaymentMethods(userId)];
  saveStoredPaymentMethods(userId, nextMethods);
  return nextMethods;
}

export function removeStoredPaymentMethod(
  userId: string,
  methodId: string
): PaymentMethod[] {
  const nextMethods = getStoredPaymentMethods(userId).filter(
    (method) => method.id !== methodId && method.paymentMethodId !== methodId
  );
  saveStoredPaymentMethods(userId, nextMethods);
  return nextMethods;
}

export function hasStoredPaymentMethods(userId: string): boolean {
  return getStoredPaymentMethods(userId).length > 0;
}
