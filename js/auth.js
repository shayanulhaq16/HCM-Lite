// auth.js
// Feature 1: pehli baar ka setup (company + Admin account)
// Feature 2: login, logout, session aur role check

// Error messages wali ID ki list (setup form ke liye).
var errorIds = [
  "errCompanyName",
  "errStartTime",
  "errGraceMinutes",
  "errLeaveQuota",
  "errAdminName",
  "errAdminEmail",
  "errAdminPassword",
  "errSecAnswer"
];

// Login form ke error messages ki ID list.
var loginErrorIds = [
  "errLoginEmail",
  "errLoginPassword",
  "loginError"
];

// ================= Index page shuru karna =================

// Ye function sirf index.html par chalta hai.
// Pehle check karta hai ke user pehle se login hai ya nahi.
function startIndexPage() {
  // Agar user pehle se login hai to seedha uske dashboard par bhejo
  var session = getSession();
  if (session !== null) {
    goToDashboard(session.role);
    return;
  }

  // Login nahi hai. Setup ho chuka hai to login dikhao, warna setup form.
  if (isSetupDone()) {
    document.getElementById("loginSection").classList.remove("hidden");
  } else {
    document.getElementById("setupSection").classList.remove("hidden");
  }

  // Forms ke submit button par function chalao
  document.getElementById("setupForm").addEventListener("submit", handleSetup);
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
}

// ================= Login wala hissa (Feature 2) =================

// Login form submit hone par ye function chalta hai.
function handleLogin(event) {
  event.preventDefault(); // page reload hone se roko

  clearLoginErrors(); // purane error hatao

  // Input ki value lo
  var email = document.getElementById("loginEmail").value.trim();
  var password = document.getElementById("loginPassword").value;

  var hasError = false;

  // Khali fields check karo
  if (email === "") {
    showError("errLoginEmail", "Email likhein.");
    hasError = true;
  }

  if (password === "") {
    showError("errLoginPassword", "Password likhein.");
    hasError = true;
  }

  // Agar koi field khali hai to yahin ruk jao
  if (hasError) {
    return;
  }

  // Email aur password mill rahe hain ya nahi, ye dhoondo
  var user = findUserByLogin(email, password);

  if (user === null) {
    showError("loginError", "Email ya password galat hai.");
    return;
  }

  // Sahi login hai. Session save karo aur dashboard par bhejo.
  saveSession(user);
  goToDashboard(user.role);
}

// Users list mein se wo user dhoondta hai jiska email aur password match kare.
// Mil jaye to user return karta hai, warna null.
function findUserByLogin(email, password) {
  var users = getUsers();
  var target = email.toLowerCase(); // email chhote letters mein compare karo

  for (var i = 0; i < users.length; i++) {
    if (users[i].email.toLowerCase() === target && users[i].password === password) {
      return users[i];
    }
  }
  return null; // koi match nahi mila
}

// Role ke hisaab se sahi page par bhejta hai.
function goToDashboard(role) {
  if (role === "admin") {
    window.location.href = "admin.html";
  } else {
    window.location.href = "employee.html";
  }
}

// Login form ke saare error messages khali karta hai.
function clearLoginErrors() {
  for (var i = 0; i < loginErrorIds.length; i++) {
    document.getElementById(loginErrorIds[i]).innerHTML = "";
  }
}

// ================= Logout aur access check (Feature 2) =================

// Logout: session delete karo aur login page par bhejo.
// Dashboard pages par "Logout" button is function ko call karega.
function logout() {
  clearSession();
  window.location.href = "index.html";
}

// Har dashboard page is function ko shuru mein call karega.
// requiredRole: "admin" ya "employee".
// Agar login nahi hai to index.html par bhejega.
// Agar galat role hai (jaise employee admin page khole) to uske apne dashboard par bhejega.
function checkAccess(requiredRole) {
  var session = getSession();

  if (session === null) {
    window.location.href = "index.html";
    return null;
  }

  if (session.role !== requiredRole) {
    goToDashboard(session.role);
    return null;
  }

  return session; // sab theek hai, session wapas do
}

// ================= Setup wala hissa (Feature 1) =================

