# 💳 Payment & Order System - Complete Implementation Guide

## 🎯 Overview

Complete Razorpay payment integration with COD support, order management, transaction tracking, and shipment status system for Lavish India.

---

## 🏗️ Architecture

### Database Models

```
Order
├── Payment (1:1)
├── OrderItems (1:many)
├── OrderTracking (1:many)
├── Address (many:1)
└── User (many:1)
```

### Payment Flow

```
Customer
   │
   ▼
Checkout Page
   │
   ├──► COD Selected ──► Create Order (PROCESSING) ──► Order Success
   │
   └──► Razorpay Selected
           │
           ▼
       Create Razorpay Order
           │
           ▼
       Razorpay Payment Gateway
           │
           ├──► Success ──► Verify Payment ──► Update Order ──► Order Success
           │
           └──► Failed/Cancelled ──► Update Payment (FAILED) ──► Order Failed
```

---

## 📊 Order & Payment Status

### Order Status Flow

1. **PENDING** - Order created, awaiting payment (Razorpay only)
2. **PROCESSING** - Payment confirmed / COD order placed
3. **SHIPPED** - Order dispatched
4. **OUT_FOR_DELIVERY** - Out for delivery
5. **DELIVERED** - Successfully delivered
6. **CANCELLED** - Order cancelled
7. **REFUNDED** - Order refunded

### Payment Status

1. **PENDING** - Payment initiated
2. **COMPLETED** - Payment successful
3. **FAILED** - Payment failed
4. **REFUNDED** - Payment refunded

---

## 🔧 API Endpoints

### 1. Create Razorpay Order

**Endpoint:** `POST /api/payment/create-order`

**Purpose:** Create Razorpay order before showing payment gateway

**Request:**

```json
{
  "amountCents": 199900,
  "currency": "INR",
  "notes": {
    "productIds": ["prod1", "prod2"]
  }
}
```

**Response:**

```json
{
  "success": true,
  "orderId": "order_MfR8p9ZqKYxYYz",
  "amount": 199900,
  "currency": "INR",
  "keyId": "rzp_test_..."
}
```

---

### 2. Verify Payment

**Endpoint:** `POST /api/payment/verify`

**Purpose:** Verify Razorpay payment signature after payment

**Request:**

```json
{
  "razorpay_order_id": "order_MfR8p9ZqKYxYYz",
  "razorpay_payment_id": "pay_MfR9KgJVaQZ0mS",
  "razorpay_signature": "signature_here",
  "orderId": "db_order_id"
}
```

**Response:**

```json
{
  "success": true,
  "verified": true,
  "message": "Payment verified successfully"
}
```

---

### 3. Create Order

**Endpoint:** `POST /api/orders/create`

**Purpose:** Create order in database with items and tracking

**Request:**

```json
{
  "addressId": "addr_123",
  "paymentMethod": "razorpay",
  "shippingMethod": "standard",
  "items": [
    {
      "productId": "prod_1",
      "variantId": "var_1",
      "quantity": 2,
      "priceCents": 49900,
      "name": "Golden Earrings",
      "image": "/path/to/image.jpg"
    }
  ],
  "totalCents": 99800,
  "shippingCents": 9900,
  "taxCents": 0,
  "notes": "Gift wrap"
}
```

**Response:**

```json
{
  "success": true,
  "order": {
    "id": "order_id",
    "orderNumber": "LVI-123ABC-XY12",
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "items": [...],
    "tracking": [...]
  },
  "message": "Order created, please complete payment"
}
```

---

### 4. Get User Orders

**Endpoint:** `GET /api/orders/create`

**Purpose:** Fetch all orders for logged-in user

**Response:**

```json
{
  "orders": [
    {
      "id": "order_1",
      "orderNumber": "LVI-123ABC-XY12",
      "status": "DELIVERED",
      "paymentStatus": "COMPLETED",
      "totalCents": 109700,
      "createdAt": "2025-10-26T10:30:00Z",
      "items": [...],
      "tracking": [...]
    }
  ]
}
```

---

## 🛒 Checkout Integration

### Payment Methods

1. **Cash on Delivery (COD)**

   - Direct order creation
   - Order status: PROCESSING
   - Payment status: COMPLETED
   - No payment gateway needed

2. **Razorpay (Online)**
   - Create order first (status: PENDING)
   - Show Razorpay payment gateway
   - On success: verify payment
   - Update order (status: PROCESSING)

### Checkout Flow (Razorpay)

```javascript
// 1. Create order in DB
const orderResponse = await fetch("/api/orders/create", {
  method: "POST",
  body: JSON.stringify(orderData),
});

const { order } = await orderResponse.json();

// 2. If Razorpay payment, create Razorpay order
const paymentResponse = await fetch("/api/payment/create-order", {
  method: "POST",
  body: JSON.stringify({
    amountCents: grandTotal,
  }),
});

const { orderId, keyId } = await paymentResponse.json();

// 3. Show Razorpay payment gateway
const options = {
  key: keyId,
  amount: grandTotal,
  currency: "INR",
  name: "Lavish India",
  description: `Order #${order.orderNumber}`,
  order_id: orderId,
  handler: async (response) => {
    // 4. Verify payment
    await fetch("/api/payment/verify", {
      method: "POST",
      body: JSON.stringify({
        ...response,
        orderId: order.id,
      }),
    });

    // 5. Redirect to success page
    router.push(`/order-success?order=${order.orderNumber}`);
  },
  modal: {
    ondismiss: () => {
      router.push(`/order-failed?order=${order.orderNumber}`);
    },
  },
};

