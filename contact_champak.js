(function () {
  "use strict";

  const ppp_CONFIG = {
    name: "Champak Roy",
    phone: "919335874326",
    whatsapp: "919335874326",
    upi: "champaksworld-2@oksbi",
    whatsappGroup: "https://chat.whatsapp.com/CLCBRoi5AuB816tQ86hpQb?mode=gi_t"
  };

  const ppp_IMAGES = {
    avatar: "https://programmer-s-picnic.github.io/json-images/mee.jpg",
    qr: "https://programmer-s-picnic.github.io/json-images/qr.jpeg"
  };

  function ppp_createStyles() {
    if (document.getElementById("ppp_contact_style")) return;

    const style = document.createElement("style");
    style.id = "ppp_contact_style";

    style.textContent = `
      .ppp_contact_box{
        position:fixed;
        right:16px;
        bottom:16px;
        width:320px;
        max-width:95vw;
        background:#fff7ed;
        border:1px solid rgba(245,158,11,.5);
        border-radius:18px;
        padding:14px;
        box-shadow:0 18px 40px rgba(0,0,0,.2);
        font-family:Arial,sans-serif;
        z-index:99999;
      }

      .ppp_contact_header{
        display:flex;
        align-items:center;
        gap:10px;
        margin-bottom:10px;
      }

      .ppp_contact_avatar{
        width:44px;
        height:44px;
        border-radius:50%;
        object-fit:cover;
        border:2px solid #fff;
        box-shadow:0 0 0 3px rgba(245,158,11,.3);
      }

      .ppp_contact_name{
        font-weight:800;
        font-size:16px;
        color:#7c2d12;
      }

      .ppp_contact_qr{
        width:100%;
        border-radius:12px;
        margin:8px 0;
      }

      .ppp_contact_upi{
        font-size:12px;
        text-align:center;
        color:#6b7280;
        margin-bottom:10px;
      }

      .ppp_contact_btn{
        display:block;
        width:100%;
        margin:6px 0;
        padding:10px;
        border:none;
        border-radius:10px;
        font-weight:700;
        cursor:pointer;
      }

      .ppp_contact_call{
        background:#f59e0b;
        color:#fff;
      }

      .ppp_contact_wa{
        background:#25D366;
        color:#fff;
      }

      .ppp_contact_group{
        background:#1d4ed8;
        color:#fff;
      }

      .ppp_contact_toggle{
        position:fixed;
        right:16px;
        bottom:16px;
        background:#d97706;
        color:#fff;
        border:none;
        border-radius:50%;
        width:52px;
        height:52px;
        font-size:22px;
        cursor:pointer;
        z-index:100000;
      }
    `;

    document.head.appendChild(style);
  }

  function ppp_render() {
    ppp_createStyles();

    const ppp_box = document.createElement("div");
    ppp_box.className = "ppp_contact_box";
    ppp_box.style.display = "none";

    ppp_box.innerHTML = `
      <div class="ppp_contact_header">
        <img class="ppp_contact_avatar" src="${ppp_IMAGES.avatar}" />
        <div class="ppp_contact_name">${ppp_CONFIG.name}</div>
      </div>

      <img class="ppp_contact_qr" src="${ppp_IMAGES.qr}" />

      <div class="ppp_contact_upi">UPI: ${ppp_CONFIG.upi}</div>

      <button class="ppp_contact_btn ppp_contact_call">📞 Call</button>
      <button class="ppp_contact_btn ppp_contact_wa">💬 WhatsApp</button>
      <button class="ppp_contact_btn ppp_contact_group">👥 Join WhatsApp Group</button>
    `;

    document.body.appendChild(ppp_box);

    const ppp_toggle = document.createElement("button");
    ppp_toggle.className = "ppp_contact_toggle";
    ppp_toggle.innerHTML = "☎";

    document.body.appendChild(ppp_toggle);

    let ppp_open = false;

    ppp_toggle.onclick = () => {
      ppp_open = !ppp_open;
      ppp_box.style.display = ppp_open ? "block" : "none";
    };

    ppp_box.querySelector(".ppp_contact_call").onclick = () => {
      window.location.href = `tel:${ppp_CONFIG.phone}`;
    };

    ppp_box.querySelector(".ppp_contact_wa").onclick = () => {
      window.open(
        `https://wa.me/${ppp_CONFIG.whatsapp}?text=Hi Champak Roy, I am interested in your course.`,
        "_blank"
      );
    };

    ppp_box.querySelector(".ppp_contact_group").onclick = () => {
      window.open(ppp_CONFIG.whatsappGroup, "_blank");
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ppp_render);
  } else {
    ppp_render();
  }
})();