// Setup form submit hone par ye function chalta hai.
function handleSetup(event) {
  event.preventDefault();

  clearErrors();

  var companyName = document.getElementById("companyName").value.trim();
  var startTime = document.getElementById("startTime").value;
  var graceText = document.getElementById("graceMinutes").value;
  var quotaText = document.getElementById("leaveQuota").value;
  var adminName = document.getElementById("adminName").value.trim();
  var adminEmail = document.getElementById("adminEmail").value.trim();
  var adminPassword = document.getElementById("adminPassword").value;

  var graceMinutes = Number(graceText);
  var leaveQuota = Number(quotaText);

  // Security sawal ka jawab (forgot password ke liye)
  var recovery = readRecovery("secQuestion", "secAnswer", "errSecAnswer", true);
  if (recovery === null) {
    hasError = true;
  }

  var hasError = false;

  if (companyName === "") {
    showError("errCompanyName", "Company ka naam likhna zaroori hai.");
    hasError = true;
  }

  if (startTime === "") {
    showError("errStartTime", "Office start time chunein.");
    hasError = true;
  }

  if (graceText === "" || graceMinutes < 0) {
    showError("errGraceMinutes", "Grace minutes 0 ya us se zyada hone chahiye.");
    hasError = true;
  }

  if (quotaText === "" || leaveQuota <= 0) {
    showError("errLeaveQuota", "Leave quota 1 ya us se zyada hona chahiye.");
    hasError = true;
  }

  if (adminName === "") {
    showError("errAdminName", "Admin ka naam likhna zaroori hai.");
    hasError = true;
  }

  if (!isValidEmail(adminEmail)) {
    showError("errAdminEmail", "Sahi email likhein (jaise abc@mail.com).");
    hasError = true;
  }

  if (adminPassword.length < 6) {
    showError("errAdminPassword", "Password kam se kam 6 characters ka ho.");
    hasError = true;
  }

  if (hasError) {
    return;
  }

  if (isEmailUsed(adminEmail)) {
    showError("errAdminEmail", "Ye email pehle se use ho chuka hai.");
    return;
  }

  // Company settings save karo
  var company = {
    name: companyName,
    startTime: startTime,
    graceMinutes: graceMinutes,
    leaveQuota: leaveQuota
  };
  saveCompany(company);

  // Admin account banao aur users list mein daalo
  var users = getUsers();
  var admin = {
    id: newId(),
    name: adminName,
    email: adminEmail,
    password: adminPassword,
    role: "admin",
    department: "HR",
    salary: 0,
    securityQuestion: recovery.question,
    securityAnswer: recovery.answer
  };
  users.push(admin);
  saveUsers(users);

  // Screen badlo: setup chupao, success message dikhao
  document.getElementById("setupSection").classList.add("hidden");
  document.getElementById("doneSection").classList.remove("hidden");

  document.getElementById("doneMessage").innerHTML =
    "Setup mukammal! <strong>" + companyName + "</strong> ban gayi hai. " +
    "Admin email: <strong>" + adminEmail + "</strong>";
}

// ================= Chhoti helper functions =================

// Error message ko us element mein likhta hai jiski ID di gayi ho.
function showError(elementId, message) {
  document.getElementById(elementId).innerHTML = message;
}

// Setup ke saare error messages khali karta hai.
function clearErrors() {
  for (var i = 0; i < errorIds.length; i++) {
    document.getElementById(errorIds[i]).innerHTML = "";
  }
}

// Simple email check: @ hona chahiye, uske baad dot (.) hona chahiye.
function isValidEmail(email) {
  var atPosition = email.indexOf("@");
  var dotPosition = email.lastIndexOf(".");

  return atPosition > 0 &&
    dotPosition > atPosition + 1 &&
    dotPosition < email.length - 1;
}

// Check karta hai ke ye email kisi user ke paas pehle se hai ya nahi.
function isEmailUsed(email) {
  var users = getUsers();
  var target = email.toLowerCase();

  for (var i = 0; i < users.length; i++) {
    if (users[i].email.toLowerCase() === target) {
      return true;
    }
  }
  return false;
}

// ================= Page load par shuru karo =================

// Agar ye index page hai (jahan login form hai) to startIndexPage chalao.
// Baaqi pages bhi auth.js load karenge, unpar ye kuch nahi karega.
if (document.getElementById("loginForm") !== null) {
  startIndexPage();
}
//////////////////
// ================= Password change (Feature 3) =================

// Password change form ke messages ki ID list. Naya submit hone par ye khali hongi.
var changePassIds = [
  "errOldPassword",
  "errNewPassword",
  "errConfirmPassword",
  "passwordDone"
];

