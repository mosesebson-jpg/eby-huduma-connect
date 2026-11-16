
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

$("year").textContent = new Date().getFullYear();

/* =====================================================
   ADMIN DASHBOARD NDANI YA UKURASA MKUU
===================================================== */

function openAdminDashboard() {
  if (!currentIsAdmin) {
    toast("Huna ruhusa ya kufungua Admin Dashboard.");
    return;
  }

  const main = $("mainContent");
  const dashboard = $("embeddedAdminSection");
  const footer = $("mainFooter");

  if (!dashboard) {
    toast("Sehemu ya Admin Dashboard haijapatikana.");
    return;
  }

  if (main) main.hidden = true;
  if (footer) footer.hidden = true;

  dashboard.hidden = false;

  $("nav")?.classList.remove("open");

  dashboard.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function closeAdminDashboard() {
  const main = $("mainContent");
  const dashboard = $("embeddedAdminSection");
  const footer = $("mainFooter");

  if (dashboard) dashboard.hidden = true;
  if (main) main.hidden = false;
  if (footer) footer.hidden = false;

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

/* =====================================================
   UKAGUZI WA ADMIN
===================================================== */

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

/* =====================================================
   LOGIN NA USAJILI
===================================================== */

function setAuthMode(mode) {
  authMode = mode;

  const signup = mode === "signup";

  $("authTitle").textContent = signup
    ? "Tengeneza akaunti"
    : "Ingia kwenye akaunti";

  $("nameWrap").classList.toggle("hidden", !signup);

  $("authSubmit").textContent = signup
    ? "Jisajili"
    : "Ingia";

  $("loginTab").classList.toggle("active", !signup);
  $("signupTab").classList.toggle("active", signup);

  $("authMessage").textContent = "";
}

function updateAuthIdentifier() {
  const phone = $("authMethod").value === "phone";

  $("identifierLabel").childNodes[0].textContent =
    phone ? "Namba ya simu" : "Barua pepe";

  $("identifier").type = phone ? "tel" : "email";

  $("identifier").autocomplete = phone
    ? "tel"
    : "email";

  $("identifier").placeholder = phone
    ? "+2557XXXXXXXX"
    : "barua@mfano.com";

  $("identifierHint").textContent = phone
    ? "Tumia mfumo wa kimataifa, mfano +255712345678. SMS Auth lazima iwe imewashwa."
    : "Tumia barua pepe unayoweza kuifikia.";
}

$("authMethod").addEventListener(
  "change",
  updateAuthIdentifier
);

updateAuthIdentifier();

$("providerOpen").addEventListener("click", () => {
  showDialog("providerDialog");
});

$("providerOpen2").addEventListener("click", () => {
  showDialog("providerDialog");
});

$("loginTab").addEventListener("click", () => {
  setAuthMode("login");
});

$("signupTab").addEventListener("click", () => {
  setAuthMode("signup");
});

/* =====================================================
   MENYU YA AKAUNTI
===================================================== */

const accountMenu = document.createElement("div");

accountMenu.id = "ebyAccountMenu";
accountMenu.hidden = true;

accountMenu.style.cssText =
  "position:absolute;z-index:9999;right:16px;top:72px;min-width:240px;max-width:calc(100vw - 32px);padding:16px;background:#fff;color:#172b45;border:1px solid #dce5ef;border-radius:16px;box-shadow:0 12px 35px #0002";

accountMenu.innerHTML = `
<p id="ebyAccountStatus" style="margin:0 0 12px;font-weight:700;overflow-wrap:anywhere"></p>

<button type="button" id="ebyStaySignedIn" style="width:100%;padding:12px;border:0;border-radius:10px;background:#eaf3ff;color:#07518b;font-weight:700;margin-bottom:8px">
Endelea kubaki umeingia
</button>

<button type="button" id="ebySignOut" style="width:100%;padding:12px;border:0;border-radius:10px;background:#07518b;color:#fff;font-weight:700">
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

/* =====================================================
   KUREJESHA SESSION
===================================================== */

async function refreshSession() {
  if (!sb) {
    setAccountButton(null);
    updateAdminTestVisibility();
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

      await Promise.all([
        loadAdvertisements(),
        loadPublicPhotos()
      ]);
    });
  });
}

/* =====================================================
   KUTUMA LOGIN / USAJILI
===================================================== */

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

    $("authMessage").textContent =
      authMode === "signup"
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

/* =====================================================
   KUTHIBITISHA MTUMIAJI
===================================================== */

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

/* =====================================================
   USAJILI WA BIASHARA
===================================================== */

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

  } catch (error) {
    $("businessMessage").textContent =
      error.message || "Imeshindikana kutuma ombi.";

  } finally {
    button.disabled = false;
  }
});

/* =====================================================
   KUONYESHA BIASHARA
===================================================== */

async function loadBusinesses(search = "", category = "") {
  const list = $("businessList");

  if (!sb) {
    $("businessCount").textContent =
      "Database haijaunganishwa";
    return;
  }

  let query = sb
    .from("businesses")
    .select("id,name,description,category,phone,whatsapp,region,district,is_verified")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(30);

  if (category) {
    query = query.ilike("category", category);
  }

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

  $("businessCount").textContent =
    `${data.length} biashara`;

  list.innerHTML = "";

  if (!data.length) {
    list.innerHTML =
      '<div class="empty">Bado hakuna biashara zilizoidhinishwa kwenye kundi hili.</div>';
    return;
  }

  data.forEach(item => {
    const card = document.createElement("article");
    card.className = "business-card";

    const categoryLabel = document.createElement("span");
    categoryLabel.className = "pill";
    categoryLabel.textContent = item.category || "Huduma";

    const heading = document.createElement("h3");
    heading.textContent = item.name;

    const description = document.createElement("p");
    description.textContent =
      item.description ||
      "Wasiliana na mtoa huduma kupata maelezo zaidi.";

    const location = document.createElement("small");
    location.textContent =
      [item.district, item.region]
        .filter(Boolean)
        .join(", ");

    card.append(
      categoryLabel,
      heading,
      description,
      location
    );

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

/* =====================================================
   PHOTO VIEWER
===================================================== */

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
  $("viewerDescription").textContent =
    item.description || "";

  $("viewerCounter").textContent =
    `${viewerIndex + 1} / ${viewerItems.length}`;
}

function moveViewer(step) {
  if (!viewerItems.length) return;

  viewerIndex =
    (viewerIndex + step + viewerItems.length) %
    viewerItems.length;

  renderViewer();
}

$("viewerClose").onclick = () => {
  $("photoViewerDialog").close();
};

$("viewerPrev").onclick = () => moveViewer(-1);
$("viewerNext").onclick = () => moveViewer(1);

$("viewerImage").addEventListener("touchstart", event => {
  touchStartX = event.changedTouches[0].screenX;
}, { passive: true });

$("viewerImage").addEventListener("touchend", event => {
  const dx =
    event.changedTouches[0].screenX - touchStartX;

  if (Math.abs(dx) > 45) {
    moveViewer(dx < 0 ? 1 : -1);
  }
}, { passive: true });

document.addEventListener("keydown", event => {
  if (!$("photoViewerDialog").open) return;

  if (event.key === "ArrowRight") moveViewer(1);
  if (event.key === "ArrowLeft") moveViewer(-1);
});

/* =====================================================
   LIKES NA MAONI
===================================================== */

async function engagementData(type, id) {
  const [likes, commentCount, comments, mine] =
    await Promise.all([
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
        : Promise.resolve({
            data: null,
            error: null
          })
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

        if (
          currentUser &&
          comment.user_id === currentUser.id
        ) {
          const edit = document.createElement("button");

          edit.type = "button";
          edit.textContent = "✏️ Hariri";
          edit.className = "comment-edit-btn";

          edit.style.cssText =
            "display:block;margin:7px 0 0;padding:6px 10px;border:1px solid #0757a6;border-radius:8px;background:#fff;color:#0757a6;font-weight:700;cursor:pointer";

          edit.onclick = () => {
            showCommentEditor(comment, row);
          };

          row.append(edit);
        }

        comments.prepend(row);
      });

    } catch (error) {
      console.error("Engagement load", error);

      hint.textContent =
        "Imeshindikana kupakia Likes/maoni. Angalia sera za Supabase.";
    }
  }

  function showCommentEditor(comment, row) {
    if (row.querySelector(".comment-edit-form")) return;

    const editor = document.createElement("form");
    editor.className = "comment-edit-form";

    editor.style.cssText =
      "display:grid;gap:8px;margin-top:10px";

    const textarea = document.createElement("textarea");
    textarea.value = comment.body;
    textarea.maxLength = 1000;
    textarea.required = true;
    textarea.rows = 3;

    textarea.style.cssText =
      "width:100%;box-sizing:border-box;padding:10px;border:1px solid #b8c8da;border-radius:9px;font:inherit;resize:vertical";

    const buttons = document.createElement("div");
    buttons.style.cssText =
      "display:flex;gap:8px;flex-wrap:wrap";

    const save = document.createElement("button");
    save.type = "submit";
    save.textContent = "Hifadhi mabadiliko";

    save.style.cssText =
      "padding:8px 12px;border:0;border-radius:8px;background:#0757a6;color:white;font-weight:700";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Ghairi";

    cancel.style.cssText =
      "padding:8px 12px;border:1px solid #c7d3df;border-radius:8px;background:#fff;color:#24364b";

    cancel.onclick = () => editor.remove();

    buttons.append(save, cancel);
    editor.append(textarea, buttons);
    row.append(editor);

    textarea.focus();

    editor.onsubmit = async event => {
      event.preventDefault();

      const updatedBody = textarea.value.trim();

      if (!updatedBody) {
        textarea.focus();
        return;
      }

      try {
        const user = await requireLogin(hint);

        if (!user) return;

        if (user.id !== comment.user_id) {
          hint.textContent =
            "Unaweza kuhariri maoni yako mwenyewe tu.";
          return;
        }

        save.disabled = true;
        save.textContent = "Inahifadhi...";

        const { error } = await sb
          .from("content_comments")
          .update({ body: updatedBody })
          .eq("id", comment.id)
          .eq("user_id", user.id);

        if (error) throw error;

        await refresh();

        toast("Maoni yamehaririwa kikamilifu.");

      } catch (error) {
        console.error("Comment update", error);

        hint.textContent =
          error.message ||
          "Imeshindikana kuhariri maoni. Hakikisha ruhusa ya UPDATE imewekwa Supabase.";

      } finally {
        save.disabled = false;
        save.textContent = "Hifadhi mabadiliko";
      }
    };
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
        const { error: deleteError } = await sb
          .from("content_likes")
          .delete()
          .eq("id", old.id);

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

/* =====================================================
   NAMBA ZA TANZANIA
===================================================== */

function normalizeTanzaniaPhone(value) {
  let number = String(value || "").replace(/\D/g, "");

  if (number.startsWith("0")) {
    number = "255" + number.slice(1);
  } else if (number.startsWith("+")) {
    number = number.slice(1);
  }

  if (number.startsWith("255")) return number;

  if (number.length >= 9 && number.length <= 12) {
    return "255" + number;
  }

  return "";
}

/* =====================================================
   MAWASILIANO YA PICHA
===================================================== */

function addPhotoContact(card, item) {
  const number = normalizeTanzaniaPhone(
    item.whatsapp_phone
  );

  if (!number) return;

  const wrap = document.createElement("div");
  wrap.className = "photo-contact-actions";

  wrap.style.cssText =
    "display:flex;gap:8px;flex-wrap:wrap;margin:10px 0";

  const whatsapp = document.createElement("a");

  whatsapp.href = `https://wa.me/${number}`;
  whatsapp.target = "_blank";
  whatsapp.rel = "noopener noreferrer";
  whatsapp.className = "contact-link";
  whatsapp.textContent = "WhatsApp";

  whatsapp.style.cssText =
    "background:#168b52;color:white";

  const call = document.createElement("a");

  call.href = `tel:+${number}`;
  call.className = "contact-link";
  call.textContent = "Piga simu";

  wrap.append(whatsapp, call);
  card.append(wrap);
}

/* =====================================================
   KITufe CHA KUHARIRI CHAPISHO
===================================================== */

function addOwnerEditButton(card, item, type) {
  const ownerField =
    type === "photo" ? "user_id" : "owner_id";

  if (!currentUser || item[ownerField] !== currentUser.id) {
    return;
  }

  const button = document.createElement("button");

  button.type = "button";
  button.textContent = "✏️ Hariri chapisho lako";
  button.className = "content-edit-button";

  button.style.cssText =
    "margin:10px 0;padding:9px 13px;border:1px solid #0757a6;border-radius:9px;background:#eef6ff;color:#0757a6;font-weight:800;cursor:pointer";

  button.onclick = () => {
    showContentEditor(card, item, type);
  };

  card.append(button);
}

/* =====================================================
   KUHARIRI PICHA NA MATANGAZO
===================================================== */

function showContentEditor(card, item, type) {
  if (card.querySelector(".content-edit-form")) return;

  const photo = type === "photo";
  const table = photo ? "public_photos" : "advertisements";
  const ownerField = photo ? "user_id" : "owner_id";

  const form = document.createElement("form");
  form.className = "content-edit-form";

  form.style.cssText =
    "display:grid;gap:9px;margin:12px 0;padding:13px;background:#f3f7fc;border:1px solid #d5e2f0;border-radius:12px";

  const title = document.createElement("input");

  title.value = item.title || "";
  title.maxLength = 120;
  title.required = true;
  title.placeholder = "Kichwa";

  title.style.cssText =
    "width:100%;box-sizing:border-box;padding:11px;border:1px solid #c7d3df;border-radius:8px;font:inherit";

  const description = document.createElement("textarea");

  description.value = item.description || "";
  description.maxLength = photo ? 1000 : 1500;
  description.rows = 3;
  description.placeholder = "Maelezo";

  description.style.cssText = title.style.cssText;

  form.append(title, description);

  let phone = null;

  if (photo) {
    phone = document.createElement("input");

    phone.type = "tel";
    phone.value = item.whatsapp_phone || "";
    phone.placeholder = "Namba ya WhatsApp / simu";
    phone.style.cssText = title.style.cssText;

    form.append(phone);
  }

  let adWhatsapp = null;

  if (!photo) {
    adWhatsapp = document.createElement("input");

    adWhatsapp.type = "tel";
    adWhatsapp.value = item.whatsapp_phone || "";
    adWhatsapp.placeholder = "Namba ya WhatsApp ya tangazo";
    adWhatsapp.style.cssText = title.style.cssText;

    form.append(adWhatsapp);
  }

  const message = document.createElement("small");
  message.style.color = "#a33";

  const actions = document.createElement("div");

  actions.style.cssText =
    "display:flex;gap:8px;flex-wrap:wrap";

  const save = document.createElement("button");

  save.type = "submit";
  save.textContent = "Hifadhi mabadiliko";

  save.style.cssText =
    "padding:9px 13px;border:0;border-radius:8px;background:#0757a6;color:white;font-weight:800";

  const cancel = document.createElement("button");

  cancel.type = "button";
  cancel.textContent = "Ghairi";

  cancel.style.cssText =
    "padding:9px 13px;border:1px solid #c7d3df;border-radius:8px;background:white";

  cancel.onclick = () => form.remove();

  actions.append(save, cancel);
  form.append(message, actions);

  card.append(form);
  title.focus();

  form.onsubmit = async event => {
    event.preventDefault();

    try {
      const user = await requireLogin(message);

      if (!user) return;

      if (user.id !== item[ownerField]) {
        message.textContent =
          "Unaweza kuhariri chapisho lako mwenyewe tu.";
        return;
      }

      const newTitle = title.value.trim();
      const newDescription = description.value.trim();

      if (!newTitle) {
        message.textContent =
          "Weka kichwa cha chapisho.";
        return;
      }

      const updates = {
        title: newTitle,
        description: newDescription
      };

      if (photo) {
        const raw = phone.value.trim();

        const normalized = raw
          ? normalizeTanzaniaPhone(raw)
          : null;

        if (raw && !normalized) {
          message.textContent =
            "Kagua namba. Mfano 0712345678 au +255712345678.";
          return;
        }

        updates.whatsapp_phone = normalized;

      } else {
        const raw = adWhatsapp.value.trim();

        const normalized = raw
          ? normalizeTanzaniaPhone(raw)
          : null;

        if (raw && !normalized) {
          message.textContent =
            "Kagua namba ya WhatsApp ya tangazo.";
          return;
        }

        updates.whatsapp_phone = normalized;
      }

      save.disabled = true;
      save.textContent = "Inahifadhi...";

      const { data, error } = await sb
        .from(table)
        .update(updates)
        .eq("id", item.id)
        .eq(ownerField, user.id)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(
          "Hakuna rekodi iliyobadilishwa. Hakikisha sera ya UPDATE ya mmiliki imewekwa Supabase."
        );
      }

      item.title = newTitle;
      item.description = newDescription;
      item.whatsapp_phone = updates.whatsapp_phone;

      await (
        photo
          ? loadPublicPhotos()
          : loadAdvertisements()
      );

      toast("Mabadiliko yamehifadhiwa.");

    } catch (error) {
      console.error("Content edit", error);

      message.textContent =
        error.message ||
        "Imeshindikana kuhifadhi mabadiliko.";

    } finally {
      save.disabled = false;
      save.textContent = "Hifadhi mabadiliko";
    }
  };
}

