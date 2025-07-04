import { Cart } from "../models/cart.js";
import { Order } from "../models/order.js";
import { Product } from "../models/product.js";
import sendOrderConfirmation from "../utils/sendOrderConfirmation.js";
import TryCatch from "../utils/Trycatch.js";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

export const newOrderCod = TryCatch(async (req, res) => {
  const { method, phone, address } = req.body;

  const cart = await Cart.find({ user: req.user._id }).populate({
    path: "product",
    select: "title price",
  });

  if (!cart.length)
    return res.status(400).json({
      message: "Cart is empty",
    });

  let subTotal = 0;

  const items = cart.map((i) => {
    const itemSubTotal = i.product.price * i.quantity;

    subTotal += itemSubTotal;

    return {
      product: i.product._id,
      name: i.product.title,
      price: i.product.price,
      quantity: i.quantity,
    };
  });

  const order = await Order.create({
    items,
    method,
    user: req.user._id,
    phone,
    address,
    subTotal,
  });

  for (let i of order.items) {
    const product = await Product.findById(i.product);

    if (product) {
      product.stock -= i.quantity;
      product.sold += i.quantity;

      await product.save();
    }
  }

  await Cart.deleteMany({
    user: req.user._id,
  });

  await sendOrderConfirmation({
    email: req.user.email,
    subject: "Order Confirmation",
    orderId: order._id,
    products: items,
    totalAmount: subTotal,
  });

  res.json({
    message: "Order created successfully",
    order,
  });
});

export const getAllOrders = TryCatch(async (req, res) => {
  const orders = await Order.find({ user: req.user._id });

  res.json({ orders: orders.reverse() });
});

export const getAlllOrdersAdmin = TryCatch(async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "You are not admin",
    });
  }

  const orders = await Order.find().populate("user").sort({ createdAt: -1 });

  res.json(orders);
});

export const getMyOrder = TryCatch(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("items.product")
    .populate("user");

  res.json(order);
});

export const updateStatus = TryCatch(async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "You are not admin",
    });
  }

  const order = await Order.findById(req.params.id);

  const { status } = req.body;

  order.status = status;

  await order.save();

  res.json({
    message: "Order status updated",
    order,
  });
});

export const getStats = TryCatch(async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "You are not admin",
    });
  }

  const cod = await Order.find({ method: "cod" }).countDocuments();
  const online = await Order.find({ method: "online" }).countDocuments();

  const products = await Product.find();

  const data = products.map((prod) => ({
    name: prod.title,
    sold: prod.sold,
  }));

  res.json({
    cod,
    online,
    data,
  });
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const newOrderOnline = async (req, res) => {
  try {
    const { method, phone, address } = req.body;

    const cart = await Cart.find({ user: req.user._id }).populate("product");

    if (!cart.length) {
      return (
        res.status(400),
        json({
          message: "Cart is empty",
        })
      );
    }

    const subTotal = cart.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );

    const lineItems = cart.map((item) => ({
      price_data: {
        currency: "inr",
        product_data: {
          name: item.product.title,
          images: [item.product.images[0].url],
        },
        unit_amount: Math.round(item.product.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/ordersuccess?session_id= {CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cart`,
      metadata: {
        userId: req.user._id.toString(),
        method,
        phone,
        address,
        subTotal,
      },
    });

    res.json({
      url: session.url,
    });
  } catch (error) {
    console.log("Error creating stripe session", error.message);
    res.status(500).json({
      message: "Failed to create payment session",
    });
  }
};

export const verifyPayment = async (req, res) => {
  const { sessionId } = req.body;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const { userId, method, phone, address, subTotal } = session.metadata;

    const cart = await Cart.find({ user: userId }).populate("product");

    const items = cart.map((i) => {
      return {
        product: i.product._id,
        name: i.product.title,
        price: i.product.price,
        quantity: i.product.quantity,
      };
    });

    if (cart.length === 0) {
      return res.status(400).json({
        message: "Cart is empty",
      });
    }
    const existingOrder = await Order.findOne({ paymentInfo: sessionId });
    if (!existingOrder) {
      const order = await Order.create({
        items: cart.map((item) => ({
          product: item.product._id,
          quantity: item.quantity,
        })),
        method,
        user: userId,
        phone,
        address,
        subTotal,
        paidAt: new Date(),
        paymentInfo: sessionId,
      });

      for (let i of order.items) {
        const product = await Product.findById(i.product);

        if (product) {
          product.stock -= i.quantity;
          product.sold += i.quantity;

          await product.save();
        }
      }

      await Cart.deleteMany({
        user: req.user._id,
      });

      await sendOrderConfirmation({
        email: req.user.email,
        subject: "Order Confirmation",
        orderId: order._id,
        products: items,
        totalAmount: subTotal,
      });

      return res.status(201).json({
        success: true,
        message: "Order created successfully",
        order,
      });
    }
  } catch (error) {
    console.log("Error verifying payment", error.message);
    res.status(500).json({
      message: error.message,
    });
  }
};
