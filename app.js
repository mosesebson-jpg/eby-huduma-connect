
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

/* =========================
   MENU NA MADIRISHA
========================= */

document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", () => {
    $(button.dataset.close)?.close();
  });
});

$("menuBtn")?.addEventListener("click", () => {
  $("nav")?.classList.toggle("open");
});

$("year").textContent = new Date().getFullYear();

/* =========================
   ADMIN
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

    return data?.role === "admin";
  } catch (error) {
    console.error("Admin check", error);
    return false;
  }
}

/* =========================
   USAJILI NA LOGIN
========================= */

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

function updateAuthIdentifier() {
  const phone = $("authMethod").value === "phone";

  $("identifierLabel").childNodes[0].textContent =
    phone ? "Namba ya simu" : "Barua pepe";

  $("identifier").type = phone ? "tel" : "email";
  $("identifier").autocomplete = phone ? "tel" : "email";

  $("identifier").placeholder = phone
    ? "+2557XXXXXXXX"
    : "barua@mfano.com";

  $("identifierHint").textContent = phone
    ? "Tumia mfumo wa kimataifa, mfano +255712345678. SMS Auth lazima iwe imewashwa."
    : "Tumia barua pepe unayoweza kuifikia.";
}

$("authMethod").addEventListener("change", updateAuthIdentifier);
updateAuthIdentifier();

$("providerOpen").addEventListener("click", () =>
  showDialog("providerDialog")
);

$("providerOpen2").addEventListener("click", () =>
  showDialog("providerDialog")
);

$("loginTab").addEventListener("click", () =>
  setAuthMode("login")
);

$("signupTab").addEventListener("click", () =>
  setAuthMode("signup")
);

/* =========================
   ACCOUNT MENU
========================= */

const accountMenu = document.createElement("div");

accountMenu.id = "ebyAccountMenu";
accountMenu.hidden = true;

accountMenu.style.cssText =
  "position:absolute;z-index:9999;right:16px;top:72px;" +
  "min-width:240px;max-width:calc(100vw - 32px);" +
  "padding:16px;background:#fff;color:#172b45;" +
  "border:1px solid #dce5ef;border-radius:16px;" +
  "box-shadow:0 12px 35px #0002";

accountMenu.innerHTML = `
<p id="ebyAccountStatus"
style="margin:0 0 12px;font-weight:700;overflow-wrap:anywhere"></p>

<button type="button" id="ebyStaySignedIn"
style="width:100%;padding:12px;border:0;border-radius:10px;
background:#eaf3ff;color:#07518b;font-weight:700;margin-bottom:8px">
Endelea kubaki umeingia
</button>

<button type="button" id="ebySignOut"
style="width:100%;padding:12px;border:0;border-radius:10px;
background:#07518b;color:#fff;font-weight:700">
Toka kwenye akaunti
</button>
`;

document.body.append(accountMenu);

