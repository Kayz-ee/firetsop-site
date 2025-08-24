const supabase = window.supabaseClient;
const $ = (q) => document.querySelector(q);

const grid = $("#productGrid");
const count = $("#cartCount");
const cartEl = $("#cart");
const itemsEl = $("#cartItems");
const totalEl = $("#cartTotal");
const openCartBtn = $("#openCart");
const closeCartBtn = $("#closeCart");
const year = $("#year");
year.textContent = new Date().getFullYear();

let cart = JSON.parse(localStorage.getItem("firestop_cart") || "[]");

function save() { localStorage.setItem("firestop_cart", JSON.stringify(cart)); }
function sum() { return cart.reduce((a,i)=>a+i.price*i.qty,0); }
function qty() { return cart.reduce((a,i)=>a+i.qty,0); }
function redraw() {
  itemsEl.innerHTML = cart.length ? "" : "<p class='muted'>Cart empty.</p>";
  cart.forEach(item=>{
    const row=document.createElement("div");
    row.className="cart__row";
    row.innerHTML=`
      <img src="${item.img}" alt="${item.title}">
      <div>
        <div><strong>${item.title}</strong></div>
        <small>₦${item.price.toLocaleString("en-NG")} × ${item.qty}</small>
      </div>
      <div>
        <button data-dec="${item.id}">−</button>
        <button data-inc="${item.id}">+</button>
        <button data-rem="${item.id}">✕</button>
      </div>`;
    itemsEl.appendChild(row);
  });
  totalEl.textContent = sum().toLocaleString("en-NG");
  count.textContent = qty();
}
redraw();

// Load products from Supabase
(async () => {
  const { data, error } = await supabase.from("products").select("*").eq("is_active", true);
  if(error){ console.error(error); return; }
  data.forEach(p=>{
    const el=document.createElement("article");
    el.className="card";
    el.innerHTML=`
      <img src="${p.img_url}" alt="${p.name}">
      <div class="card__body">
        <h3>${p.name}</h3>
        <div class="price">₦${p.price.toLocaleString("en-NG")}</div>
        <button class="btn" data-add='${JSON.stringify(p)}'>Add</button>
      </div>`;
    grid.appendChild(el);
  });
})();

grid.addEventListener("click",e=>{
  const d=e.target.dataset.add;
  if(!d)return;
  const p=JSON.parse(d);
  const ex=cart.find(x=>x.id===p.id);
  if(ex)ex.qty++; else cart.push({id:p.id,title:p.name,price:p.price,img:p.img_url,qty:1});
  save(); redraw(); cartEl.classList.add("open");
});
itemsEl.addEventListener("click",e=>{
  const inc=e.target.dataset.inc,dec=e.target.dataset.dec,rem=e.target.dataset.rem;
  if(inc){cart.find(x=>x.id===inc).qty++;}
  if(dec){let it=cart.find(x=>x.id===dec); it.qty=Math.max(1,it.qty-1);}
  if(rem){cart=cart.filter(x=>x.id!==rem);}
  save(); redraw();
});
openCartBtn.addEventListener("click",()=>cartEl.classList.add("open"));
closeCartBtn.addEventListener("click",()=>cartEl.classList.remove("open"));

// Checkout
$("#checkoutForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!cart.length){alert("Cart is empty");return;}
  const fd=new FormData(e.target);
  const customer={name:fd.get("name"),email:fd.get("email"),phone:fd.get("phone")};
  const total=sum();

  const { data: order, error } = await supabase.from("orders")
    .insert({ customer_name:customer.name, customer_email:customer.email, customer_phone:customer.phone, items:cart, total })
    .select().single();
  if(error){alert("Error creating order");return;}

  const res=await fetch("/.netlify/functions/init",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ orderId:order.id,email:customer.email,amount:total })
  });
  const init=await res.json();
  if(!init.status){alert("Init failed");return;}

  const handler=PaystackPop.setup({
    key:init.publicKey,email:customer.email,amount:total*100,ref:init.reference,
    callback:async(response)=>{
      const ver=await fetch("/.netlify/functions/verify",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({reference:response.reference,orderId:order.id})
      }).then(r=>r.json());
      if(ver.ok){alert("Payment successful!"); cart=[]; save(); redraw();}
      else alert("Verification failed");
    }
  });
  handler.openIframe();
});
