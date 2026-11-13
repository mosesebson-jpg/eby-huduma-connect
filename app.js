(() => {
  const $ = (id) => document.getElementById(id);
  const cfg = window.EBY_CONFIG || {};
  let supabaseClient = null;
  let authMode = "login";

  const toast = (message) => {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    window.setTimeout(() => el.classList.remove("show"), 3500);
  };

  const configured = () =>
    cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("WEKA_") &&
    !cfg.SUPABASE_ANON_KEY.includes("WEKA_");

  if (configured() && window.supabase?.createClient) {
    supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  const showDialog = (id) => $(id).showModal();
  document.querySelectorAll("[data-close]").forEach(btn =>
    btn.addEventListener("click", () => $(btn.dataset.close).close())
  );
  $("menuBtn").addEventListener("click", () => $("nav").classList.toggle("open"));
  $("year").textContent = new Date().getFullYear();

  function setAuthMode(mode) {
    authMode = mode;
    const signup = mode === "signup";
    $("authTitle").textContent = signup ? "Tengeneza akaunti" : "Ingia kwenye akaunti";
    $("nameWrap").classList.toggle("hidden", !signup);
    $("authSubmit").textContent = signup ? "Jisajili" : "Ingia";
    $("loginTab").classList.toggle("active", !signup);
    $("signupTab").classList.toggle("active", signup);
    $("authMessage").textContent = "";
  }
  $("authOpen").addEventListener("click", () => { setAuthMode("login"); showDialog("authDialog"); });
  $("providerOpen").addEventListener("click", () => showDialog("providerDialog"));
  $("providerOpen2").addEventListener("click", () => showDialog("providerDialog"));
  $("loginTab").addEventListener("click", () => setAuthMode("login"));
  $("signupTab").addEventListener("click", () => setAuthMode("signup"));

  $("authForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabaseClient) {
      $("authMessage").textContent = "Kwanza unganisha Supabase kwa kujaza config.js.";
      return;
    }
    const email = $("email").value.trim();
    const password = $("password").value;
    const button = $("authSubmit");
    button.disabled = true;
    try {
      let result;
      if (authMode === "signup") {
        result = await supabaseClient.auth.signUp({
          email, password,
          options: { data: { full_name: $("fullName").value.trim() } }
        });
      } else {
        result = await supabaseClient.auth.signInWithPassword({ email, password });
      }
      if (result.error) throw result.error;
      $("authMessage").textContent = authMode === "signup"
        ? "Usajili umetumwa. Angalia barua pepe yako ikiwa uthibitishaji wa email umewashwa."
        : "Umeingia kikamilifu.";
      if (authMode === "login") {
        $("authDialog").close();
        await refreshSession();
        toast("Karibu tena EBY HUDUMA CONNECT.");
      }
    } catch (error) {
      $("authMessage").textContent = error.message || "Imeshindikana. Jaribu tena.";
    } finally {
      button.disabled = false;
    }
  });

  async function refreshSession() {
    if (!supabaseClient) return;
    const { data } = await supabaseClient.auth.getSession();
    const user = data.session?.user;
    if (user) {
      $("authOpen").textContent = "Akaunti yangu";
      $("authOpen").onclick = async () => {
        const { error } = await supabaseClient.auth.signOut();
        if (!error) { $("authOpen").textContent = "Ingia / Jisajili"; toast("Umetoka kwenye akaunti."); }
      };
    }
  }

  $("businessForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabaseClient) {
      $("businessMessage").textContent = "Kwanza unganisha Supabase kwa kujaza config.js.";
      return;
    }
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      $("businessMessage").textContent = "Tafadhali ingia au jisajili kwanza.";
      return;
    }
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
      const { error } = await supabaseClient.from("businesses").insert(payload);
      if (error) throw error;
      $("businessMessage").textContent = "Ombi lako limepokelewa na litasubiri ukaguzi.";
      $("businessForm").reset();
      toast("Usajili wa biashara umetumwa.");
    } catch (error) {
      $("businessMessage").textContent = error.message || "Imeshindikana kutuma ombi.";
    }
  });

  async function loadBusinesses(search = "", category = "") {
    const list = $("businessList");
    if (!supabaseClient) {
      $("businessCount").textContent = "Database haijaunganishwa";
      list.innerHTML = '<div class="empty">Unganisha Supabase ili kuonyesha biashara zilizoidhinishwa.</div>';
      return;
    }
    let query = supabaseClient.from("businesses")
      .select("id,name,description,category,phone,whatsapp,region,district,is_verified")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(30);
    if (category) query = query.ilike("category", category);
    if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,region.ilike.%${search}%,district.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) {
      $("businessCount").textContent = "Hitilafu ya kupakia";
      list.innerHTML = '<div class="empty">Imeshindikana kupakia taarifa. Hakiki mipangilio ya Supabase na RLS.</div>';
      return;
    }
    $("businessCount").textContent = `${data.length} biashara`;
    list.innerHTML = "";
    if (!data.length) {
      list.innerHTML = '<div class="empty">Bado hakuna biashara zilizoidhinishwa kwenye kundi hili. Unaweza kusajili biashara yako.</div>';
      return;
    }
    data.forEach(item => {
      const card = document.createElement("article");
      card.className = "business-card";
      const title = document.createElement("h3"); title.textContent = item.name;
      const categoryEl = document.createElement("span"); categoryEl.className = "pill"; categoryEl.textContent = item.category;
      const desc = document.createElement("p"); desc.textContent = item.description || "Wasiliana na mtoa huduma kupata maelezo zaidi.";
      const place = document.createElement("small"); place.textContent = [item.district, item.region].filter(Boolean).join(", ");
      card.append(categoryEl, title, desc, place);
      const contact = item.whatsapp || item.phone;
      if (contact) {
        const link = document.createElement("a");
        link.className = "contact-link"; link.textContent = "Wasiliana";
        const digits = contact.replace(/\D/g, "");
        link.href = item.whatsapp
          ? `https://wa.me/${digits}`
          : `tel:${contact}`;
        link.target = item.whatsapp ? "_blank" : "_self";
        link.rel = "noopener";
        card.append(link);
      }
      if (item.is_verified) {
        const verified = document.createElement("small"); verified.className = "verified"; verified.textContent = "✓ Imethibitishwa";
        card.append(verified);
      }
      list.append(card);
    });
  }

  $("searchForm").addEventListener("submit", (event) => {
    event.preventDefault();
    loadBusinesses($("searchInput").value.trim(), $("categoryFilter").value);
  });

  if (!configured()) {
    $("businessCount").textContent = "Inasubiri muunganisho";
  } else {
    loadBusinesses();
  }
  refreshSession();
})();
