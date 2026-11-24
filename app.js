(() => {
"use strict";

const $ = id => document.getElementById(id);
const cfg = window.EBY_CONFIG || {};

let sb = null;
let currentUser = null;
let currentIsAdmin = false;
let authMode = "login";
let viewerItems = [];
let viewerIndex = 0;
let touchStartX = 0;

const AD_BUCKET = "advertisement-images";
const PHOTO_BUCKET = "public-photos";

const AD_PRICES = {
  "7": 5000,
  "14": 8000,
  "30": 15000,
  "featured": 25000
};

const configured = () =>
  cfg.SUPABASE_URL &&
  cfg.SUPABASE_ANON_KEY &&
  !cfg.SUPABASE_URL.includes("WEKA_") &&
  !cfg.SUPABASE_ANON_KEY.includes("WEKA_");

if (configured() && window.supabase?.createClient) {
  sb = window.supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_ANON_KEY
  );
}

const toast = message => {
  const el = $("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3500);
};

const showDialog = id => {
  const dialog = $(id);
  if (dialog && !dialog.open) dialog.showModal();
};

document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", () => {
    $(button.dataset.close)?.close();
  });
});

$("menuBtn")?.addEventListener("click", () => {
  $("nav")?.classList.toggle("open");
});

if ($("year")) {
  $("year").textContent = new Date().getFullYear();
}

/* =========================
   ADMIN NA AKAUNTI
========================= */

async function checkAdmin(user) {
  if (!sb || !user?.id) return false;

  try {
    const { data, error } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;

    return String(data?.role || "")
      .trim()
      .toLowerCase() === "admin";

  } catch (error) {
    console.error("Admin check:", error);
    return false;
  }
}

/* ADMIN DASHBOARD */

function updateAdminDashboardButton() {
  const button = $("adminDashboardOpen");
  if (button) button.hidden = !currentIsAdmin;
}