// Form submit hone par ye function chalta hai.
function handleChangePassword(event) {
  event.preventDefault(); // page reload roko

  clearChangePassMessages(); // purane messages hatao

  // Abhi login user ki info session se lo
  var session = getSession();
  if (session === null) {
    window.location.href = "index.html"; // login nahi hai to login page par bhejo
    return;
  }

  // Teen inputs ki value lo
  var oldPassword = document.getElementById("oldPassword").value;
  var newPassword = document.getElementById("newPassword").value;
  var confirmPassword = document.getElementById("confirmPassword").value;

  var hasError = false;

  // Validation (check karo)
  if (oldPassword === "") {
    showError("errOldPassword", "Purana password likhein.");
    hasError = true;
  }

  if (newPassword.length < 6) {
    showError("errNewPassword", "Naya password kam se kam 6 characters ka ho.");
    hasError = true;
  } else if (newPassword === oldPassword) {
    showError("errNewPassword", "Naya password purane se alag hona chahiye.");
    hasError = true;
  }

  if (confirmPassword !== newPassword) {
    showError("errConfirmPassword", "Dono naye password aik jaise nahi hain.");
    hasError = true;
  }

  // Koi error hai to yahin ruk jao
  if (hasError) {
    return;
  }

  // Users list lo aur apna user dhoondo (session ki id se)
  var users = getUsers();
  var myIndex = -1; // -1 ka matlab "abhi nahi mila"

  for (var i = 0; i < users.length; i++) {
    if (users[i].id === session.id) {
      myIndex = i;
      break; // mil gaya, loop se nikal jao
    }
  }

  if (myIndex === -1) {
    showError("errOldPassword", "User nahi mila. Dobara login karein.");
    return;
  }

  // Purana password match karta hai ya nahi
  if (users[myIndex].password !== oldPassword) {
    showError("errOldPassword", "Purana password galat hai.");
    return;
  }

  // Sab theek hai: naya password save karo
  users[myIndex].password = newPassword;
  saveUsers(users);

  // Form khali karo aur success message dikhao
  document.getElementById("changePasswordForm").reset();
  document.getElementById("passwordDone").innerHTML = "Password kamyabi se badal gaya.";
}

// Password change form ke saare messages khali karta hai.
function clearChangePassMessages() {
  for (var i = 0; i < changePassIds.length; i++) {
    document.getElementById(changePassIds[i]).innerHTML = "";
  }
}

// Agar ye page par password change form ho to uska submit event jod do.
// Baaqi pages par ye kuch nahi karega.
if (document.getElementById("changePasswordForm") !== null) {
  document.getElementById("changePasswordForm").addEventListener("submit", handleChangePassword);
}


////////////////////
// ================= Company settings (Feature 5) =================

// Settings form ke error messages ki ID list
var settingsErrIds = ["errSetStart", "errSetGrace", "errSetQuota", "errSetDays"];

// Settings page khulne par form mein purani values bharta hai
function loadSettingsForm() {
  var company = getCompany();
  if (company === null) {
    return; // setup nahi hua to kuch nahi bharna
  }

  document.getElementById("setStartTime").value = company.startTime;
  document.getElementById("setGrace").value = company.graceMinutes;
  document.getElementById("setQuota").value = company.leaveQuota;

  // Agar workingDays pehle save nahi hue (setup ke waqt wali company), to Mon-Fri default rakho
  var days = company.workingDays;
  if (days === undefined) {
    days = [1, 2, 3, 4, 5];
  }

  // Har din ka checkbox check ya uncheck karo
  // Number ka matlab: 0 = Sunday, 1 = Monday, ... 6 = Saturday
  for (var i = 0; i <= 6; i++) {
    var box = document.getElementById("day" + i);
    box.checked = listHasNumber(days, i);
  }
}

// Ek list mein koi number hai ya nahi, ye check karta hai
function listHasNumber(list, number) {
  for (var i = 0; i < list.length; i++) {
    if (list[i] === number) {
      return true; // mil gaya
    }
  }
  return false; // nahi mila
}

// Settings save karne wala function (form submit par chalta hai)
function handleSettingsSave(event) {
  event.preventDefault(); // page reload roko

  clearSettingsErrors();
  document.getElementById("settingsDone").innerHTML = "";

  // Inputs ki value lo
  var startTime = document.getElementById("setStartTime").value;
  var graceText = document.getElementById("setGrace").value;
  var quotaText = document.getElementById("setQuota").value;

  // Text ko number banao
  var graceMinutes = Number(graceText);
  var leaveQuota = Number(quotaText);

  // Checked working days ki list banao
  var workingDays = [];
  for (var i = 0; i <= 6; i++) {
    if (document.getElementById("day" + i).checked) {
      workingDays.push(i);
    }
  }

  var hasError = false;

  // ---------- Validation ----------
  if (startTime === "") {
    showError("errSetStart", "Office start time chunein.");
    hasError = true;
  }

  if (graceText === "" || graceMinutes < 0) {
    showError("errSetGrace", "Grace minutes 0 ya us se zyada hone chahiye.");
    hasError = true;
  }

  if (quotaText === "" || leaveQuota <= 0) {
    showError("errSetQuota", "Leave quota 1 ya us se zyada hona chahiye.");
    hasError = true;
  }

  if (workingDays.length === 0) {
    showError("errSetDays", "Kam se kam ek working day chunein.");
    hasError = true;
  }

  if (hasError) {
    return; // koi error hai to save na karo
  }

  // ---------- Save ----------
  var company = getCompany();
  if (company === null) {
    return;
  }

  company.startTime = startTime;
  company.graceMinutes = graceMinutes;
  company.leaveQuota = leaveQuota;
  company.workingDays = workingDays;

  saveCompany(company);

  document.getElementById("settingsDone").innerHTML = "Settings save ho gayi hain.";
}

