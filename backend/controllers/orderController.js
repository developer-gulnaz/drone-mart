const crypto = require("crypto");
const Order = require("../models/Order");
const User = require("../models/User");
const Payment = require("../models/Payment");
const Cart = require("../models/Cart");
const mongoose = require("mongoose");

// PayU Config
const PAYU_KEY = process.env.PAYU_KEY;
const PAYU_SALT = process.env.PAYU_SALT;
const PAYU_BASE_URL = "https://test.payu.in/_payment";


async function removePurchasedItems(userId, purchasedItems) {
    // Get user's cart
    const cart = await Cart.findOne({ user: userId });
    if (!cart) return;

    // Filter out purchased products
    cart.items = cart.items.filter(cartItem =>
        !purchasedItems.some(p => p.product.toString() === cartItem.product.toString())
    );

    await cart.save();
}

// ------------------- COD Order -------------------
exports.createCodOrder = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const { items, totalAmount } = req.body;
        if (!items || items.length === 0)
            return res.status(400).json({ message: "Cart is empty" });

        // Create new order with professional statuses
        const order = new Order({
            user: userId,
            items: items.map((p) => ({
                product: p.product,
                title: p.title,
                image: p.image,
                price: p.price,
                quantity: p.quantity || 1,
            })),
            total: totalAmount,
            paymentMethod: "COD",
            orderStatus: "initiated",      // Newly placed order
            paymentStatus: "pending",      // COD not collected yet
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const created = await order.save();

        // Remove purchased items from cart
        await removePurchasedItems(userId, items);

        res.status(201).json({
            message: "COD Order placed successfully",
            orderId: created._id,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
        });
    } catch (err) {
        console.error("COD Order Error:", err);
        res.status(500).json({ message: "Failed to create COD order" });
    }
};

// ---------------- PayU Initiate ----------------
exports.initiatePayuPayment = async (req, res) => {
    try {
        const { items, totalAmount, productinfo, firstname, email, phone } = req.body;
        const userId = req.session.userId;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const txnid = "txn" + Date.now();
        const payuKey = process.env.PAYU_KEY;
        const payuSalt = process.env.PAYU_SALT;
        const amount = totalAmount.toFixed(2);

        // 1️⃣ Create order in DB
        const order = new Order({
            user: userId,
            items: items.map((p) => ({
                product: p.product,
                title: p.title,
                image: p.image,
                price: p.price,
                quantity: p.quantity || 1,
            })),
            paymentMethod: "PayU",
            total: totalAmount,
            status: "initiated",
            paymentStatus: "initiated",
        });
        await order.save();

        // 2️⃣ Create payment record
        const payment = new Payment({
            order: order._id,
            user: userId,
            method: "PayU",
            status: "initiated",
            amount: totalAmount,
            txnid,
            productinfo
        });
        await payment.save();

        // 3️⃣ Hash calculation
        const udf1 = order._id.toString();
        const udf2 = "";
        const udf3 = "";
        const udf4 = "";
        const udf5 = "";

        // ✅ Correct formula
        const hashString = `${payuKey}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${payuSalt}`;
        const hash = crypto.createHash("sha512").update(hashString).digest("hex");

        // 4️⃣ PayU form
        const payuForm = `
      <form id="payuForm" method="post" action="https://test.payu.in/_payment">
        <input type="hidden" name="key" value="${payuKey}" />
        <input type="hidden" name="txnid" value="${txnid}" />
        <input type="hidden" name="amount" value="${amount}" />
        <input type="hidden" name="productinfo" value="${productinfo}" />
        <input type="hidden" name="firstname" value="${firstname}" />
        <input type="hidden" name="email" value="${email}" />
        <input type="hidden" name="phone" value="${phone}" />
        <input type="hidden" name="surl" value="${process.env.PAYU_SUCCESS_URL}" />
        <input type="hidden" name="furl" value="${process.env.PAYU_FAILURE_URL}" />
        <input type="hidden" name="hash" value="${hash}" />
        <input type="hidden" name="udf1" value="${udf1}" />
        <input type="hidden" name="udf2" value="${udf2}" />
        <input type="hidden" name="udf3" value="${udf3}" />
        <input type="hidden" name="udf4" value="${udf4}" />
        <input type="hidden" name="udf5" value="${udf5}" />
      </form>
    `;

        res.json({ payuForm });
    } catch (err) {
        console.error("PayU Initiate Error:", err);
        res.status(500).json({ message: "PayU initiation failed" });
    }
};


// ---------------- PayU Success ----------------
exports.payuSuccess = async (req, res) => {
    try {
        const { udf1, status, txnid, mihpayid, mode, bank_ref_num, productinfo } = req.body;
        const orderId = udf1;
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).send("Order not found");

        // Only update if online payment
        if (order.paymentMethod !== "COD") {
            order.paymentStatus = status === "success" ? "paid" : "failed";
            order.orderStatus = status === "success" ? "processing" : "initiated";
            order.updatedAt = new Date();
            await order.save();

            // Update Payment record
            const payment = await Payment.findOne({ order: orderId, txnid });
            if (payment) {
                payment.status = order.paymentStatus;
                payment.mihpayid = mihpayid;
                payment.mode = mode;
                payment.bank_ref_num = bank_ref_num;
                payment.productinfo = productinfo;
                payment.rawResponse = req.body;
                payment.updatedAt = new Date();
                await payment.save();
            }

            if (status === "success") {
                await removePurchasedItems(order.user, order.items);
            }
        }

        res.redirect(`/order-details.html?orderId=${order._id}`);
    } catch (err) {
        console.error("PayU Success Error:", err);
        res.status(500).send("PayU success handling failed");
    }
};


// ---------------- PayU Failure ----------------
exports.payuFailure = async (req, res) => {
    try {
        const { udf1, status, txnid, mihpayid, mode, bank_ref_num, productinfo } = req.body;
        const orderId = udf1;
        const order = await Order.findById(orderId);
        if (order && order.paymentMethod !== "COD") {
            order.paymentStatus = "failed";
            order.orderStatus = "initiated"; // reset to initial
            order.updatedAt = new Date();
            await order.save();
        }

        const payment = await Payment.findOne({ order: orderId, txnid });
        if (payment) {
            payment.status = "failed";
            payment.mihpayid = mihpayid;
            payment.mode = mode;
            payment.bank_ref_num = bank_ref_num;
            payment.productinfo = productinfo;
            payment.rawResponse = req.body;
            payment.updatedAt = new Date();
            await payment.save();
        }

        res.redirect(`/order-details.html?orderId=${orderId}`);
    } catch (err) {
        console.error("PayU Failure Error:", err);
        res.status(500).send("PayU failure handling failed");
    }
};
