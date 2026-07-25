const upasabhaOptions = [
  "Akshaya - Gayathri",
  "Attingal",
  "Fort South",
  "Fort West",
  "Karamana",
  "Karumom",
  "Manacaud",
  "Neyattinkara",
  "Pappanamcode",
  "Peroor",
  "Perunthanni",
  "Puthen Street",
  "Sankar Nagar",
  "Sreekanteswaram",
  "Sreevaraham",
  "Thaliyal",
  "Tirumala",
  "Uloor - Pattom",
  "Valiyasala",
  "Vanchiyoor - Puthenchantha",
  "Vinayaka Nagar"
];

const eventOptions = [];

// Simple local event list per category (fallback)
const localCategoryEvents = {
  Balolsavam: [],
  Yuvajanotsavam: [],
  Vanitholsavam: [],
};

let dynamicEventOptions = [];
let eventTypeByValue = new Map();
let cachedSubcategories = null;
let lastMatchedSubcats = [];

const SUPABASE_URL = "https://uuwysumttyqcupydepul.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_SDMGM_WYNJk4oHifqpzA4Q_MRUY7igt";

let supabaseClient = null;
try {
  if (!SUPABASE_URL.includes("your-project-ref") && !SUPABASE_ANON_KEY.includes("your-")) {
    if (typeof createClient === "function") {
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else if (window.supabase && typeof window.supabase.createClient === "function") {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else if (window.supabase && typeof window.supabase.from === "function") {
      supabaseClient = window.supabase;
    }
  }
} catch (e) {
  console.warn("supabase client init error:", e);
}
if (!supabaseClient) console.warn("Supabase client not initialized — DB calls will be skipped.");
else console.log("Supabase client initialized");

function populateSelect(selectElement, options, placeholder = "Select an option") {
  if (!selectElement) return;
  selectElement.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.textContent = placeholder;
  defaultOption.value = "";
  defaultOption.disabled = true;
  defaultOption.selected = true;
  selectElement.appendChild(defaultOption);

  options.forEach((option) => {
    const optionElement = document.createElement("option");
    optionElement.value = option;
    optionElement.textContent = option;
    selectElement.appendChild(optionElement);
  });
}

// Check form validity including the 4 mandatory additions
function isFormComplete() {
  const name = document.getElementById("name")?.value.trim() || "";
  const dob = document.getElementById("dob")?.value.trim() || "";
  const age = document.getElementById("age")?.value.trim() || "";
  const gender = document.getElementById("gender")?.value.trim() || "";
  const fatherName = document.getElementById("fatherName")?.value.trim() || "";
  const motherName = document.getElementById("motherName")?.value.trim() || "";
  const classStudying = document.getElementById("classStudying")?.value.trim() || "";
  const schoolCollege = document.getElementById("schoolCollege")?.value.trim() || "";
  const mobile = document.getElementById("mobile")?.value.replace(/\D/g, "").trim() || "";
  const aadhar = document.getElementById("aadhar")?.value.replace(/\D/g, "").trim() || "";
  const upasabha = document.getElementById("upasabha")?.value.trim() || "";
  const category = document.getElementById("category")?.value.trim() || "";
  const selectedEvents = getSelectedEvents();

  return (
    name.length > 0 &&
    dob.length > 0 &&
    age.length > 0 &&
    gender.length > 0 &&
    fatherName.length > 0 &&
    motherName.length > 0 &&
    classStudying.length > 0 &&
    schoolCollege.length > 0 &&
    mobile.length === 10 &&
    aadhar.length === 12 &&
    upasabha.length > 0 &&
    category.length > 0 &&
    selectedEvents.length > 0
  );
}

function updateSubmitButtonState() {
  const submitButton = document.querySelector('#participantForm button[type="submit"]');
  if (!submitButton) return;
  submitButton.disabled = !isFormComplete();
}

function initializeForm() {
  populateSelect(document.getElementById("upasabha"), upasabhaOptions, "Select Upasabha");
  const catElem = document.getElementById("category");
  if (catElem) catElem.value = "";
  const subElem = document.getElementById("subcategory");
  if (subElem) subElem.value = "";
  dynamicEventOptions = [];
  eventTypeByValue.clear();
  renderEventCheckboxes();
  updateSubmitButtonState();
}

function getSelectedEvents() {
  return Array.from(document.querySelectorAll('#eventsContainer input[type="checkbox"]:checked')).map((option) => option.value);
}

function normalizeEventType(type) {
  if (!type) return null;
  const raw = String(type).trim().toLowerCase();
  if (raw === "literary") return "Literary";
  if (raw === "group") return "Group";
  if (raw === "solo") return "Solo";
  return null;
}

function getEventTypeForValue(value) {
  return eventTypeByValue.get(value);
}

function getSelectedEventTypeCounts(excludeValue = null) {
  const counts = { Literary: 0, Group: 0, Solo: 0 };
  document.querySelectorAll('#eventsContainer input[type="checkbox"]:checked').forEach((checkbox) => {
    if (excludeValue && checkbox.value === excludeValue) return;
    const type = normalizeEventType(getEventTypeForValue(checkbox.value));
    if (type) counts[type] = (counts[type] || 0) + 1;
  });
  return counts;
}

function validateEventSelection(value, eventType) {
  const normalizedType = normalizeEventType(eventType);
  if (!normalizedType) return true;

  const counts = getSelectedEventTypeCounts(value);
  const selectedCount = counts[normalizedType] || 0;
  const limit = normalizedType === "Literary" || normalizedType === "Group" ? 3 : normalizedType === "Solo" ? 5 : Infinity;

  if (selectedCount >= limit) {
    showSubmissionMessage(
      "Selection Limit Reached",
      `You have already selected ${limit} ${normalizedType} events, Unselect any to add new`,
      ""
    );
    return false;
  }

  return true;
}

function renderSelectedEvents() {
  const display = document.getElementById("eventsDisplay");
  const eventsSearch = document.getElementById("eventsSearch");
  if (!display) return;

  const selectedEvents = getSelectedEvents();
  display.innerHTML = "";

  selectedEvents.forEach((eventName) => {
    const chip = document.createElement("span");
    chip.className = "event-chip";
    chip.textContent = eventName;
    display.appendChild(chip);
  });

  if (eventsSearch) {
    display.appendChild(eventsSearch);
  }
}

async function updateEventsForCategory(category, matchedSubcats, genderValue) {
  if (supabaseClient && category) {
    try {
      const normSubcats = normalizeMatchedSubcats(matchedSubcats);
      let query = supabaseClient.from("events").select("eventname, eventid, event_type, subcategory, category, gender").eq("category", category);
      if (normSubcats) {
        if (Array.isArray(normSubcats) && normSubcats.length > 0) query = query.in("subcategory", normSubcats);
        else query = query.eq("subcategory", normSubcats);
      }
      if (genderValue) query = query.or(`gender.eq.${genderValue},gender.eq.NA`);
      const { data, error } = await query;
      if (error) {
        console.warn("events fetch error:", error);
      }
      let rows = data || [];

      if ((!rows || rows.length === 0) && normSubcats) {
        let fallbackQuery = supabaseClient.from("events").select("eventname, eventid, event_type, subcategory, category, gender").eq("category", category);
        if (genderValue) fallbackQuery = fallbackQuery.or(`gender.eq.${genderValue},gender.eq.NA`);
        const { data: fallbackData, error: fallbackErr } = await fallbackQuery;
        if (fallbackErr) {
          console.warn("events fallback fetch error:", fallbackErr);
        } else {
          rows = fallbackData || [];
        }
      }

      if ((!rows || rows.length === 0) && Array.isArray(localCategoryEvents[category]) && localCategoryEvents[category].length > 0) {
        eventTypeByValue.clear();
        dynamicEventOptions = localCategoryEvents[category].map((label) => {
          eventTypeByValue.set(label, null);
          return { value: label, label, type: null, category };
        });
      } else {
        eventTypeByValue.clear();
        dynamicEventOptions = rows
          .map((r) => {
            const label = `${r.eventid} - ${r.eventname}`;
            const type = normalizeEventType(r.event_type || r.eventtype || r.type || null);
            eventTypeByValue.set(label, type);
            return { value: label, label, type, category: r.category || category };
          })
          .filter((item) => item.value);
      }
      renderEventCheckboxes();
      return;
    } catch (e) {
      console.warn("updateEventsForCategory error:", e);
    }
  }

  eventTypeByValue.clear();
  dynamicEventOptions = Array.isArray(localCategoryEvents[category])
    ? localCategoryEvents[category].map((label) => {
        eventTypeByValue.set(label, null);
        return { value: label, label, type: null, category };
      })
    : [];
  renderEventCheckboxes();
}

function renderEventCheckboxes(filter = "") {
  const container = document.getElementById("eventsContainer");
  if (!container) return;
  container.innerHTML = "";

  const optionsSource = Array.isArray(dynamicEventOptions) && dynamicEventOptions.length ? dynamicEventOptions : eventOptions;
  const normalizedFilter = filter.trim().toLowerCase();
  const filteredEvents = optionsSource.filter((option) => {
    const label = typeof option === "object" ? option.label : option;
    return label.toLowerCase().includes(normalizedFilter);
  });

  if (filteredEvents.length === 0) {
    container.innerHTML = '<div class="event-empty">No events found</div>';
    return;
  }

  const groups = filteredEvents.reduce((acc, option) => {
    const category = typeof option === "object" ? option.category || "Events" : "Events";
    if (!acc[category]) acc[category] = [];
    acc[category].push(option);
    return acc;
  }, {});

  const categoryKeys = Object.keys(groups);

  categoryKeys.forEach((categoryName, index) => {
    const section = document.createElement("div");
    section.className = "event-category-group";
    section.style.paddingBottom = "10px";
    section.style.marginBottom = "10px";

    if (index < categoryKeys.length - 1) {
      section.style.borderBottom = "1px solid #e2e8f0";
    }

    const title = document.createElement("h3");
    title.className = "event-category-title event-category-heading";
    title.style.fontWeight = "bold";
    title.style.textDecoration = "underline";
    title.style.marginTop = "10px";
    title.style.marginBottom = "8px";
    title.style.fontSize = "1rem";
    title.style.color = "#1e293b";
    title.textContent = categoryName;
    section.appendChild(title);

    groups[categoryName].forEach((option) => {
      const wrapper = document.createElement("label");
      wrapper.className = "event-option";
      wrapper.style.display = "flex";
      wrapper.style.flexDirection = "row";
      wrapper.style.alignItems = "center";
      wrapper.style.justifyContent = "flex-start";
      wrapper.style.textAlign = "left";
      wrapper.style.gap = "10px";
      wrapper.style.cursor = "pointer";
      wrapper.style.padding = "6px 0";
      wrapper.style.width = "100%";

      const eventValue = typeof option === "object" ? option.value : option;
      const eventLabel = typeof option === "object" ? option.label : option;
      const eventType = typeof option === "object" ? option.type : null;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "events";
      checkbox.value = eventValue;
      checkbox.checked = getSelectedEvents().includes(eventValue);

      checkbox.style.display = "inline-block";
      checkbox.style.margin = "0";
      checkbox.style.flexShrink = "0";

      checkbox.addEventListener("change", () => {
        if (checkbox.checked && !validateEventSelection(eventValue, eventType)) {
          checkbox.checked = false;
          return;
        }
        renderSelectedEvents();
        updateSubmitButtonState();
      });

      const text = document.createElement("span");
      text.textContent = eventLabel;
      text.style.display = "inline-block";
      text.style.textAlign = "left";
      text.style.lineHeight = "1.3";

      wrapper.appendChild(checkbox);
      wrapper.appendChild(text);
      section.appendChild(wrapper);
    });

    container.appendChild(section);
  });
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) {
    document.getElementById("eventLabel").textContent = "(Select your Date of Birth and Gender to display the eligible events.).";
    return "";
  }

  document.getElementById("eventLabel").textContent = "";

  var today = new Date();
  var birthDate = new Date(dateOfBirth);
  var age = today.getFullYear() - birthDate.getFullYear();
  var m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function formatAadhaar(value) {
  const digits = value.replace(/\D/g, "").slice(0, 12);
  return digits.replace(/(\d{4})(?=\d)/g, "$1-");
}

function normalizeMatchedSubcats(matchedSubcats) {
  if (!matchedSubcats) return null;
  if (Array.isArray(matchedSubcats)) return matchedSubcats;
  const raw = String(matchedSubcats).trim();
  if (!raw) return null;
  if (raw.includes("|")) {
    return raw.split("|").map((item) => item.trim()).filter(Boolean);
  }
  if (raw.includes(",")) {
    return raw.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return raw;
}

async function fetchSubcategories() {
  if (!supabaseClient) return [];
  if (cachedSubcategories) return cachedSubcategories;
  const { data, error } = await supabaseClient.from("subcategories").select("id,from_dob,to_dob,name");
  if (error) {
    console.warn("Failed to load subcategories:", error);
    return [];
  }
  cachedSubcategories = data || [];
  try {
    cachedSubcategories = (cachedSubcategories || []).map((r) => {
      let from = r.from_dob;
      let to = r.to_dob;
      if (from instanceof Date) from = from.toISOString().slice(0, 10);
      else if (typeof from === "string") from = from.slice(0, 10);
      else from = null;

      if (to instanceof Date) to = to.toISOString().slice(0, 10);
      else if (typeof to === "string") to = to.slice(0, 10);
      else to = null;

      return { ...r, from_dob: from, to_dob: to };
    });
  } catch (e) {
    console.warn("Failed to normalize subcategory dates:", e);
  }

  return cachedSubcategories;
}

function dobInRange(dobDate, fromDateStr, toDateStr) {
  if (!dobDate) return false;

  function normalizeDateStrFlexible(s) {
    if (!s && s !== 0) return null;
    if (s instanceof Date) return s.toISOString().slice(0, 10);
    s = String(s).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    if (/^\d{4}\/\d{2}\/\d{2}/.test(s)) return s.slice(0, 10).replace(/\//g, '-');
    if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
    const dm = s.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})$/);
    if (dm) {
      const dd = dm[1].padStart(2, '0');
      const mm = dm[2].padStart(2, '0');
      const yyyy = dm[3];
      return `${yyyy}-${mm}-${dd}`;
    }
    const parsed = new Date(s);
    if (!isNaN(parsed)) return parsed.toISOString().slice(0, 10);
    return null;
  }

  let dobIso = dobDate instanceof Date ? dobDate.toISOString().slice(0, 10) : normalizeDateStrFlexible(dobDate);
  const fromIso = normalizeDateStrFlexible(fromDateStr) || "1900-01-01";
  const toIso = normalizeDateStrFlexible(toDateStr) || "2100-12-31";

  if (!dobIso) return false;

  const toMillis = (iso) => {
    const parts = iso.split("-").map(Number);
    return Date.UTC(parts[0], parts[1] - 1, parts[2]);
  };

  try {
    const dMillis = toMillis(dobIso);
    const fMillis = toMillis(fromIso);
    const tMillis = toMillis(toIso);
    const start = Math.min(fMillis, tMillis);
    const end = Math.max(fMillis, tMillis);
    return dMillis >= start && dMillis <= end;
  } catch (e) {
    console.warn("dobInRange parse error", dobDate, fromDateStr, toDateStr, e);
    return false;
  }
}

function genderMatchesSubcatName(name, gender) {
  if (!name) return false;
  if (!gender) return true;
  const lower = name.toLowerCase();
  if (lower.includes("(male)")) return gender === "Male";
  if (lower.includes("(female)")) return gender === "Female";
  return true;
}

async function getMatchingSubcategoryNames(dobValue, genderValue) {
  const subs = await fetchSubcategories();
  if (!dobValue) return [];

  const dobDate = new Date(dobValue);
  const matches = [];
  for (const row of subs) {
    try {
      const inRange = dobInRange(dobDate, row.from_dob, row.to_dob);
      const genderOk = genderMatchesSubcatName(row.name, genderValue);
      if (inRange && genderOk) matches.push(row.name);
    } catch (e) {
      console.warn("Error checking subcategory row:", row, e);
    }
  }
  return matches;
}

async function fetchEventsBySubcategory(matchedSubcats, genderValue) {
  if (!supabaseClient) return [];
  try {
    let q = supabaseClient.from("events").select("eventid,eventname,event_type,category,gender,subcategory");
    if (Array.isArray(matchedSubcats) && matchedSubcats.length > 0) q = q.in("subcategory", matchedSubcats);
    else if (typeof matchedSubcats === "string" && matchedSubcats.length > 0) q = q.eq("subcategory", matchedSubcats);
    if (genderValue) q = q.or(`gender.eq.${genderValue},gender.eq.NA`);
    const { data, error } = await q;
    if (error) {
      console.warn("fetchEventsBySubcategory error:", error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn("fetchEventsBySubcategory exception:", e);
    return [];
  }
}

async function applyCategoryRules() {
  const dobValue = document.getElementById("dob")?.value;
  const genderValue = document.getElementById("gender")?.value;

  if (!dobValue) {
    if (document.getElementById("category")) document.getElementById("category").value = "";
    if (document.getElementById("subcategory")) document.getElementById("subcategory").value = "";
    dynamicEventOptions = [];
    eventTypeByValue.clear();
    renderEventCheckboxes();
    updateSubmitButtonState();
    return;
  }

  let matchedSubcats = await getMatchingSubcategoryNames(dobValue, genderValue);

  if (matchedSubcats.length === 0) {
    try {
      const subs = await fetchSubcategories();
      const dobDate = dobValue ? new Date(dobValue) : null;
      const dobOnly = (subs || []).filter((row) => dobDate && dobInRange(dobDate, row.from_dob, row.to_dob)).map((r) => r.name);
      if (dobOnly.length > 0) {
        matchedSubcats = dobOnly;
      }
    } catch (e) {
      console.warn("applyCategoryRules fallback error:", e);
    }
  }

  lastMatchedSubcats = matchedSubcats;
  const subField = document.getElementById("subcategory");
  if (subField) {
    subField.value = Array.isArray(matchedSubcats) ? matchedSubcats.join(" | ") : matchedSubcats || "";
  }

  let categories = [];
  let eventRows = [];

  try {
    const rows = await fetchEventsBySubcategory(normalizeMatchedSubcats(matchedSubcats), genderValue);
    if (rows && rows.length > 0) {
      eventRows = rows;
      categories = Array.from(new Set(rows.map((r) => r.category).filter(Boolean)));

      eventTypeByValue.clear();
      dynamicEventOptions = rows
        .map((r) => {
          const label = `${r.eventid} - ${r.eventname}`;
          const type = normalizeEventType(r.event_type || r.eventtype || r.type || null);
          const categoryName = r.category || "Other";
          eventTypeByValue.set(label, type);
          return { value: label, label, type, category: categoryName };
        })
        .filter((item) => item.value);

      const catField = document.getElementById("category");
      if (catField) {
        catField.value = categories.join(" | ");
      }
    }
  } catch (e) {
    console.warn("applyCategoryRules events fetch error:", e);
  }

  if ((!categories || categories.length === 0) && dobValue) {
    try {
      const age = calculateAge(dobValue);
      if (window.categoryRules && typeof window.categoryRules.getCategoryState === "function") {
        const localState = window.categoryRules.getCategoryState(age, genderValue, "");
        categories = localState.options || [];
        const catField = document.getElementById("category");
        if (catField) catField.value = categories.join(" | ");
      }
    } catch (e) {
      console.warn("applyCategoryRules local fallback error:", e);
    }
  }

  if (eventRows.length === 0) {
    dynamicEventOptions = [];
  }

  renderEventCheckboxes();
  updateSubmitButtonState();
}

const eventsDisplay = document.getElementById("eventsDisplay");
const eventsDropdown = document.getElementById("eventsDropdown");
const eventsSearch = document.getElementById("eventsSearch");

if (eventsDisplay && eventsDropdown) {
  if (eventsSearch) {
    eventsSearch.addEventListener("click", (e) => {
      e.stopPropagation();
      eventsDropdown.hidden = false;
    });

    eventsSearch.addEventListener("input", (e) => {
      renderEventCheckboxes(e.target.value); 
    });
  }

  eventsDisplay.addEventListener("click", (e) => {
    if (e.target === eventsSearch) return;

    eventsDropdown.hidden = !eventsDropdown.hidden;

    if (!eventsDropdown.hidden && eventsSearch) {
      eventsSearch.focus();
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".event-picker")) {
      eventsDropdown.hidden = true;
    }
  });
}

const dobField = document.getElementById("dob");
if (dobField) {
  const updateAge = (event) => {
    const ageField = document.getElementById("age");
    if (ageField) ageField.value = calculateAge(event.target.value);
    applyCategoryRules();
  };

  dobField.addEventListener("input", updateAge);
  dobField.addEventListener("change", updateAge);
}

const mobileField = document.getElementById("mobile");
if (mobileField) {
  mobileField.addEventListener("input", (event) => {
    event.target.value = event.target.value.replace(/\D/g, "").slice(0, 10);
    updateSubmitButtonState();
  });
}

const aadharField = document.getElementById("aadhar");
if (aadharField) {
  aadharField.addEventListener("input", (event) => {
    event.target.value = formatAadhaar(event.target.value);
    updateSubmitButtonState();
  });
}

// Register live validation on all mandatory inputs
function registerFieldValidation() {
  [
    "name",
    "dob",
    "gender",
    "fatherName",
    "motherName",
    "classStudying",
    "schoolCollege",
    "mobile",
    "aadhar",
    "upasabha"
  ].forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener("input", updateSubmitButtonState);
      field.addEventListener("change", updateSubmitButtonState);
    }
  });

  const eventsContainer = document.getElementById("eventsContainer");
  if (eventsContainer) {
    eventsContainer.addEventListener("change", (e) => {
      if (e.target.matches('input[type="checkbox"]')) {
        renderSelectedEvents();

        if (typeof updateSubmitButtonState === "function") {
          updateSubmitButtonState();
        }
      }
    });
  }
}