function openAdminDashboard() {
  if (!currentIsAdmin) {
    toast("Huna ruhusa ya kufungua Admin Dashboard.");
    return;
  }

  const section = $("embeddedAdminSection");

  if (!section) {
    toast("Sehemu ya Admin Dashboard haipo kwenye index.html.");
    return;
  }

  if (!section.querySelector("iframe")) {
    toast("Iframe ya Admin Dashboard haijapatikana.");
    return;
  }

  if ($("mainContent")) $("mainContent").hidden = true;
  if ($("mainFooter")) $("mainFooter").hidden = true;

  section.hidden = false;
  section.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function closeAdminDashboard() {
  if ($("embeddedAdminSection")) {
    $("embeddedAdminSection").hidden = true;
  }

  if ($("mainContent")) $("mainContent").hidden = false;
  if ($("mainFooter")) $("mainFooter").hidden = false;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

$("adminDashboardOpen")?.addEventListener(
  "click",
  openAdminDashboard
);

$("adminDashboardBack")?.addEventListener(
  "click",
  closeAdminDashboard
);

/* AUTHENTICATION */

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === "signup";

  if ($("authTitle")) {
    $("authTitle").textContent = signup
      ? "Tengeneza akaunti"
      : "Ingia kwenye akaunti";
  }

  $("nameWrap")?.classList.toggle("hidden", !signup);

  if ($("authSubmit")) {
    $("authSubmit").textContent = signup ? "Jisajili" : "Ingia";
  }

  $("loginTab")?.classList.toggle("active", !signup);
  $("signupTab")?.classList.toggle("active", signup);

  if ($("authMessage")) {
    $("authMessage").textContent = "";
  }
}

function updateAuthIdentifier() {
  const method = $("authMethod");
  const identifier = $("identifier");

  if (!method || !identifier) return;

  const phone = method.value === "phone";

  if ($("identifierLabel")) {
    $("identifierLabel").childNodes[0].textContent =
      phone ? "Namba ya simu" : "Barua pepe";
  }

  identifier.type = phone ? "tel" : "email";
  identifier.autocomplete = phone ? "tel" : "email";

  identifier.placeholder = phone
    ? "+2557XXXXXXXX"
    : "barua@mfano.com";

  if ($("identifierHint")) {
    $("identifierHint").textContent = phone
      ? "Tumia mfumo wa kimataifa, mfano +255712345678. SMS Auth lazima iwe imewashwa."
      : "Tumia barua pepe unayoweza kuifikia.";
  }
}

$("authMethod")?.addEventListener(
  "change",
  updateAuthIdentifier
);

updateAuthIdentifier();

$("providerOpen")?.addEventListener("click", () =>
  showDialog("providerDialog")
);

$("providerOpen2")?.addEventListener("click", () =>
  showDialog("providerDialog")
);

$("loginTab")?.addEventListener("click", () =>
  setAuthMode("login")
);

$("signupTab")?.addEventListener("click", () =>
  setAuthMode("signup")
);

/* ACCOUNT MENU */

const accountMenu = document.createElement("div");

accountMenu.id = "ebyAccountMenu";
accountMenu.hidden = true;

accountMenu.style.cssText =
  "position:absolute;z-index:9999;right:16px;top:72px;min-width:240px;max-width:calc(100vw - 32px);padding:16px;background:#fff;color:#172b45;border:1px solid #dce5ef;border-radius:16px;box-shadow:0 12px 35px #0002";

accountMenu.innerHTML = `
<p id="ebyAccountStatus" style="margin:0 0 12px;font-weight:700;overflow-wrap:anywhere"></p>
<button type="button" id="ebyStaySignedIn" style="width:100%;padding:12px;border:0;border-radius:10px;background:#eaf3ff;color:#07518b;font-weight:700;margin-bottom:8px">Endelea kubaki umeingia</button>
<button type="button" id="ebySignOut" style="width:100%;padding:12px;border:0;border-radius:10px;background:#07518b;color:#fff;font-weight:700">Toka kwenye akaunti</button>
`;

document.body.append(accountMenu);

function setAccountButton(user) {
  currentUser = user || null;

  if (!user) currentIsAdmin = false;

  const authButton = $("authOpen");

  if (authButton) {
    authButton.textContent = user
      ? "Akaunti yangu"
      : "Ingia / Jisajili";

    authButton.onclick = () => {
      if (!currentUser) {
        setAuthMode("login");
        showDialog("authDialog");
        return;
      }

      if ($("ebyAccountStatus")) {
        $("ebyAccountStatus").textContent =
          `Umeingia: ${currentUser.email || currentUser.phone || "Akaunti yako"}`;
      }

      accountMenu.hidden = !accountMenu.hidden;
    };
  }

  updateAdminDashboardButton();
}

$("ebyStaySignedIn").onclick = () => {
  accountMenu.hidden = true;
  toast("Utaendelea kubaki umeingia.");
};

$("ebySignOut").onclick = async () => {
  if (!sb) return;

  const { error } = await sb.auth.signOut();

  if (error) {
    toast(error.message);
    return;
  }

  accountMenu.hidden = true;
  setAccountButton(null);
  currentIsAdmin = false;

  updateAdminTestVisibility();
  updateAdminDashboardButton();
  closeAdminDashboard();

  toast("Umetoka kwenye akaunti.");
};

document.addEventListener("click", event => {
  if (
    !accountMenu.hidden &&
    !accountMenu.contains(event.target) &&
    event.target !== $("authOpen")
  ) {
    accountMenu.hidden = true;
  }
});

/* SESSION */

async function refreshSession() {
  if (!sb) {
    setAccountButton(null);
    currentIsAdmin = false;
    updateAdminTestVisibility();
    updateAdminDashboardButton();
    return;
  }

  const { data, error } = await sb.auth.getSession();

  const user = error
    ? null
    : data.session?.user || null;

  setAccountButton(user);

  currentIsAdmin = user
    ? await checkAdmin(user)
    : false;

  updateAdminTestVisibility();
  updateAdminDashboardButton();
}

if (sb) {
  sb.auth.onAuthStateChange((_event, session) => {
    const user = session?.user || null;

    setAccountButton(user);

    Promise.resolve().then(async () => {
      currentIsAdmin = user
        ? await checkAdmin(user)
        : false;

      updateAdminTestVisibility();
      updateAdminDashboardButton();
    });
  });
}

/* LOGIN NA SIGNUP */

$("authForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  if (!sb) {
    $("authMessage").textContent =
      "Kwanza unganisha Supabase kwenye config.js.";
    return;
  }

  const method = $("authMethod").value;
  const identifier = $("identifier").value.trim();
  const password = $("password").value;
  const button = $("authSubmit");

  if (
    method === "phone" &&
    !/^\+[1-9]\d{7,14}$/.test(identifier)
  ) {
    $("authMessage").textContent =
      "Weka namba kwa mfumo wa kimataifa, mfano +255712345678.";
    return;
  }

  button.disabled = true;

  try {
    const credentials = method === "phone"
      ? { phone: identifier, password }
      : { email: identifier, password };

    const result = authMode === "signup"
      ? await sb.auth.signUp({
          ...credentials,
          options: {
            data: {
              full_name: $("fullName").value.trim()
            }
          }
        })
      : await sb.auth.signInWithPassword(credentials);

    if (result.error) throw result.error;

    $("authMessage").textContent = authMode === "signup"
      ? "Ombi la usajili limetumwa. Angalia uthibitishaji."
      : "Umeingia kikamilifu.";

    await refreshSession();

    if (authMode === "login" || result.data.session) {
      $("authDialog").close();

      toast(
        authMode === "login"
          ? "Karibu tena EBY HUDUMA CONNECT."
          : "Akaunti imetengenezwa."
      );
    }

  } catch (error) {
    $("authMessage").textContent =
      error.message || "Imeshindikana. Jaribu tena.";

  } finally {
    button.disabled = false;
  }
});

async function requireLogin(messageEl) {
  const { data, error } = await sb.auth.getSession();

  if (error) throw error;

  const user = data.session?.user;

  if (!user) {
    if (messageEl) {
      messageEl.textContent =
        "Ingia kwenye akaunti ili kutumia huduma hii.";
    }

    setAuthMode("login");
    showDialog("authDialog");
    return null;
  }

  currentUser = user;
  return user;
}