/* =====================================================
   KADI ZA PICHA NA MATANGAZO
===================================================== */

function contentCard(item, type, index, all) {
  const card = document.createElement("article");
  card.className = "business-card";

  const image = document.createElement("img");

  image.className = "photo-card-image";
  image.src = item.image_url;
  image.alt = item.title || "Picha";
  image.loading = "lazy";

  image.onclick = () => openViewer(all, index);

  const heading = document.createElement("h3");
  heading.textContent = item.title || "";

  const description = document.createElement("p");
  description.textContent = item.description || "";

  card.append(image, heading, description);

  if (type === "photo") {
    addPhotoContact(card, item);
  }

  if (type === "advertisement") {
    addAdvertisementContact(card, item);
  }

  addOwnerEditButton(card, item, type);

  addEngagement(card, type, item.id);

  return card;
}

/* =====================================================
   MAWASILIANO YA MATANGAZO
===================================================== */

function addAdvertisementContact(card, item) {
  if (item.target_url) {
    const link = document.createElement("a");

    link.href = item.target_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "contact-link";
    link.textContent = "Jifunze zaidi";

    card.append(link);
  }

  const number = normalizeTanzaniaPhone(
    item.whatsapp_phone
  );

  if (!number) return;

  const wrap = document.createElement("div");

  wrap.style.cssText =
    "display:flex;gap:8px;flex-wrap:wrap;margin:10px 0";

  const whatsapp = document.createElement("a");

  const message =
    `Habari, nimeiona biashara yako kupitia EBY HUDUMA CONNECT. Nimevutiwa na tangazo lako: ${item.title || "Tangazo"}. Naomba maelezo zaidi.`;

  whatsapp.href =
    `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  whatsapp.target = "_blank";
  whatsapp.rel = "noopener noreferrer";
  whatsapp.className = "contact-link";
  whatsapp.textContent = "WhatsApp";

  whatsapp.style.cssText =
    "background:#168b52;color:white";

  const call = document.createElement("a");

  call.href = `tel:+${number}`;
  call.className = "contact-link";
  call.textContent = "Piga simu";

  wrap.append(whatsapp, call);

  card.append(wrap);
}

/* =====================================================
   FIELD YA WHATSAPP YA PICHA
===================================================== */

function ensurePhotoPhoneField() {
  const form = $("publicPhotoForm");

  if (!form || $("publicPhotoWhatsapp")) return;

  const wrap = document.createElement("label");

  wrap.id = "publicPhotoWhatsappWrap";

  wrap.style.cssText =
    "display:grid;gap:6px;margin:12px 0";

  wrap.textContent =
    "Namba ya simu / WhatsApp (si lazima)";

  const input = document.createElement("input");

  input.id = "publicPhotoWhatsapp";
  input.type = "tel";
  input.inputMode = "tel";
  input.autocomplete = "tel";

  input.placeholder =
    "Mfano 0712345678 au +255712345678";

  input.style.cssText =
    "width:100%;box-sizing:border-box;padding:12px;border:1px solid #c7d3df;border-radius:10px;font:inherit";

  const note = document.createElement("small");

  note.textContent =
    "Weka namba ambayo wateja wanaweza kutumia kukupata. Kwenye picha zitaonekana WhatsApp na Piga simu.";

  wrap.append(input, note);

  const submit = form.querySelector('[type="submit"]');

  form.insertBefore(wrap, submit || null);
}

/* =====================================================
   KUPAKIA PICHA ZA UMMA
===================================================== */

async function loadPublicPhotos() {
  ensurePhotoPhoneField();

  const list = $("publicPhotoList");

  if (!sb) {
    $("photoCount").textContent =
      "Database haijaunganishwa";
    return;
  }

  const { data, error } = await sb
    .from("public_photos")
    .select("id,user_id,title,description,image_url,whatsapp_phone")
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

  $("photoCount").textContent =
    `${data.length} picha`;

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

/* =====================================================
   KUFUNGUA DIRISHA LA PAKIA PICHA
===================================================== */

$("publicPhotoOpen").onclick = async () => {
  if (!sb) {
    toast("Supabase haijaunganishwa.");
    return;
  }

  const user = await requireLogin(
    $("publicPhotoMessage")
  );

  if (!user) return;

  $("publicPhotoForm").reset();
  $("publicPhotoMessage").textContent = "";

  showDialog("photoUploadDialog");
};

/* =====================================================
   KUTUMA PICHA ZA UMMA
===================================================== */

$("publicPhotoForm").addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    const message = $("publicPhotoMessage");

    const button = $("publicPhotoForm")
      .querySelector('[type="submit"]');

    try {
      const user = await requireLogin(message);

      if (!user) return;

      const title =
        $("publicPhotoTitle").value.trim();

      const description =
        $("publicPhotoDescription").value.trim();

      const file =
        $("publicPhotoFile").files[0];

      const rawPhone =
        $("publicPhotoWhatsapp")?.value.trim() || "";

      const whatsappPhone = rawPhone
        ? normalizeTanzaniaPhone(rawPhone)
        : null;

      if (rawPhone && !whatsappPhone) {
        message.textContent =
          "Kagua namba ya simu. Mfano 0712345678 au +255712345678.";
        return;
      }

      if (!title || !file) {
        message.textContent =
          "Weka kichwa na uchague picha.";
        return;
      }

      if (
        !["image/jpeg", "image/png", "image/webp"]
          .includes(file.type)
      ) {
        message.textContent =
          "Chagua JPG, PNG au WEBP.";
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        message.textContent =
          "Picha imezidi MB 5.";
        return;
      }

      button.disabled = true;
      button.textContent = "Inapakia picha...";

      const ext =
        file.type === "image/jpeg"
          ? "jpg"
          : file.type === "image/png"
            ? "png"
            : "webp";

      const path =
        `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await sb
        .storage
        .from(PHOTO_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = sb
        .storage
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
          status: "pending",
          whatsapp_phone: whatsappPhone
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
  }
);