const genderField = document.getElementById("gender");
if (genderField) {
  genderField.addEventListener("change", () => {
    applyCategoryRules();
    updateSubmitButtonState();
  });
}

function generateParticipantId() {
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
  const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PART-${timestamp}-${randomSuffix}`;
}

// Build output payload with the new fields
function getRegistrationPayload() {
  const selectedEvents = Array.from(document.querySelectorAll('#eventsContainer input[type="checkbox"]:checked'))
    .map((option) => option.value)
    .join(", ");

  const subcatVal = (document.getElementById("subcategory") && document.getElementById("subcategory").value) || (lastMatchedSubcats || []).join(" | ");

  return {
    id: generateParticipantId(),
    name: document.getElementById("name").value.trim(),
    date_of_birth: document.getElementById("dob").value,
    age: parseInt(document.getElementById("age").value, 10) || null,
    gender: document.getElementById("gender").value,
    father_name: document.getElementById("fatherName").value.trim(),
    mother_name: document.getElementById("motherName").value.trim(),
    class_studying: document.getElementById("classStudying").value.trim(),
    school_college: document.getElementById("schoolCollege").value.trim(),
    mobile_number: document.getElementById("mobile").value,
    aadhar_number: document.getElementById("aadhar").value.replace(/\D/g, ""),
    upasabha: document.getElementById("upasabha").value,
    category: document.getElementById("category").value,
    event_type: subcatVal,
    events: selectedEvents,
    created_at: new Date().toISOString(),
  };
}

async function isAadhaarRegistered(aadhaarNumber) {
  try {
    if (!supabaseClient) return false;
    const normalized = String(aadhaarNumber || "").replace(/\D/g, "");
    if (!normalized) return false;
    const { data, error } = await supabaseClient
      .from("participants")
      .select("id")
      .eq("aadhar_number", normalized)
      .limit(1);
    if (error) {
      console.warn("isAadhaarRegistered supabase error:", error);
      return false;
    }
    if (Array.isArray(data)) return data.length > 0;
    return !!data;
  } catch (e) {
    console.warn("isAadhaarRegistered error:", e);
    return false;
  }
}

function showSubmissionMessage(title, subtitle, message) {
  const popup = document.createElement("div");
  popup.className = "popup-overlay";
  popup.innerHTML = `
    <div class="popup-card">
      <h3>${title}</h3>
      <p class="popup-subtitle">${subtitle}</p>
      <p class="popup-message">${message}</p>
      <button type="button" class="popup-close">Close</button>
    </div>
  `;

  document.body.appendChild(popup);

  popup.querySelector(".popup-close").addEventListener("click", () => {
    popup.remove();
  });
}

const participantForm = document.getElementById("participantForm");
if (participantForm) {
  participantForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!supabaseClient) {
      showSubmissionMessage("Error", "Submission Failed", "Supabase is not configured yet. Please check your config.");
      return;
    }

    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {
      const payload = getRegistrationPayload();
      const alreadyRegistered = await isAadhaarRegistered(payload.aadhar_number);

      if (alreadyRegistered) {
        showSubmissionMessage("Error", "Submission Failed", "Participant already registered with this identity number.");
        return;
      }

      const { error } = await supabaseClient.from("participants").insert([payload]);

      if (error) {
        throw error;
      }

      showSubmissionMessage("Success", "Registration Submitted", "Your registration has been saved successfully.");
      form.reset();
      if (typeof initializeForm === "function") {
        initializeForm();
      }
      if (document.getElementById("age")) document.getElementById("age").value = "";
      if (document.getElementById("eventsSearch")) document.getElementById("eventsSearch").value = "";
      if (document.getElementById("eventsDropdown")) document.getElementById("eventsDropdown").hidden = true;
      renderSelectedEvents();
      updateSubmitButtonState();
    } catch (error) {
      console.error(error);
      showSubmissionMessage("Error", "Submission Failed", error.message || "Please try again.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Submit";
    }
  });
}

if (typeof initializeForm === "function") {
  initializeForm();
}
if (typeof registerFieldValidation === "function") {
  registerFieldValidation();
}