/* =========================
   USAJILI WA BIASHARA
========================= */

$("businessForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  if (!sb) {
    $("businessMessage").textContent =
      "Kwanza unganisha Supabase kwenye config.js.";
    return;
  }

  const { data } = await sb.auth.getSession();
  const user = data.session?.user;

  if (!user) {
    $("businessMessage").textContent =
      "Tafadhali ingia au jisajili kwanza.";

    showDialog("authDialog");
    return;
  }

  const button = $("businessForm")
    .querySelector('[type="submit"]');

  button.disabled = true;

  try {
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

    const { error } = await sb
      .from("businesses")
      .insert(payload);

    if (error) throw error;

    $("businessForm").reset();

    $("businessMessage").textContent =
      "Ombi lako limepokelewa na litasubiri ukaguzi.";

    toast("Usajili wa biashara umetumwa.");

    loadBusinessLocations();

  } catch (error) {
    $("businessMessage").textContent =
      error.message || "Imeshindikana kutuma ombi.";

  } finally {
    button.disabled = false;
  }
});

/* =========================
   UTAFUTAJI WA BIASHARA
   MKOA NA WILAYA
========================= */

let regionFilter = null;
let districtFilter = null;
let businessLocations = [];

function createLocationFilters() {
  const form = $("searchForm");
  if (!form) return;

  regionFilter = $("regionFilter");
  districtFilter = $("districtFilter");

  if (!regionFilter) {
    regionFilter = document.createElement("select");
    regionFilter.id = "regionFilter";
    regionFilter.className = $("categoryFilter")?.className || "";
    regionFilter.innerHTML =
      '<option value="">Mikoa yote</option>';

    const category = $("categoryFilter");

    if (category) {
      category.insertAdjacentElement("afterend", regionFilter);
    } else {
      form.append(regionFilter);
    }
  }

  if (!districtFilter) {
    districtFilter = document.createElement("select");
    districtFilter.id = "districtFilter";
    districtFilter.className = regionFilter.className;
    districtFilter.innerHTML =
      '<option value="">Wilaya zote</option>';

    regionFilter.insertAdjacentElement(
      "afterend",
      districtFilter
    );
  }

  regionFilter.addEventListener("change", () => {
    updateDistrictOptions();

    loadBusinesses(
      $("searchInput").value.trim(),
      $("categoryFilter").value,
      regionFilter.value,
      districtFilter.value
    );
  });

  districtFilter.addEventListener("change", () => {
    loadBusinesses(
      $("searchInput").value.trim(),
      $("categoryFilter").value,
      regionFilter.value,
      districtFilter.value
    );
  });
}

function updateDistrictOptions() {
  if (!districtFilter) return;

  const selectedRegion = regionFilter.value;
  const previousDistrict = districtFilter.value;

  const districts = [
    ...new Set(
      businessLocations
        .filter(item =>
          !selectedRegion || item.region === selectedRegion
        )
        .map(item => item.district)
        .filter(Boolean)
    )
  ].sort();

  districtFilter.innerHTML =
    '<option value="">Wilaya zote</option>';

  districts.forEach(district => {
    const option = document.createElement("option");
    option.value = district;
    option.textContent = district;
    districtFilter.append(option);
  });

  if (districts.includes(previousDistrict)) {
    districtFilter.value = previousDistrict;
  }
}

async function loadBusinessLocations() {
  if (!sb) return;

  createLocationFilters();

  const { data, error } = await sb
    .from("businesses")
    .select("region,district")
    .eq("status", "approved")
    .limit(1000);

  if (error) {
    console.error("Business locations:", error);
    return;
  }

  businessLocations = data || [];

  const regions = [
    ...new Set(
      businessLocations
        .map(item => item.region)
        .filter(Boolean)
    )
  ].sort();

  const previousRegion = regionFilter?.value || "";

  if (regionFilter) {
    regionFilter.innerHTML =
      '<option value="">Mikoa yote</option>';

    regions.forEach(region => {
      const option = document.createElement("option");
      option.value = region;
      option.textContent = region;
      regionFilter.append(option);
    });

    if (regions.includes(previousRegion)) {
      regionFilter.value = previousRegion;
    }
  }

  updateDistrictOptions();
}