/* =====================================================
   BEI ZA MATANGAZO
===================================================== */

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

/* =====================================================
   FIELD YA WHATSAPP YA TANGAZO
===================================================== */

function ensureAdvertisementWhatsappField() {
  const form = $("advertisementForm");

  if (!form || $("advertisementWhatsapp")) return;

  const label = document.createElement("label");

  label.textContent =
    "Namba ya WhatsApp / Simu ya mtangazaji";

  const input = document.createElement("input");

  input.id = "advertisementWhatsapp";
  input.type = "tel";
  input.inputMode = "tel";

  input.placeholder =
    "Mfano: 0788309986";

  const note = document.createElement("small");

  note.className = "ad-note";

  note.textContent =
    "Hii ndiyo namba ambayo wateja watatumia kuwasiliana nawe. Si namba ya malipo.";

  label.append(input, note);

  const imageField = $("advertisementImage");

  const imageLabel = imageField?.closest("label");

  if (imageLabel) {
    imageLabel.before(label);
  } else {
    form.prepend(label);
  }
}

/* =====================================================
   JARIBIO LA ADMIN LA MATANGAZO
===================================================== */

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
  const adminButton = $("adminDashboardOpen");

  if (adminButton) {
    adminButton.hidden = !currentIsAdmin;
  }

  createAdminTestControl();

  const wrap = $("ebyAdminTestWrap");
  const checkbox = $("advertisementAdminTest");

  if (wrap && checkbox) {
    wrap.hidden = !currentIsAdmin;

    if (!currentIsAdmin) {
      checkbox.checked = false;
    }

    updateAdminTestFields();
  }
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

