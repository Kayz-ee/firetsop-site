export const handler = async (event) => {
  try {
    const { orderId, email, amount } = JSON.parse(event.body || "{}");
    if (!orderId || !email || !amount) return { statusCode: 400, body: "Bad input" };

    const resp = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, amount: amount * 100, metadata: { orderId } })
    });
    const data = await resp.json();
    if (!data.status) return { statusCode: 400, body: JSON.stringify(data) };

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: true,
        reference: data.data.reference,
        publicKey: process.env.PAYSTACK_PUBLIC
      })
    };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