// Settings form ke saare error messages khali karta hai
function clearSettingsErrors() {
  for (var i = 0; i < settingsErrIds.length; i++) {
    document.getElementById(settingsErrIds[i]).innerHTML = "";
  }
}

// Agar ye settings page hai to access check karo, events lagao, form bharo
if (document.getElementById("settingsForm") !== null) {
  var adminSettings = checkAccess("admin"); // sirf Admin

  if (adminSettings !== null) {
    document.getElementById("logoutBtn").addEventListener("click", logout);
    document.getElementById("settingsForm").addEventListener("submit", handleSettingsSave);
    loadSettingsForm();
  }
}


// ================= Security sawal (forgot password ke liye) =================

// Form se sawal aur jawab lo. required true ho to jawab zaroori hai.
// Return: { question, answer } ya khali jawab par { question: "", answer: "" } (required false ho to).
// Galat ho to null return karta hai aur error dikhata hai.
function readRecovery(selectId, answerId, errId, required) {
  var question = document.getElementById(selectId).value;
  var answer = document.getElementById(answerId).value.trim().toLowerCase();
  var errBox = document.getElementById(errId);

  if (answer === "") {
    if (required) {
      errBox.innerHTML = "Security sawal ka jawab likhein.";
      return null;
    }
    return { question: "", answer: "" };
  }

  if (answer.length < 2) {
    errBox.innerHTML = "Jawab kam se kam 2 characters ka ho.";
    return null;
  }

  return { question: question, answer: answer };
}

// ================= Forgot password (forgot.html) =================

// Email se user dhoondta hai. Nahi mila to null.
function findUserByEmail(email) {
  var users = getUsers();
  var target = email.toLowerCase();

  for (var i = 0; i < users.length; i++) {
    if (users[i].email.toLowerCase() === target) {
      return users[i];
    }
  }
  return null;
}

// Step 1: email dekh kar user ka sawal dikhana.
var forgotUser = null; // jis user ka password reset ho raha hai

function handleFindAccount(event) {
  event.preventDefault();

  document.getElementById("errFindEmail").innerHTML = "";
  document.getElementById("forgotMsg").innerHTML = "";

  var email = document.getElementById("forgotEmail").value.trim();

  if (!isValidEmail(email)) {
    showError("errFindEmail", "Sahi email likhein.");
    return;
  }

  var user = findUserByEmail(email);
  if (user === null) {
    showError("errFindEmail", "Is email ka account nahi mila.");
    return;
  }

  if (!user.securityAnswer) {
    document.getElementById("forgotMsg").innerHTML =
      "Is account par security sawal set nahi hai. Admin se kahein ke Employees page par password reset kare.";
    return;
  }

  forgotUser = user;
  document.getElementById("forgotQuestion").innerHTML = "<strong>Sawal:</strong> " + user.securityQuestion;
  document.getElementById("stepFind").classList.add("hidden");
  document.getElementById("stepReset").classList.remove("hidden");
}

// Step 2: jawab sahi ho to naya password save karna.
function handleResetPassword(event) {
  event.preventDefault();

  document.getElementById("errFAnswer").innerHTML = "";
  document.getElementById("errFNew").innerHTML = "";
  document.getElementById("errFConfirm").innerHTML = "";

  var answer = document.getElementById("fAnswer").value.trim().toLowerCase();
  var newPass = document.getElementById("fNewPass").value;
  var confirmPass = document.getElementById("fConfirmPass").value;

  var hasError = false;

  if (answer !== forgotUser.securityAnswer) {
    showError("errFAnswer", "Jawab galat hai.");
    hasError = true;
  }

  if (newPass.length < 6) {
    showError("errFNew", "Naya password kam se kam 6 characters ka ho.");
    hasError = true;
  }

  if (confirmPass !== newPass) {
    showError("errFConfirm", "Dono password aik jaise nahi hain.");
    hasError = true;
  }

  if (hasError) {
    return;
  }

  var users = getUsers();
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === forgotUser.id) {
      users[i].password = newPass;
    }
  }
  saveUsers(users);

  document.getElementById("stepReset").classList.add("hidden");
  document.getElementById("forgotMsg").innerHTML =
    "Password badal gaya. <a href='index.html'>Ab login karein</a>.";
}

// forgot.html par chalao
if (document.getElementById("forgotForm") !== null) {
  document.getElementById("forgotForm").addEventListener("submit", handleFindAccount);
  document.getElementById("resetForm").addEventListener("submit", handleResetPassword);
}