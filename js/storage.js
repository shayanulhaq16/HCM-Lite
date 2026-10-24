// storage.js
// Yeh file localStorage ke saath kaam karne ke helper functions rakhti hai.
// Baaqi sab JS files yahan se functions le kar data save ya read karengi.

// localStorage mein se ek key ka data nikalta hai.
// localStorage sirf TEXT save karta hai, isliye JSON.parse se wapas object ya array banate hain.
function getData(key, defaultValue) {
  var raw = localStorage.getItem(key); // agar key nahi mili to null aayega

  if (raw === null) {
    return defaultValue; // pehli baar hai to default value (jaise khali list)
  }

  return JSON.parse(raw); // text ko wapas object/array banao
}

// localStorage mein data save karta hai.
// Object ya array ko JSON.stringify se text bana kar save karte hain.
function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Company ki settings lene ke liye. Agar company nahi bani to null.
function getCompany() {
  return getData("hcm_company", null);
}

// Company ki settings save karne ke liye.
function saveCompany(company) {
  saveData("hcm_company", company);
}

// Saare users (admin + employees) lene ke liye. Shuru mein khali list.
function getUsers() {
  return getData("hcm_users", []);
}

// Saare users save karne ke liye.
function saveUsers(users) {
  saveData("hcm_users", users);
}

// Check karta hai ke setup ho chuka hai ya nahi.
// Agar company save ho chuki hai to true, warna false.
function isSetupDone() {
  return getCompany() !== null;
}

// Har naye user ke liye unique id banata hai (current time ka number).
function newId() {
  return Date.now();
}


///////////////////////
// ---------- Session helpers (Feature 2) ----------

// Session = abhi kaun logged in hai. Agar koi login nahi to null.
function getSession() {
  return getData("hcm_session", null);
}

// Login ke baad user ki zaroori info session mein save karte hain.
// Password session mein save nahi karte, ye security ke liye zaroori hai.
function saveSession(user) {
  var session = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
  saveData("hcm_session", session);
}

// Logout par session delete karne ke liye.
function clearSession() {
  localStorage.removeItem("hcm_session");
}