async function loadBusinesses(
  search = "",
  category = "",
  region = "",
  district = ""
) {
  const list = $("businessList");
  if (!list) return;

  if (!sb) {
    if ($("businessCount")) {
      $("businessCount").textContent =
        "Database haijaunganishwa";
    }
    return;
  }

  let query = sb
    .from("businesses")
    .select(
      "id,name,description,category,phone,whatsapp,region,district,is_verified"
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(30);

  if (category) query = query.ilike("category", category);
  if (region) query = query.eq("region", region);
  if (district) query = query.eq("district", district);

  if (search) {
    const safeSearch = search.replace(/[,%()]/g, " ");

    query = query.or(
      `name.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%,region.ilike.%${safeSearch}%,district.ilike.%${safeSearch}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    if ($("businessCount")) {
      $("businessCount").textContent = "Hitilafu ya kupakia";
    }

    list.innerHTML =
      '<div class="empty">Imeshindikana kupakia biashara.</div>';

    console.error(error);
    return;
  }

  if ($("businessCount")) {
    $("businessCount").textContent = `${data.length} biashara`;
  }

  list.innerHTML = "";

  if (!data.length) {
    list.innerHTML =
      '<div class="empty">Hakuna biashara zilizopatikana kwa utafutaji huu.</div>';
    return;
  }

  data.forEach(item => {
    const card = document.createElement("article");
    card.className = "business-card";

    const cat = document.createElement("span");
    cat.className = "pill";
    cat.textContent = item.category || "Huduma";

    const heading = document.createElement("h3");
    heading.textContent = item.name;

    const description = document.createElement("p");
    description.textContent =
      item.description ||
      "Wasiliana na mtoa huduma kupata maelezo zaidi.";

    const place = document.createElement("small");
    place.textContent =
      [item.district, item.region].filter(Boolean).join(", ");

    card.append(cat, heading, description, place);

    const contact = item.whatsapp || item.phone;

    if (contact) {
      const link = document.createElement("a");
      link.className = "contact-link";
      link.textContent = "Wasiliana";

      link.href = item.whatsapp
        ? `https://wa.me/${contact.replace(/\D/g, "")}`
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

createLocationFilters();

$("searchForm")?.addEventListener("submit", event => {
  event.preventDefault();

  loadBusinesses(
    $("searchInput").value.trim(),
    $("categoryFilter").value,
    regionFilter?.value || "",
    districtFilter?.value || ""
  );
});

/* =========================
   PICHA VIEWER
========================= */

function openViewer(items, index) {
  viewerItems = items;
  viewerIndex = index;
  renderViewer();
  showDialog("photoViewerDialog");
}

function renderViewer() {
  if (!viewerItems.length) return;

  const item = viewerItems[viewerIndex];

  $("viewerImage").src = item.image_url;
  $("viewerImage").alt = item.title || "Picha";
  $("viewerTitle").textContent = item.title || "";
  $("viewerDescription").textContent = item.description || "";

  $("viewerCounter").textContent =
    `${viewerIndex + 1} / ${viewerItems.length}`;
}

function moveViewer(step) {
  if (!viewerItems.length) return;

  viewerIndex =
    (viewerIndex + step + viewerItems.length) % viewerItems.length;

  renderViewer();
}

$("viewerClose")?.addEventListener("click", () =>
  $("photoViewerDialog")?.close()
);

$("viewerPrev")?.addEventListener("click", () =>
  moveViewer(-1)
);

$("viewerNext")?.addEventListener("click", () =>
  moveViewer(1)
);

$("viewerImage")?.addEventListener("touchstart", event => {
  touchStartX = event.changedTouches[0].screenX;
}, { passive: true });

$("viewerImage")?.addEventListener("touchend", event => {
  const dx = event.changedTouches[0].screenX - touchStartX;

  if (Math.abs(dx) > 45) {
    moveViewer(dx < 0 ? 1 : -1);
  }
}, { passive: true });

document.addEventListener("keydown", event => {
  if (!$("photoViewerDialog")?.open) return;

  if (event.key === "ArrowRight") moveViewer(1);
  if (event.key === "ArrowLeft") moveViewer(-1);
});

/* =========================
   LIKES NA MAONI
========================= */

async function engagementData(type, id) {
  const [likes, commentCount, comments, mine] = await Promise.all([
    sb.from("content_likes")
      .select("id", { count: "exact", head: true })
      .eq("content_type", type)
      .eq("content_id", id),

    sb.from("content_comments")
      .select("id", { count: "exact", head: true })
      .eq("content_type", type)
      .eq("content_id", id),

    sb.from("content_comments")
      .select("id,user_id,author_name,body,created_at")
      .eq("content_type", type)
      .eq("content_id", id)
      .order("created_at", { ascending: false })
      .limit(30),

    currentUser
      ? sb.from("content_likes")
          .select("id")
          .eq("content_type", type)
          .eq("content_id", id)
          .eq("user_id", currentUser.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);

  if (likes.error) throw likes.error;
  if (commentCount.error) throw commentCount.error;
  if (comments.error) throw comments.error;
  if (mine.error) throw mine.error;

  return {
    count: likes.count || 0,
    commentCount: commentCount.count || 0,
    comments: comments.data || [],
    liked: !!mine.data
  };
}

function addEngagement(card, type, id) {
  if (!sb) return;

  const box = document.createElement("div");
  box.className = "engagement";

  const actions = document.createElement("div");
  actions.className = "engagement-actions";

  const like = document.createElement("button");
  like.type = "button";
  like.className = "like-btn";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "comments-toggle";

  actions.append(like, toggle);

  const area = document.createElement("div");
  area.className = "comment-area";
  area.hidden = true;

  const comments = document.createElement("div");
  comments.className = "comment-list";

  const hint = document.createElement("p");
  hint.className = "comment-hint";

  const form = document.createElement("form");
  form.className = "comment-form";

  const input = document.createElement("input");
  input.maxLength = 1000;
  input.placeholder = "Andika maoni yako...";
  input.setAttribute("aria-label", "Andika maoni");

  const send = document.createElement("button");
  send.type = "submit";
  send.textContent = "Tuma";

  form.append(input, send);
  area.append(comments, hint, form);
  box.append(actions, area);
  card.append(box);

  async function refresh() {
    try {
      const data = await engagementData(type, id);

      like.textContent = `👍 Like (${data.count})`;
      like.classList.toggle("liked", data.liked);

      toggle.textContent =
        `💬 Maoni (${data.commentCount})`;

      comments.replaceChildren();

      if (!data.comments.length) {
        const empty = document.createElement("small");
        empty.className = "comment-hint";
        empty.textContent =
          "Bado hakuna maoni. Kuwa wa kwanza.";
        comments.append(empty);
      }

      data.comments.slice().reverse().forEach(comment => {
        const row = document.createElement("div");
        row.className = "comment-item";

        const name = document.createElement("strong");
        name.textContent =
          comment.author_name || "Mwanachama";

        const body = document.createElement("span");
        body.textContent = comment.body;

        row.append(name, body);
        comments.prepend(row);
      });

    } catch (error) {
      console.error("Engagement load:", error);

      hint.textContent =
        "Imeshindikana kupakia Likes/maoni. Angalia sera za Supabase.";
    }
  }

  like.onclick = async () => {
    try {
      const user = await requireLogin(hint);
      if (!user) return;

      const { data: old, error } = await sb
        .from("content_likes")
        .select("id")
        .eq("content_type", type)
        .eq("content_id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (old) {
        const { error: del } = await sb
          .from("content_likes")
          .delete()
          .eq("id", old.id);

        if (del) throw del;

      } else {
        const { error: ins } = await sb
          .from("content_likes")
          .insert({
            user_id: user.id,
            content_type: type,
            content_id: id
          });

        if (ins) throw ins;
      }

      await refresh();

    } catch (error) {
      hint.textContent =
        error.message || "Imeshindikana kuhifadhi Like.";
    }
  };

  toggle.onclick = () => {
    area.hidden = !area.hidden;
    if (!area.hidden) input.focus();
  };

  form.onsubmit = async event => {
    event.preventDefault();

    const body = input.value.trim();
    if (!body) return;

    try {
      const user = await requireLogin(hint);
      if (!user) return;

      send.disabled = true;

      const author = (
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        user.phone ||
        "Mwanachama"
      ).toString().slice(0, 100);

      const { error } = await sb
        .from("content_comments")
        .insert({
          user_id: user.id,
          content_type: type,
          content_id: id,
          author_name: author,
          body
        });

      if (error) throw error;

      input.value = "";
      await refresh();

      toast("Maoni yako yametumwa.");

    } catch (error) {
      hint.textContent =
        error.message || "Imeshindikana kutuma maoni.";

    } finally {
      send.disabled = false;
    }
  };

  refresh();
}

/* =========================
   WHATSAPP NA CONTENT CARD
========================= */

function normalizeWhatsApp(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("0") && digits.length === 10) {
    return `255${digits.slice(1)}`;
  }

  if (digits.startsWith("255")) return digits;

  return digits;
}

function contentCard(item, type, index, all) {
  const card = document.createElement("article");
  card.className = "business-card";

  const img = document.createElement("img");
  img.className = "photo-card-image";
  img.src = item.image_url;
  img.alt = item.title || "Picha";
  img.loading = "lazy";

  img.onclick = () => openViewer(all, index);

  const heading = document.createElement("h3");
  heading.textContent = item.title || "";

  const description = document.createElement("p");
  description.textContent = item.description || "";

  card.append(img, heading, description);

  if (type === "advertisement") {
    if (item.target_url) {
      const link = document.createElement("a");

      link.href = item.target_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "contact-link";
      link.textContent = "Jifunze zaidi";

      card.append(link);
    }

    const wa = normalizeWhatsApp(item.whatsapp_phone);

    if (wa) {
      const whatsappLink = document.createElement("a");

      whatsappLink.href = `https://wa.me/${wa}`;
      whatsappLink.target = "_blank";
      whatsappLink.rel = "noopener noreferrer";
      whatsappLink.className = "contact-link";
      whatsappLink.textContent = "Wasiliana WhatsApp";

      card.append(whatsappLink);
    }
  }

  addEngagement(card, type, item.id);

  return card;
}

/* =========================
   PICHA ZA UMMA
========================= */

async function loadPublicPhotos() {
  const list = $("publicPhotoList");
  if (!list) return;

  if (!sb) {
    if ($("photoCount")) {
      $("photoCount").textContent =
        "Database haijaunganishwa";
    }
    return;
  }

  const { data, error } = await sb
    .from("public_photos")
    .select("id,title,description,image_url")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    console.error(error);

    if ($("photoCount")) {
      $("photoCount").textContent = "Hitilafu";
    }

    list.innerHTML =
      '<div class="empty">Imeshindikana kupakia picha za umma.</div>';

    return;
  }

  if ($("photoCount")) {
    $("photoCount").textContent =
      `${data.length} picha`;
  }

  list.replaceChildren();

  if (!data.length) {
    list.innerHTML =
      '<div class="empty">Bado hakuna picha zilizoidhinishwa.</div>';
    return;
  }

  data.forEach((item, index) => {
    list.append(
      contentCard(item, "photo", index, data)
    );
  });
}

$("publicPhotoOpen")?.addEventListener("click", async () => {
  if (!sb) {
    toast("Supabase haijaunganishwa.");
    return;
  }

  const user = await requireLogin($("publicPhotoMessage"));
  if (!user) return;

  $("publicPhotoForm").reset();
  $("publicPhotoMessage").textContent = "";

  showDialog("photoUploadDialog");
});

$("publicPhotoForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  const msg = $("publicPhotoMessage");

  const button = $("publicPhotoForm")
    .querySelector('[type="submit"]');

  try {
    const user = await requireLogin(msg);
    if (!user) return;

    const title = $("publicPhotoTitle").value.trim();
    const description =
      $("publicPhotoDescription").value.trim();

    const file = $("publicPhotoFile").files[0];

    if (!title || !file) {
      msg.textContent = "Weka kichwa na uchague picha.";
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      msg.textContent = "Chagua JPG, PNG au WEBP.";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      msg.textContent = "Picha imezidi MB 5.";
      return;
    }

    button.disabled = true;
    button.textContent = "Inapakia picha...";

    const ext = file.type === "image/jpeg"
      ? "jpg"
      : file.type === "image/png"
        ? "png"
        : "webp";

    const path =
      `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await sb.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: publicData } = sb.storage
      .from(PHOTO_BUCKET)
      .getPublicUrl(path);

    const { error: insertError } = await sb
      .from("public_photos")
      .insert({
        user_id: user.id,
        title,
        description,
        image_url: publicData.publicUrl,
        storage_path: path,
        status: "pending"
      });

    if (insertError) throw insertError;

    $("publicPhotoForm").reset();

    msg.textContent =
      "Picha imetumwa kwa ukaguzi wa msimamizi.";

    toast("Picha imetumwa kwa ukaguzi.");

    setTimeout(() => {
      if ($("photoUploadDialog")?.open) {
        $("photoUploadDialog").close();
      }
    }, 2200);

  } catch (error) {
    console.error(error);

    msg.textContent =
      error.message || "Imeshindikana kupakia picha.";

  } finally {
    button.disabled = false;
    button.textContent = "Tuma picha kwa ukaguzi";
  }
});

/* =========================
   MATANGAZO NA MALIPO
========================= */

function selectedAdPrice() {
  return AD_PRICES[$("advertisementPlan")?.value] || 0;
}

function updatePaymentInstructions() {
  const box = document.querySelector(".ad-payment");
  if (!box) return;

  let line = $("adSelectedPrice");

  if (!line) {
    line = document.createElement("p");
    line.id = "adSelectedPrice";

    line.style.cssText =
      "font-weight:700;color:#07518b;margin:10px 0";

    box.append(line);
  }

  const amount = selectedAdPrice();

  line.textContent = amount
    ? `Bei ya kifurushi ulichochagua: TSh ${amount.toLocaleString("en-US")}`
    : "Chagua kifurushi cha tangazo kuona bei.";
}

$("advertisementPlan")?.addEventListener(
  "change",
  updatePaymentInstructions
);

$("advertisementPaymentMethod")?.addEventListener(
  "change",
  updatePaymentInstructions
);

/* =========================
   JARIBIO LA ADMIN
========================= */

function createAdminTestControl() {
  const form = $("advertisementForm");

  if (!form || $("advertisementAdminTest")) return;

  const wrap = document.createElement("div");

  wrap.id = "ebyAdminTestWrap";
  wrap.hidden = true;

  wrap.style.cssText =
    "margin:16px 0;padding:14px;border:2px dashed #d69b16;border-radius:12px;background:#fff9e8;color:#503b0a";

  wrap.innerHTML = `
<label style="display:flex;align-items:center;gap:10px;font-weight:800">
<input type="checkbox" id="advertisementAdminTest" style="width:20px;height:20px">
JARIBIO LA ADMIN (BILA MALIPO)
</label>
<p id="ebyAdminTestNote" style="font-size:13px">
Hali hii ni kwa majaribio ya msimamizi pekee.
</p>
`;

  const payment = form.querySelector(".ad-payment");

  if (payment?.parentNode) {
    payment.parentNode.insertBefore(wrap, payment);
  } else {
    form.prepend(wrap);
  }

  $("advertisementAdminTest").onchange =
    updateAdminTestFields;
}

function updateAdminTestVisibility() {
  createAdminTestControl();

  const wrap = $("ebyAdminTestWrap");
  const checkbox = $("advertisementAdminTest");

  if (!wrap || !checkbox) return;

  wrap.hidden = !currentIsAdmin;

  if (!currentIsAdmin) checkbox.checked = false;

  updateAdminTestFields();
}

function updateAdminTestFields() {
  const test = !!(
    currentIsAdmin &&
    $("advertisementAdminTest")?.checked
  );

  [
    $("advertisementPaymentMethod"),
    $("advertisementPayerName"),
    $("advertisementPayerPhone"),
    $("advertisementTransaction")
  ].forEach(field => {
    if (!field) return;

    if (!field.dataset.originalRequired) {
      field.dataset.originalRequired =
        field.required ? "true" : "false";
    }

    field.required = test
      ? false
      : field.dataset.originalRequired === "true";
  });

  const note = $("ebyAdminTestNote");

  if (note) {
    note.textContent = test
      ? "JARIBIO: hakuna malipo. Tangazo halitaonekana kwa umma."
      : "Hali hii ni kwa majaribio ya msimamizi pekee.";
  }

  const button = $("advertisementForm")
    ?.querySelector('[type="submit"]');

  if (button && !button.disabled) {
    button.textContent = test
      ? "Tuma tangazo la majaribio"
      : "Tuma tangazo kwa ukaguzi";
  }
}

createAdminTestControl();

/* OPEN AD FORM */

$("advertisementOpen")?.addEventListener("click", async () => {
  if (!sb) {
    toast("Supabase haijaunganishwa.");
    return;
  }

  const { data, error } = await sb.auth.getSession();

  if (error || !data.session?.user) {
    toast("Ingia kwenye akaunti kwanza.");

    setAuthMode("login");
    showDialog("authDialog");

    return;
  }

  currentUser = data.session.user;
  currentIsAdmin = await checkAdmin(currentUser);

  updateAdminTestVisibility();
  updateAdminDashboardButton();

  $("advertisementForm").reset();
  $("advertisementMessage").textContent = "";

  updateAdminTestVisibility();
  updatePaymentInstructions();

  showDialog("advertisementDialog");
});

/* =========================
   KUTUMA TANGAZO
========================= */

$("advertisementForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  const msg = $("advertisementMessage");

  const button = $("advertisementForm")
    .querySelector('[type="submit"]');

  if (!sb) {
    msg.textContent = "Supabase haijaunganishwa.";
    return;
  }

  const { data: sessionData, error: sessionError } =
    await sb.auth.getSession();

  if (sessionError) {
    msg.textContent = sessionError.message;
    return;
  }

  const user = sessionData.session?.user;

  if (!user) {
    msg.textContent = "Ingia kwenye akaunti kwanza.";
    showDialog("authDialog");
    return;
  }

  const title =
    $("advertisementTitle").value.trim();

  const descriptionField =
    $("advertisementDescription");

  const description =
    descriptionField?.value.trim() || "";

  const whatsappField =
    $("advertisementWhatsapp");

  const whatsappPhone =
    whatsappField?.value.trim() || "";

  const file =
    $("advertisementImage").files[0];

  const plan =
    $("advertisementPlan").value;

  const paymentMethod =
    $("advertisementPaymentMethod").value;

  const payerName =
    $("advertisementPayerName").value.trim();

  const payerPhone =
    $("advertisementPayerPhone").value.trim();

  const transactionId =
    $("advertisementTransaction").value.trim();

  const testRequested =
    !!$("advertisementAdminTest")?.checked;

  const isAdmin = await checkAdmin(user);

  currentIsAdmin = isAdmin;

  updateAdminTestVisibility();
  updateAdminDashboardButton();

  const test = testRequested && isAdmin;

  if (testRequested && !isAdmin) {
    msg.textContent =
      "Huna ruhusa ya kutumia jaribio la admin.";
    return;
  }

  if (
    !title ||
    !file ||
    !AD_PRICES[plan] ||
    (descriptionField && !description)
  ) {
    msg.textContent =
      "Jaza kichwa, maelezo yanayopatikana, picha na kifurushi sahihi.";
    return;
  }

  if (
    whatsappPhone &&
    !/^[+\d\s()-]{7,20}$/.test(whatsappPhone)
  ) {
    msg.textContent =
      "Kagua namba ya WhatsApp. Mfano: 0788309986.";
    return;
  }

  if (
    !test &&
    (!paymentMethod || !payerName || !payerPhone || !transactionId)
  ) {
    msg.textContent =
      "Jaza taarifa zote za malipo na muamala.";
    return;
  }

  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  ) {
    msg.textContent =
      "Chagua JPG, PNG au WEBP isiyozidi MB 5.";
    return;
  }

  if (
    !test &&
    (
      !/^[A-Za-z0-9+\-\s]{7,25}$/.test(payerPhone) ||
      transactionId.length < 4
    )
  ) {
    msg.textContent =
      "Kagua namba ya simu na namba ya muamala.";
    return;
  }

  button.disabled = true;
  button.textContent = "Inatuma tangazo...";

  try {
    const ext = file.type === "image/jpeg"
      ? "jpg"
      : file.type === "image/png"
        ? "png"
        : "webp";

    const path =
      `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await sb.storage
      .from(AD_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: publicData } = sb.storage
      .from(AD_BUCKET)
      .getPublicUrl(path);

    const payload = {
      owner_id: user.id,
      title,
      description,
      image_url: publicData.publicUrl,
      target_url: null,
      whatsapp_phone: whatsappPhone || null,
      status: "pending",
      payment_method: test ? null : paymentMethod,
      payer_name: test ? null : payerName,
      payer_phone: test ? null : payerPhone,
      transaction_id: test ? null : transactionId,
      payment_status: "pending",
      is_test: test
    };

    const { error: insertError } = await sb
      .from("advertisements")
      .insert(payload);

    if (insertError) throw insertError;

    $("advertisementForm").reset();

    updateAdminTestFields();
    updatePaymentInstructions();

    msg.textContent = test
      ? "Jaribio limehifadhiwa. Halitaonekana kwa umma."
      : "Ombi limepokelewa. Malipo yanasubiri kuthibitishwa.";

    toast(
      test
        ? "Jaribio la admin limetumwa."
        : "Tangazo limetumwa kwa ukaguzi."
    );

    setTimeout(() => {
      if ($("advertisementDialog")?.open) {
        $("advertisementDialog").close();
      }
    }, 2500);

  } catch (error) {
    console.error(error);

    msg.textContent =
      error.message || "Imeshindikana kutuma tangazo.";

  } finally {
    button.disabled = false;
    updateAdminTestFields();
  }
});

/* =========================
   MATANGAZO YANAYOONEKANA
========================= */

async function loadAdvertisements() {
  const list = $("advertisementList");
  if (!list) return;

  if (!sb) {
    if ($("advertisementCount")) {
      $("advertisementCount").textContent =
        "Database haijaunganishwa";
    }
    return;
  }

  const { data, error } = await sb
    .from("advertisements")
    .select(
      "id,title,description,image_url,target_url,whatsapp_phone"
    )
    .eq("status", "active")
    .eq("payment_status", "approved")
    .eq("is_test", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error(error);

    if ($("advertisementCount")) {
      $("advertisementCount").textContent = "Hitilafu";
    }

    list.innerHTML =
      '<div class="empty">Matangazo yataonekana baada ya kuidhinishwa.</div>';

    return;
  }

  if ($("advertisementCount")) {
    $("advertisementCount").textContent =
      `${data.length} matangazo`;
  }

  list.replaceChildren();

  if (!data.length) {
    list.innerHTML =
      '<div class="empty">Bado hakuna matangazo yaliyoidhinishwa.</div>';
    return;
  }

  data.forEach((ad, index) => {
    list.append(
      contentCard(ad, "advertisement", index, data)
    );
  });
}

/* =========================
   KUANZISHA MFUMO
========================= */

if (sb) {
  loadBusinesses();
  loadBusinessLocations();
  loadAdvertisements();
  loadPublicPhotos();

} else {
  if ($("businessCount")) {
    $("businessCount").textContent =
      "Inasubiri muunganisho";
  }

  if ($("advertisementCount")) {
    $("advertisementCount").textContent =
      "Inasubiri muunganisho";
  }

  if ($("photoCount")) {
    $("photoCount").textContent =
      "Inasubiri muunganisho";
  }
}

refreshSession();

/* =========================
   EBY AI ASSISTANT
========================= */

const aiOpen = $("ebyAiOpen");
const aiClose = $("ebyAiClose");
const aiPanel = $("ebyAiPanel");
const aiForm = $("ebyAiForm");
const aiInput = $("ebyAiInput");
const aiMessages = $("ebyAiMessages");
const aiSend = $("ebyAiSend");
const aiStatus = $("ebyAiStatus");

function getAiVisitorId() {
  let id = localStorage.getItem("eby_ai_visitor_id");

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("eby_ai_visitor_id", id);
  }

  return id;
}

function addAiMessage(message, sender) {
  if (!aiMessages) return;

  const bubble = document.createElement("div");
  bubble.className = `eby-ai-bubble ${sender}`;
  bubble.textContent = message;

  aiMessages.append(bubble);
  aiMessages.scrollTop = aiMessages.scrollHeight;
}

/* Fungua chat bila ujumbe wa mwanzo */
aiOpen?.addEventListener("click", () => {
  if (aiMessages) {
    aiMessages.replaceChildren();
  }

  if (aiStatus) aiStatus.textContent = "";

  aiPanel.hidden = false;
  aiInput?.focus();
});

/* Funga chat */
aiClose?.addEventListener("click", () => {
  aiPanel.hidden = true;
});

/* Jibu ujumbe wa mteja */
aiForm?.addEventListener("submit", async event => {
  event.preventDefault();

  const message = aiInput?.value.trim();

  if (!message) return;

  if (!sb) {
    aiStatus.textContent =
      "Huduma haijaunganishwa. Jaribu tena baadaye.";
    return;
  }

  addAiMessage(message, "user");

  aiInput.value = "";
  aiSend.disabled = true;
  aiStatus.textContent = "Inatafuta jibu...";

  try {
    const { data, error } = await sb.rpc("eby_ai_chat", {
      p_visitor_id: getAiVisitorId(),
      p_message: message
    });

    if (error) throw error;

    if (!data?.answer) {
      throw new Error("Hakuna jibu lililopatikana.");
    }

    addAiMessage(data.answer, "assistant");
    aiStatus.textContent = "";

  } catch (error) {
    console.error("EBY AI:", error);

    addAiMessage(
      "Samahani, kumetokea tatizo. Tafadhali jaribu tena.",
      "assistant"
    );

    aiStatus.textContent =
      "Imeshindikana kuwasiliana na mfumo.";

  } finally {
    aiSend.disabled = false;
    aiInput?.focus();
  }
});
})();