ensureAdvertisementWhatsappField();
createAdminTestControl();

/* =====================================================
   KUFUNGUA FOMU YA TANGAZO
===================================================== */

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

/* =====================================================
   KUTUMA TANGAZO
===================================================== */

$("advertisementForm").addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    const message = $("advertisementMessage");

    const button = $("advertisementForm")
      .querySelector('[type="submit"]');

    if (!sb) {
      message.textContent =
        "Supabase haijaunganishwa.";
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
      message.textContent =
        "Ingia kwenye akaunti kwanza.";

      showDialog("authDialog");
      return;
    }

    const title =
      $("advertisementTitle").value.trim();

    const description =
      $("advertisementDescription").value.trim();

    const file =
      $("advertisementImage").files[0];

    const rawWhatsapp =
      $("advertisementWhatsapp")?.value.trim() || "";

    const whatsappPhone = rawWhatsapp
      ? normalizeTanzaniaPhone(rawWhatsapp)
      : null;

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

    if (
      rawWhatsapp &&
      !whatsappPhone
    ) {
      message.textContent =
        "Kagua namba ya WhatsApp. Mfano 0712345678 au +255712345678.";
      return;
    }

    if (
      !title ||
      !description ||
      !file ||
      !AD_PRICES[plan]
    ) {
      message.textContent =
        "Jaza kichwa, maelezo, picha na kifurushi sahihi.";
      return;
    }

    if (
      !test &&
      (
        !paymentMethod ||
        !payerName ||
        !payerPhone ||
        !transactionId
      )
    ) {
      message.textContent =
        "Jaza taarifa zote za malipo na muamala.";
      return;
    }

    if (
      !["image/jpeg", "image/png", "image/webp"]
        .includes(file.type) ||
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
      const ext =
        file.type === "image/jpeg"
          ? "jpg"
          : file.type === "image/png"
            ? "png"
            : "webp";

      const path =
        `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await sb
        .storage
        .from(AD_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = sb
        .storage
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
        is_test: test,
        whatsapp_phone: whatsappPhone
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
  }
);

/* =====================================================
   KUPAKIA MATANGAZO YALIYOIDHINISHWA
===================================================== */

async function loadAdvertisements() {
  const list = $("advertisementList");

  if (!sb) {
    $("advertisementCount").textContent =
      "Database haijaunganishwa";
    return;
  }

  const { data, error } = await sb
    .from("advertisements")
    .select("id,owner_id,title,description,image_url,target_url,whatsapp_phone")
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

/* =====================================================
   KUANZISHA MFUMO
===================================================== */

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

ensurePhotoPhoneField();
ensureAdvertisementWhatsappField();

refreshSession();

})();