const razorpay = new Razorpay(options);
razorpay.open();
```

---

## 📦 Order Tracking System

### Tracking Events

1. **Order placed** - Initial order creation
2. **Payment confirmed** - Payment verified (Razorpay) or COD confirmed
3. **Processing** - Order being prepared
4. **Packed** - Order packed and ready
5. **Shipped** - Order dispatched (tracking number added)
6. **Out for delivery** - With delivery partner
7. **Delivered** - Successfully delivered

### Adding Tracking Updates

```javascript
await prisma.orderTracking.create({
  data: {
    orderId: "order_id",
    status: "Shipped",
    location: "Mumbai Distribution Center",
    description: "Package dispatched via BlueDart",
    updatedBy: "admin_id",
  },
});
```

---

## 🎨 Order Success/Failed Pages

### Order Success Page

**Route:** `/order-success?order=LVI-123ABC-XY12`

**Display:**

- ✅ Success message
- Order number
- Order summary
- Expected delivery date
- Track order button
- Continue shopping button

### Order Failed Page

**Route:** `/order-failed?order=LVI-123ABC-XY12`

**Display:**

- ❌ Failure message
- Reason for failure
- Retry payment button (if order exists)
- Contact support
- Return to cart

---

## 🔐 Security Considerations

### Payment Signature Verification

```javascript
const generatedSignature = crypto
  .createHmac("sha256", RAZORPAY_KEY_SECRET)
  .update(`${order_id}|${payment_id}`)
  .digest("hex");

if (generatedSignature !== razorpay_signature) {
  throw new Error("Invalid signature");
}
```

### Important Points

1. **Never expose KEY_SECRET** on frontend
2. **Always verify** payment signature on backend
3. **Use HTTPS** in production
4. **Validate amounts** on backend before payment
5. **Log all transactions** for audit trail
6. **Handle edge cases:**
   - Payment successful but verification failed
   - Network timeouts
   - Duplicate payment attempts

---

## 🧪 Testing

### Test Razorpay Credentials

```env
RAZORPAY_KEY_ID=rzp_test_RXrT0aV7iVRiCU
RAZORPAY_KEY_SECRET=rzp_test_RXrT0aV7iVRiCU
```

### Test Cards (Razorpay Test Mode)

**Success:**

- Card: 4111 1111 1111 1111
- CVV: Any 3 digits
- Expiry: Any future date

**Failure:**

- Card: 4000 0000 0000 0002
- Will trigger payment failure

### UPI Test

- VPA: success@razorpay
- Will auto-succeed in test mode

---

## 📱 Frontend Integration

### Install Razorpay Script

```tsx
useEffect(() => {
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.async = true;
  document.body.appendChild(script);
}, []);
```

### TypeScript Declarations

```typescript
declare global {
  interface Window {
    Razorpay: any;
  }
}
```

---

## 🎯 Next Steps

1. ✅ Database models created
2. ✅ Payment APIs implemented
3. ✅ Order creation API ready
4. 🚧 Update checkout page with Razorpay
5. 🚧 Create order success/failed pages
6. 🚧 Build user orders page with tracking
7. 🚧 Admin order management dashboard

---

## 📊 Admin Features

### Order Management

- View all orders
- Filter by status, payment method, date
- Update order status
- Add tracking updates
- Process refunds
- Export orders to CSV

### Tracking Updates

Admin can add tracking updates:

- Status change
- Location update
- Add notes/description
- Estimated delivery date
- Courier tracking number

---

## 🔄 Refund Process

1. Admin initiates refund
2. System updates payment status to REFUNDED
3. Order status changes to REFUNDED
4. Tracking entry added
5. Customer notified (future: email)

```javascript
await prisma.$transaction([
  prisma.payment.update({
    where: { orderId },
    data: { status: "REFUNDED" },
  }),
  prisma.order.update({
    where: { id: orderId },
    data: { status: "REFUNDED" },
  }),
  prisma.orderTracking.create({
    data: {
      orderId,
      status: "Refunded",
      description: "Order refunded successfully",
      updatedBy: adminId,
    },
  }),
]);
```

---

## ✅ Summary

**Implemented:**

- ✅ Payment & OrderTracking models
- ✅ Razorpay integration APIs
- ✅ Order creation with transaction safety
- ✅ Payment verification system
- ✅ COD support
- ✅ Order tracking infrastructure

**Ready to Build:**

- 🎨 Updated checkout page
- 📄 Order success/failure pages
- 📦 User order history page
- 👨‍💼 Admin order management

The foundation is solid and production-ready! 🚀