function setAccountButton(user) {
  currentUser = user || null;

  if (!user) currentIsAdmin = false;

  $("authOpen").textContent = user
    ? "Akaunti yangu"
    : "Ingia / Jisajili";

  $("authOpen").onclick = () => {
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

async function refreshSession() {
  if (!sb) {
    setAccountButton(null);
    updateAdminTestVisibility();
    return;
  }

  const { data, error } = await sb.auth.getSession();

  const user = error ? null : data.session?.user || null;

  setAccountButton(user);

  currentIsAdmin = user ? await checkAdmin(user) : false;

  updateAdminTestVisibility();
}

if (sb) {
  sb.auth.onAuthStateChange((_event, session) => {
    const user = session?.user || null;

    setAccountButton(user);

    Promise.resolve().then(async () => {
      currentIsAdmin = user ? await checkAdmin(user) : false;
      updateAdminTestVisibility();
    });
  });
}

/* =========================
   AUTH FORM
========================= */

$("authForm").addEventListener("submit", async event => {
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

/* =========================
   LOGIN REQUIRED
========================= */

async function requireLogin(messageEl) {
  if (!sb) {
    if (messageEl) {
      messageEl.textContent = "Supabase haijaunganishwa.";
    }
    return null;
  }

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

$("businessForm").addEventListener("submit", async event => {
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

  const button = $("businessForm").querySelector('[type="submit"]');

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
  } catch (error) {
    $("businessMessage").textContent =
      error.message || "Imeshindikana kutuma ombi.";
  } finally {
    button.disabled = false;
  }
});

/* =========================
   BIASHARA ZINAZOONEKANA
========================= */

async function loadBusinesses(search = "", category = "") {
  const list = $("businessList");

  if (!sb) {
    $("businessCount").textContent = "Database haijaunganishwa";
    return;
  }

  let query = sb
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
      '<div class="empty">Imeshindikana kupakia biashara.</div>';
    return;
  }

  $("businessCount").textContent = `${data.length} biashara`;
  list.innerHTML = "";

  if (!data.length) {
    list.innerHTML =
      '<div class="empty">Bado hakuna biashara zilizoidhinishwa kwenye kundi hili.</div>';
    return;
  }

  data.forEach(item => {
    const card = document.createElement("article");
    card.className = "business-card";

    const categoryEl = document.createElement("span");
    categoryEl.className = "pill";
    categoryEl.textContent = item.category || "Huduma";

    const heading = document.createElement("h3");
    heading.textContent = item.name;

    const description = document.createElement("p");
    description.textContent =
      item.description || "Wasiliana na mtoa huduma kupata maelezo zaidi.";

    const place = document.createElement("small");
    place.textContent =
      [item.district, item.region].filter(Boolean).join(", ");

    card.append(categoryEl, heading, description, place);

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

$("searchForm").addEventListener("submit", event => {
  event.preventDefault();

  loadBusinesses(
    $("searchInput").value.trim(),
    $("categoryFilter").value
  );
});

/* =========================
   PHOTO VIEWER
========================= */

function openViewer(items, index) {
  if (!items || !items.length) return;

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
  $("viewerDescription").textContent =
    item.description || "";

  $("viewerCounter").textContent =
    `${viewerIndex + 1} / ${viewerItems.length}`;
}

function moveViewer(step) {
  if (!viewerItems.length) return;

  viewerIndex =
    (viewerIndex + step + viewerItems.length) % viewerItems.length;

  renderViewer();
}

$("viewerPrev").addEventListener("click", () => {
  moveViewer(-1);
});

$("viewerNext").addEventListener("click", () => {
  moveViewer(1);
});

/* KITUFE CHA X KUFUNGA PICHA */

$("viewerClose").addEventListener("click", () => {
  $("photoViewerDialog").close();
});

/* Safisha taarifa baada ya kufunga viewer */

$("photoViewerDialog").addEventListener("close", () => {
  $("viewerImage").removeAttribute("src");
  $("viewerImage").alt = "";

  $("viewerTitle").textContent = "";
  $("viewerDescription").textContent = "";

  viewerItems = [];
  viewerIndex = 0;
});

/* Kugusa na kusogeza picha kwenye simu */

$("viewerImage").addEventListener("touchstart", event => {
  touchStartX = event.changedTouches[0].screenX;
}, { passive: true });

$("viewerImage").addEventListener("touchend", event => {
  const dx =
    event.changedTouches[0].screenX - touchStartX;

  if (Math.abs(dx) > 50) {
    moveViewer(dx < 0 ? 1 : -1);
  }
}, { passive: true });

/* Mishale ya keyboard */

document.addEventListener("keydown", event => {
  if (!$("photoViewerDialog").open) return;

  if (event.key === "ArrowRight") moveViewer(1);
  if (event.key === "ArrowLeft") moveViewer(-1);
});

/* =========================
   LIKE NA MAONI
========================= */

async function getEngagement(type, id) {
  const [likes, comments, session] = await Promise.all([
    sb
      .from("content_likes")
      .select("id,user_id", { count: "exact" })
      .eq("content_type", type)
      .eq("content_id", id),

    sb
      .from("content_comments")
      .select("id", { count: "exact", head: true })
      .eq("content_type", type)
      .eq("content_id", id),

    sb.auth.getSession()
  ]);

  if (likes.error) throw likes.error;
  if (comments.error) throw comments.error;

  const user = session.data.session?.user;

  return {
    likes: likes.data || [],
    likeCount: likes.count ?? 0,
    commentCount: comments.count ?? 0,
    liked: !!user &&
      (likes.data || []).some(item => item.user_id === user.id)
  };
}

function updateEngagementDisplay(type, id, state) {
  const count = document.querySelector(
    `.engagement-count[data-content-type="${type}"][data-content-id="${id}"]`
  );

  if (count) {
    count.textContent =
      `${state.likeCount} Likes · ${state.commentCount} Maoni`;
  }

  const like = document.querySelector(
    `.like-button[data-content-type="${type}"][data-content-id="${id}"]`
  );

  if (like) {
    like.classList.toggle("liked", state.liked);
    like.textContent = state.liked ? "♥ Ume-like" : "♥ Like";
  }
}

async function refreshEngagement(type, id) {
  try {
    const state = await getEngagement(type, id);
    updateEngagementDisplay(type, id, state);
  } catch (error) {
    console.error("Refresh engagement", error);
  }
}

/* =========================
   DIRISHA LA MAONI
========================= */

async function showComments(type, id) {
  const area = $("commentsArea");
  const list = $("commentsList");

  area.dataset.type = type;
  area.dataset.id = id;

  $("commentMessage").textContent = "";
  list.innerHTML = "<p>Inapakia maoni...</p>";

  showDialog("commentsDialog");

  try {
    const { data, error } = await sb
      .from("content_comments")
      .select("id,author_name,body,created_at")
      .eq("content_type", type)
      .eq("content_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    list.replaceChildren();

    if (!data.length) {
      list.innerHTML =
        '<p class="empty">Bado hakuna maoni. Kuwa wa kwanza kutoa maoni.</p>';
      return;
    }

    data.forEach(comment => {
      const item = document.createElement("article");
      item.className = "comment-item";

      const name = document.createElement("strong");
      name.textContent = comment.author_name || "Mwanachama";

      const body = document.createElement("p");
      body.textContent = comment.body;

      const date = document.createElement("small");
      date.textContent =
        new Date(comment.created_at).toLocaleString("sw-TZ");

      item.append(name, body, date);
      list.append(item);
    });
  } catch (error) {
    list.textContent =
      error.message || "Imeshindikana kupakia maoni.";
  }
}

$("commentForm").addEventListener("submit", async event => {
  event.preventDefault();

  const area = $("commentsArea");
  const type = area.dataset.type;
  const id = area.dataset.id;

  const message = $("commentMessage");
  const button =
    $("commentForm").querySelector('[type="submit"]');

  if (!sb || !type || !id) return;

  try {
    const user = await requireLogin(message);
    if (!user) return;

    const body = $("commentInput").value.trim();

    if (!body) {
      message.textContent = "Andika maoni kwanza.";
      return;
    }

    button.disabled = true;

    const author =
      user.user_metadata?.full_name ||
      user.email ||
      user.phone ||
      "Mwanachama";

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

    $("commentInput").value = "";
    message.textContent = "Maoni yako yametumwa.";

    await showComments(type, id);
    await refreshEngagement(type, id);

    toast("Maoni yamehifadhiwa.");
  } catch (error) {
    message.textContent =
      error.message || "Imeshindikana kutuma maoni.";
  } finally {
    button.disabled = false;
  }
});

/* =========================
   VITufe VYA LIKE NA MAONI
========================= */

async function addEngagement(card, type, id) {
  const bar = document.createElement("div");
  bar.className = "engagement-bar";

  const like = document.createElement("button");
  like.type = "button";
  like.className = "like-button";
  like.textContent = "♥ Like";
  like.dataset.contentType = type;
  like.dataset.contentId = id;

  const comments = document.createElement("button");
  comments.type = "button";
  comments.className = "comment-button";
  comments.textContent = "💬 Maoni";

  const count = document.createElement("span");
  count.className = "engagement-count";
  count.dataset.contentType = type;
  count.dataset.contentId = id;
  count.textContent = "Inapakia...";

  bar.append(like, comments, count);
  card.append(bar);

  try {
    const state = await getEngagement(type, id);

    count.textContent =
      `${state.likeCount} Likes · ${state.commentCount} Maoni`;

    like.classList.toggle("liked", state.liked);
    like.textContent = state.liked
      ? "♥ Ume-like"
      : "♥ Like";
  } catch (error) {
    console.error("Engagement load", error);
    count.textContent = "Like na maoni";
  }

  like.onclick = async () => {
    try {
      const user = await requireLogin(null);
      if (!user) return;

      like.disabled = true;

      const { data, error } = await sb
        .from("content_likes")
        .select("id")
        .eq("content_type", type)
        .eq("content_id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const { error: deleteError } = await sb
          .from("content_likes")
          .delete()
          .eq("id", data.id);

        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await sb
          .from("content_likes")
          .insert({
            user_id: user.id,
            content_type: type,
            content_id: id
          });

        if (insertError) throw insertError;
      }

      const fresh = await getEngagement(type, id);

      updateEngagementDisplay(type, id, fresh);
    } catch (error) {
      toast(error.message || "Imeshindikana kuhifadhi Like.");
    } finally {
      like.disabled = false;
    }
  };

  comments.onclick = () => showComments(type, id);
}

/* =========================
   KADI ZA PICHA NA MATANGAZO
========================= */

function contentCard(item, type, index, all) {
  const card = document.createElement("article");
  card.className = "photo-card";

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

  if (type === "advertisement" && item.target_url) {
    const link = document.createElement("a");

    link.href = item.target_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "contact-link";
    link.textContent = "Jifunze zaidi";

    card.append(link);
  }

  addEngagement(card, type, item.id);

  return card;
}

/* =========================
   PICHA ZA UMMA
========================= */

async function loadPublicPhotos() {
  const list = $("publicPhotoList");

  if (!sb) {
    $("photoCount").textContent = "Database haijaunganishwa";
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

    $("photoCount").textContent = "Hitilafu";

    list.innerHTML =
      '<div class="empty">Imeshindikana kupakia picha za umma.</div>';

    return;
  }

  $("photoCount").textContent = `${data.length} picha`;

  list.replaceChildren();

  if (!data.length) {
    list.innerHTML =
      '<div class="empty">Bado hakuna picha zilizoidhinishwa.</div>';
    return;
  }

  data.forEach((item, index) => {
    list.append(contentCard(item, "photo", index, data));
  });
}

/* =========================
   KUFUNGUA DIRISHA LA KUPAKIA PICHA
========================= */

$("publicPhotoOpen").onclick = async () => {
  if (!sb) {
    toast("Supabase haijaunganishwa.");
    return;
  }

  const user = await requireLogin($("publicPhotoMessage"));
  if (!user) return;

  $("publicPhotoForm").reset();
  $("publicPhotoMessage").textContent = "";

  showDialog("photoUploadDialog");
};

/* =========================
   KUPAKIA PICHA
========================= */

$("publicPhotoForm").addEventListener("submit", async event => {
  event.preventDefault();

  const message = $("publicPhotoMessage");
  const button =
    $("publicPhotoForm").querySelector('[type="submit"]');

  try {
    const user = await requireLogin(message);
    if (!user) return;

    const title = $("publicPhotoTitle").value.trim();
    const description =
      $("publicPhotoDescription").value.trim();

    const file = $("publicPhotoFile").files[0];

    if (!title || !file) {
      message.textContent =
        "Weka kichwa na uchague picha.";
      return;
    }

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      message.textContent = "Chagua JPG, PNG au WEBP.";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      message.textContent = "Picha imezidi MB 5.";
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

    message.textContent =
      "Picha imetumwa kwa ukaguzi wa msimamizi.";

    toast("Picha imetumwa kwa ukaguzi.");

    setTimeout(() => {
      if ($("photoUploadDialog").open) {
        $("photoUploadDialog").close();
      }
    }, 2200);

  } catch (error) {
    console.error(error);

    message.textContent =
      error.message || "Imeshindikana kupakia picha.";
  } finally {
    button.disabled = false;
    button.textContent = "Tuma picha kwa ukaguzi";
  }
});

/* =========================
   MALIPO YA MATANGAZO
========================= */

function selectedAdPrice() {
  return AD_PRICES[$("advertisementPlan").value] || 0;
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

$("advertisementPlan").addEventListener(
  "change",
  updatePaymentInstructions
);

$("advertisementPaymentMethod").addEventListener(
  "change",
  updatePaymentInstructions
);

/* =========================
   ADMIN TEST
========================= */

function createAdminTestControl() {
  const form = $("advertisementForm");

  if (!form || $("advertisementAdminTest")) return;

  const wrap = document.createElement("div");

  wrap.id = "ebyAdminTestWrap";
  wrap.hidden = true;

  wrap.style.cssText =
    "margin:16px 0;padding:14px;border:2px dashed #d69b16;" +
    "border-radius:12px;background:#fff9e8;color:#503b0a";

  wrap.innerHTML = `
<label style="display:flex;align-items:center;gap:10px;font-weight:800">
<input type="checkbox" id="advertisementAdminTest"
style="width:20px;height:20px">
JARIBIO LA ADMIN (BILA MALIPO)
</label>

<p id="ebyAdminTestNote" style="font-size:13px">
Hali hii ni kwa majaribio ya msimamizi pekee.
</p>
`;

  const payment = form.querySelector(".ad-payment");

  payment.parentNode.insertBefore(wrap, payment);

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
  const test =
    !!(currentIsAdmin && $("advertisementAdminTest")?.checked);

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

  const button =
    $("advertisementForm").querySelector('[type="submit"]');

  if (button && !button.disabled) {
    button.textContent = test
      ? "Tuma tangazo la majaribio"
      : "Tuma tangazo kwa ukaguzi";
  }
}

createAdminTestControl();

/* =========================
   KUFUNGUA TANGAZO
========================= */

$("advertisementOpen").onclick = async () => {
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

  $("advertisementForm").reset();
  $("advertisementMessage").textContent = "";

  updateAdminTestVisibility();
  updatePaymentInstructions();

  showDialog("advertisementDialog");
};

/* =========================
   KUTUMA TANGAZO
========================= */

$("advertisementForm").addEventListener("submit", async event => {
  event.preventDefault();

  const message = $("advertisementMessage");

  const button =
    $("advertisementForm").querySelector('[type="submit"]');

  if (!sb) {
    message.textContent = "Supabase haijaunganishwa.";
    return;
  }

  const { data: sessionData, error: sessionError } =
    await sb.auth.getSession();

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
  const description =
    $("advertisementDescription").value.trim();

  const file = $("advertisementImage").files[0];
  const plan = $("advertisementPlan").value;

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

  const test = testRequested && isAdmin;

  if (testRequested && !isAdmin) {
    message.textContent =
      "Huna ruhusa ya kutumia jaribio la admin.";
    return;
  }

  if (!title || !description || !file || !AD_PRICES[plan]) {
    message.textContent =
      "Jaza kichwa, maelezo, picha na kifurushi sahihi.";
    return;
  }

  if (
    !test &&
    (!paymentMethod || !payerName || !payerPhone || !transactionId)
  ) {
    message.textContent =
      "Jaza taarifa zote za malipo na muamala.";
    return;
  }

  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  ) {
    message.textContent =
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
    message.textContent =
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

    message.textContent = test
      ? "Jaribio limehifadhiwa. Halitaonekana kwa umma."
      : "Ombi limepokelewa. Malipo yanasubiri kuthibitishwa.";

    toast(
      test
        ? "Jaribio la admin limetumwa."
        : "Tangazo limetumwa kwa ukaguzi."
    );

    setTimeout(() => {
      if ($("advertisementDialog").open) {
        $("advertisementDialog").close();
      }
    }, 2500);

  } catch (error) {
    console.error(error);

    message.textContent =
      error.message || "Imeshindikana kutuma tangazo.";
  } finally {
    button.disabled = false;
    updateAdminTestFields();
  }
});

/* =========================
   MATANGAZO YALIYOIDHINISHWA
========================= */

async function loadAdvertisements() {
  const list = $("advertisementList");

  if (!sb) {
    $("advertisementCount").textContent =
      "Database haijaunganishwa";
    return;
  }

  const { data, error } = await sb
    .from("advertisements")
    .select("id,title,description,image_url,target_url")
    .eq("status", "active")
    .eq("payment_status", "approved")
    .eq("is_test", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error(error);

    $("advertisementCount").textContent = "Hitilafu";

    list.innerHTML =
      '<div class="empty">Matangazo yataonekana baada ya kuidhinishwa.</div>';

    return;
  }

  $("advertisementCount").textContent =
    `${data.length} matangazo`;

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
  loadAdvertisements();
  loadPublicPhotos();
} else {
  $("businessCount").textContent =
    $("advertisementCount").textContent =
    $("photoCount").textContent =
      "Inasubiri muunganisho";
}

refreshSession();

})();
