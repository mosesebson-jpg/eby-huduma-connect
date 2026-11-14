
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const cfg = window.EBY_CONFIG || {};

  let supabaseClient = null;
  let authMode = "login";
  let currentUser = null;

  const AD_BUCKET = "advertisement-images";

  const AD_PRICES = {
    "7": 5000,
    "14": 8000,
    "30": 15000,
    "featured": 25000
  };

  const PAYMENT_NUMBERS = {
    tigo: "22 121 530",
    airtel: "130317855",
    vodacom: "68278229"
  };

  const toast = (message) => {
    const el = $("toast");
    if (!el) return;

    el.textContent = message;
    el.classList.add("show");

    window.setTimeout(() => {
      el.classList.remove("show");
    }, 3500);
  };

  const configured = () =>
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("WEKA_") &&
    !cfg.SUPABASE_ANON_KEY.includes("WEKA_");

  if (configured() && window.supabase?.createClient) {
    supabaseClient = window.supabase.createClient(
      cfg.SUPABASE_URL,
      cfg.SUPABASE_ANON_KEY
    );
  }

  const showDialog = (id) => {
    const dialog = $(id);
    if (dialog && !dialog.open) dialog.showModal();
  };

  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dialog = $(btn.dataset.close);
      if (dialog?.open) dialog.close();
    });
  });

  $("menuBtn")?.addEventListener("click", () => {
    $("nav")?.classList.toggle("open");
  });

  $("year").textContent = new Date().getFullYear();

  // =====================================
  // AUTHENTICATION
  // =====================================

  function updateAuthIdentifier() {
    const method = $("authMethod").value;
    const isPhone = method === "phone";

    $("identifierLabel").childNodes[0].textContent =
      isPhone ? "Namba ya simu" : "Barua pepe";

    $("identifier").type = isPhone ? "tel" : "email";
    $("identifier").autocomplete = isPhone ? "tel" : "email";

    $("identifier").placeholder =
      isPhone ? "+2557XXXXXXXX" : "barua@mfano.com";

    $("identifierHint").textContent = isPhone
      ? "Tumia mfumo wa kimataifa, mfano +255712345678. SMS Auth lazima iwe imewashwa."
      : "Tumia barua pepe unayoweza kuifikia.";
  }

  $("authMethod").addEventListener("change", updateAuthIdentifier);
  updateAuthIdentifier();

  function setAuthMode(mode) {
    authMode = mode;
    const signup = mode === "signup";

    $("authTitle").textContent = signup
      ? "Tengeneza akaunti"
      : "Ingia kwenye akaunti";

    $("nameWrap").classList.toggle("hidden", !signup);
    $("authSubmit").textContent = signup ? "Jisajili" : "Ingia";

    $("loginTab").classList.toggle("active", !signup);
    $("signupTab").classList.toggle("active", signup);

    $("authMessage").textContent = "";
  }

  $("providerOpen").addEventListener("click", () => {
    showDialog("providerDialog");
  });

  $("providerOpen2").addEventListener("click", () => {
    showDialog("providerDialog");
  });

  $("loginTab").addEventListener("click", () => setAuthMode("login"));
  $("signupTab").addEventListener("click", () => setAuthMode("signup"));

  // =====================================
  // ACCOUNT MENU
  // =====================================

  const accountMenu = document.createElement("div");

  accountMenu.id = "ebyAccountMenu";
  accountMenu.hidden = true;

  accountMenu.style.cssText =
    "position:absolute;z-index:9999;right:16px;top:72px;min-width:240px;max-width:calc(100vw - 32px);padding:16px;background:#fff;color:#172b45;border:1px solid #dce5ef;border-radius:16px;box-shadow:0 12px 35px rgba(0,0,0,.18)";

  accountMenu.innerHTML = `
    <p id="ebyAccountStatus" style="margin:0 0 12px;font-weight:700;overflow-wrap:anywhere"></p>
    <button type="button" id="ebyStaySignedIn" style="width:100%;padding:12px;border:0;border-radius:10px;background:#eaf3ff;color:#07518b;font-weight:700;margin-bottom:8px">
      Endelea kubaki umeingia
    </button>
    <button type="button" id="ebySignOut" style="width:100%;padding:12px;border:0;border-radius:10px;background:#07518b;color:#fff;font-weight:700">
      Toka kwenye akaunti
    </button>`;

  document.body.appendChild(accountMenu);

  function setAccountButton(user) {
    currentUser = user || null;

    const button = $("authOpen");
    if (!button) return;

    button.textContent = user ? "Akaunti yangu" : "Ingia / Jisajili";

    button.onclick = () => {
      if (!currentUser) {
        setAuthMode("login");
        showDialog("authDialog");
        return;
      }

      $("ebyAccountStatus").textContent =
        `Umeingia: ${currentUser.email || currentUser.phone || "Akaunti yako"}`;

      accountMenu.hidden = !accountMenu.hidden;
    };
  }

  $("ebyStaySignedIn").addEventListener("click", () => {
    accountMenu.hidden = true;
    toast("Utaendelea kubaki umeingia.");
  });

  $("ebySignOut").addEventListener("click", async () => {
    if (!supabaseClient) return;

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      toast(error.message || "Imeshindikana kutoka kwenye akaunti.");
      return;
    }

    accountMenu.hidden = true;
    setAccountButton(null);

    toast("Umetoka kwenye akaunti.");
  });

  document.addEventListener("click", (event) => {
    if (
      !accountMenu.hidden &&
      !accountMenu.contains(event.target) &&
      event.target !== $("authOpen")
    ) {
      accountMenu.hidden = true;
    }
  });

  async function refreshSession() {
    if (!supabaseClient) {
      setAccountButton(null);
      return;
    }

    const { data, error } = await supabaseClient.auth.getSession();

    setAccountButton(error ? null : data.session?.user || null);
  }

  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      setAccountButton(session?.user || null);
    });
  }

  // =====================================
  // LOGIN AND SIGNUP
  // =====================================

  $("authForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!supabaseClient) {
      $("authMessage").textContent =
        "Kwanza unganisha Supabase kwenye config.js.";
      return;
    }

    const method = $("authMethod").value;
    const identifier = $("identifier").value.trim();
    const password = $("password").value;
    const button = $("authSubmit");

    if (method === "phone" && !/^\+[1-9]\d{7,14}$/.test(identifier)) {
      $("authMessage").textContent =
        "Weka namba kwa mfumo wa kimataifa, mfano +255712345678.";
      return;
    }

    button.disabled = true;

    try {
      const credentials = method === "phone"
        ? { phone: identifier, password }
        : { email: identifier, password };

      let result;

      if (authMode === "signup") {
        result = await supabaseClient.auth.signUp({
          ...credentials,
          options: {
            data: {
              full_name: $("fullName").value.trim()
            }
          }
        });
      } else {
        result = await supabaseClient.auth.signInWithPassword(credentials);
      }

      if (result.error) throw result.error;

      $("authMessage").textContent = authMode === "signup"
        ? "Ombi la usajili limetumwa. Angalia barua pepe au ujumbe wa uthibitishaji."
        : "Umeingia kikamilifu.";

      await refreshSession();

      if (authMode === "login") {
        $("authDialog").close();
        toast("Karibu tena EBY HUDUMA CONNECT.");
      } else if (result.data.session) {
        $("authDialog").close();
        toast("Akaunti imetengenezwa.");
      }

    } catch (error) {
      $("authMessage").textContent =
        error.message || "Imeshindikana. Jaribu tena.";
    } finally {
      button.disabled = false;
    }
  });

  // =====================================
  // BUSINESS REGISTRATION
  // =====================================

  $("businessForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!supabaseClient) {
      $("businessMessage").textContent =
        "Kwanza unganisha Supabase kwenye config.js.";
      return;
    }

    const { data: sessionData } =
      await supabaseClient.auth.getSession();

    const user = sessionData.session?.user;

    if (!user) {
      $("businessMessage").textContent =
        "Tafadhali ingia au jisajili kwanza.";
      showDialog("authDialog");
      return;
    }

    const button = $("businessForm").querySelector('button[type="submit"]');
    button.disabled = true;

    const payload = {
      owner_id: user.id,
      name: $("businessName").value.trim(),
      category: $("businessCategory").value,
      phone: $("businessPhone").value.trim() || null,
      region: $("businessRegion").value.trim(),
      district: $("businessDistrict").value.trim() || null,
      description: $("businessDescription").value.trim() || null,
      status: "pending",
      is_verified: false
    };

    try {
      const { error } = await supabaseClient
        .from("businesses")
        .insert(payload);

      if (error) throw error;

      $("businessMessage").textContent =
        "Ombi lako limepokelewa na litasubiri ukaguzi.";

      $("businessForm").reset();
      toast("Usajili wa biashara umetumwa.");

    } catch (error) {
      $("businessMessage").textContent =
        error.message || "Imeshindikana kutuma ombi.";
    } finally {
      button.disabled = false;
    }
  });

  // =====================================
  // LOAD BUSINESSES
  // =====================================

  async function loadBusinesses(search = "", category = "") {
    const list = $("businessList");

    if (!supabaseClient) {
      $("businessCount").textContent = "Database haijaunganishwa";
      list.innerHTML =
        '<div class="empty">Unganisha Supabase ili kuonyesha biashara zilizoidhinishwa.</div>';
      return;
    }

    let query = supabaseClient
      .from("businesses")
      .select("id,name,description,category,phone,whatsapp,region,district,is_verified")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(30);

    if (category) query = query.ilike("category", category);

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,description.ilike.%${search}%,region.ilike.%${search}%,district.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      $("businessCount").textContent = "Hitilafu ya kupakia";
      list.innerHTML =
        '<div class="empty">Imeshindikana kupakia taarifa za biashara.</div>';
      return;
    }

    $("businessCount").textContent = `${data.length} biashara`;
    list.innerHTML = "";

    if (!data.length) {
      list.innerHTML =
        '<div class="empty">Bado hakuna biashara zilizoidhinishwa kwenye kundi hili.</div>';
      return;
    }

    data.forEach((item) => {
      const card = document.createElement("article");
      card.className = "business-card";

      const title = document.createElement("h3");
      title.textContent = item.name;

      const categoryEl = document.createElement("span");
      categoryEl.className = "pill";
      categoryEl.textContent = item.category || "Huduma";

      const desc = document.createElement("p");
      desc.textContent =
        item.description || "Wasiliana na mtoa huduma kupata maelezo zaidi.";

      const place = document.createElement("small");
      place.textContent =
        [item.district, item.region].filter(Boolean).join(", ");

      card.append(categoryEl, title, desc, place);

      const contact = item.whatsapp || item.phone;

      if (contact) {
        const link = document.createElement("a");
        link.className = "contact-link";
        link.textContent = "Wasiliana";

        const digits = contact.replace(/\D/g, "");

        link.href = item.whatsapp
          ? `https://wa.me/${digits}`
          : `tel:${contact}`;

        link.target = item.whatsapp ? "_blank" : "_self";
        link.rel = "noopener";

        card.append(link);
      }

      if (item.is_verified) {
        const verified = document.createElement("small");
        verified.className = "verified";
        verified.textContent = "✓ Imethibitishwa";
        card.append(verified);
      }

      list.append(card);
    });
  }

  $("searchForm").addEventListener("submit", (event) => {
    event.preventDefault();

    loadBusinesses(
      $("searchInput").value.trim(),
      $("categoryFilter").value
    );
  });

  // =====================================
  // ADVERTISEMENT PRICE DISPLAY
  // =====================================

  function selectedAdPrice() {
    const plan = $("advertisementPlan").value;
    return AD_PRICES[plan] || 0;
  }

  function updatePaymentInstructions() {
    const method = $("advertisementPaymentMethod").value;
    const number = PAYMENT_NUMBERS[method];

    const box = document.querySelector(".ad-payment");
    if (!box) return;

    if (!method || !number) return;

    const amount = selectedAdPrice();

    const labels = {
      tigo: "Tigo Pesa / Mixx by Yas",
      airtel: "Airtel Money",
      vodacom: "Vodacom M-Pesa"
    };

    box.innerHTML = `
      <strong>MAELEZO YA MALIPO</strong>
      <p>Mtandao: <strong>${labels[method]}</strong></p>
      <p>Lipa Namba: <strong>${number}</strong></p>
      <p>Jina la mpokeaji: <strong>Ebson Sanya</strong></p>
      <p>Kiasi cha kulipa: <strong>TSh ${amount.toLocaleString("en-US")}</strong></p>
      <small>
        Lipa kwenye namba hii kisha jaza taarifa za muamala.
        Hakikisha jina la mpokeaji ni Ebson Sanya.
      </small>
    `;
  }

  $("advertisementPlan").addEventListener(
    "change",
    updatePaymentInstructions
  );

  $("advertisementPaymentMethod").addEventListener(
    "change",
    updatePaymentInstructions
  );

  // =====================================
  // OPEN ADVERTISEMENT FORM
  // =====================================

  $("advertisementOpen").addEventListener("click", async () => {
    if (!supabaseClient) {
      toast("Supabase haijaunganishwa.");
      return;
    }

    const { data } = await supabaseClient.auth.getSession();

    if (!data.session?.user) {
      toast("Ingia kwenye akaunti kwanza.");
      setAuthMode("login");
      showDialog("authDialog");
      return;
    }

    $("advertisementForm").reset();
    $("advertisementMessage").textContent = "";
    updatePaymentInstructions();

    showDialog("advertisementDialog");
  });

  // =====================================
  // SUBMIT ADVERTISEMENT
  // =====================================

  $("advertisementForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = $("advertisementMessage");
    const button = $("advertisementForm").querySelector(
      'button[type="submit"]'
    );

    if (!supabaseClient) {
      message.textContent = "Supabase haijaunganishwa.";
      return;
    }

    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.getSession();

    if (sessionError) {
      message.textContent = sessionError.message;
      return;
    }

    const user = sessionData.session?.user;

    if (!user) {
      message.textContent = "Ingia kwenye akaunti kwanza.";
      showDialog("authDialog");
      return;
    }

    const title = $("advertisementTitle").value.trim();
    const description = $("advertisementDescription").value.trim();
    const file = $("advertisementImage").files[0];
    const plan = $("advertisementPlan").value;
    const paymentMethod = $("advertisementPaymentMethod").value;
    const payerName = $("advertisementPayerName").value.trim();
    const payerPhone = $("advertisementPayerPhone").value.trim();
    const transactionId = $("advertisementTransaction").value.trim();

    if (!title || !description || !file || !plan ||
        !paymentMethod || !payerName || !payerPhone || !transactionId) {
      message.textContent = "Jaza sehemu zote zinazohitajika.";
      return;
    }

    if (!AD_PRICES[plan]) {
      message.textContent = "Chagua muda sahihi wa tangazo.";
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      message.textContent =
        "Tafadhali chagua picha ya JPG, PNG au WEBP.";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      message.textContent =
        "Picha imezidi MB 5. Chagua picha ndogo zaidi.";
      return;
    }

    if (!/^[A-Za-z0-9+\-\s]{7,25}$/.test(payerPhone)) {
      message.textContent =
        "Weka namba sahihi ya simu iliyotumika kulipia.";
      return;
    }

    if (transactionId.length < 4) {
      message.textContent =
        "Weka namba sahihi ya muamala.";
      return;
    }

    const amount = AD_PRICES[plan];

    button.disabled = true;
    button.textContent = "Inatuma tangazo...";

    message.textContent = "Tafadhali subiri, picha inapakiwa.";

    const extension = file.type === "image/jpeg"
      ? "jpg"
      : file.type === "image/png"
        ? "png"
        : "webp";

    const uniqueName =
      `${user.id}/${crypto.randomUUID()}.${extension}`;

    try {
      // Picha inapakiwa kwenye folda ya mtumiaji mwenyewe.
      const { error: uploadError } = await supabaseClient
        .storage
        .from(AD_BUCKET)
        .upload(uniqueName, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabaseClient
        .storage
        .from(AD_BUCKET)
        .getPublicUrl(uniqueName);

      const imageUrl = publicData.publicUrl;

      message.textContent =
        "Picha imepakiwa. Tunahifadhi ombi lako...";

      // Ombi linaingia pending. Halichapishwi moja kwa moja.
      const payload = {
        owner_id: user.id,
        title,
        description,
        image_url: imageUrl,
        target_url: null,
        status: "pending",
        payment_method: paymentMethod,
        payer_name: payerName,
        payer_phone: payerPhone,
        transaction_id: transactionId,
        payment_status: "pending"
      };

      const { error: insertError } = await supabaseClient
        .from("advertisements")
        .insert(payload);

      if (insertError) throw insertError;

      $("advertisementForm").reset();
      message.textContent =
        "Ombi lako limepokelewa. Malipo yanasubiri kuthibitishwa na msimamizi.";

      toast("Tangazo limetumwa kwa ukaguzi.");

      window.setTimeout(() => {
        if ($("advertisementDialog").open) {
          $("advertisementDialog").close();
        }
      }, 3000);

    } catch (error) {
      console.error("Advertisement submission error:", error);

      message.textContent =
        error.message ||
        "Imeshindikana kutuma tangazo. Tafadhali jaribu tena.";

    } finally {
      button.disabled = false;
      button.textContent = "Tuma tangazo kwa ukaguzi";
    }
  });

  // =====================================
  // LOAD APPROVED ADVERTISEMENTS
  // =====================================

  async function loadAdvertisements() {
    const list = $("advertisementList");
    const count = $("advertisementCount");

    if (!supabaseClient) {
      count.textContent = "Database haijaunganishwa";
      return;
    }

    const { data, error } = await supabaseClient
      .from("advertisements")
      .select("id,title,description,image_url,target_url")
      .eq("status", "active")
      .eq("payment_status", "approved")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      count.textContent = "Inasubiri matangazo";
      list.innerHTML =
        '<div class="empty">Matangazo yataonekana baada ya kuidhinishwa.</div>';
      return;
    }

    count.textContent = `${data.length} matangazo`;
    list.innerHTML = "";

    if (!data.length) {
      list.innerHTML =
        '<div class="empty">Bado hakuna matangazo yaliyoidhinishwa.</div>';
      return;
    }

    data.forEach((ad) => {
      const card = document.createElement("article");
      card.className = "business-card";

      const image = document.createElement("img");
      image.src = ad.image_url;
      image.alt = ad.title;
      image.loading = "lazy";
      image.style.cssText =
        "width:100%;height:190px;object-fit:cover;border-radius:12px";

      const title = document.createElement("h3");
      title.textContent = ad.title;

      const description = document.createElement("p");
      description.textContent = ad.description || "";

      card.append(image, title, description);

      if (ad.target_url) {
        const link = document.createElement("a");
        link.href = ad.target_url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "contact-link";
        link.textContent = "Jifunze zaidi";
        card.append(link);
      }

      list.append(card);
    });
  }

  // =====================================
  // INITIAL LOAD
  // =====================================

  if (!configured()) {
    $("businessCount").textContent = "Inasubiri muunganisho";
    $("advertisementCount").textContent = "Inasubiri muunganisho";
  } else {
    loadBusinesses();
    loadAdvertisements();
  }

  refreshSession();

})();
