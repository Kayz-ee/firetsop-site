import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

export const handler = async (event) => {
  try {
    const { reference, orderId } = JSON.parse(event.body || "{}");
    if (!reference || !orderId) return { statusCode: 400, body: "Bad input" };

    const resp = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET}` }
    });
    const data = await resp.json();
    const ok = data.status && data.data && data.data.status === "success";

    await supabase.from("orders").update({
      status: ok ? "paid" : "failed", paystack_ref: reference
    }).eq("id", orderId);

    return { statusCode: 200, body: JSON.stringify({ ok }) };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
