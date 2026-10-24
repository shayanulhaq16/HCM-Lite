// announcements.js
// Announcements: Admin post karta hai, Employee sirf padhta hai.
// Ye alag file hai, taake attendance.js mein error ho to bhi ye chale.

// ================= Chhoti helper functions =================

// Aaj ki date "YYYY-MM-DD" format mein.
function annTodayText() {
  var now = new Date();
  var month = now.getMonth() + 1;
  var day = now.getDate();

  // Mahina aur din 2 digits mein karne ke liye
  if (month < 10) {
    month = "0" + month;
  }
  if (day < 10) {
    day = "0" + day;
  }
  return now.getFullYear() + "-" + month + "-" + day;
}

// Saari announcements lo (hcm_announcements). Shuru mein khali list.
function getAnnouncements() {
  return getData("hcm_announcements", []);
}

// Saari announcements save karo.
function saveAnnouncements(list) {
  saveData("hcm_announcements", list);
}

// ================= Admin: naya announcement post karna =================

// Form submit hone par ye function chalta hai.
function handlePostAnnouncement(event) {
  // Sab se pehle page reload roko
  event.preventDefault();

  // Purane messages khali karo
  document.getElementById("errAnnTitle").innerHTML = "";
  document.getElementById("errAnnMessage").innerHTML = "";
  document.getElementById("annDone").innerHTML = "";

  // Form ki values lo. trim() aage-peeche ke space hata deta hai.
  var title = document.getElementById("annTitle").value.trim();
  var message = document.getElementById("annMessage").value.trim();

  var hasError = false;

  // Check karo ke dono cheezein likhi hain
  if (title === "") {
    document.getElementById("errAnnTitle").innerHTML = "Title likhein.";
    hasError = true;
  }

  if (message === "") {
    document.getElementById("errAnnMessage").innerHTML = "Message likhein.";
    hasError = true;
  }

  // Koi error hai to yahin ruk jao
  if (hasError) {
    return;
  }

  // Post karne wala Admin ka naam session se lo
  var session = getSession();

  // Naya announcement list ke aakhir mein daalo
  var list = getAnnouncements();
  list.push({
    id: Date.now(),
    title: title,
    message: message,
    date: annTodayText(),
    by: session.name
  });
  saveAnnouncements(list);

  // Form khali karo, success message dikhao, list refresh karo
  document.getElementById("annForm").reset();
  document.getElementById("annDone").innerHTML = "Announcement post ho gayi.";
  showAnnouncementsIn("annAdminList", "noAnnAdmin");
}

// ================= Dono pages ke liye: list dikhana =================

// Announcements ki HTML banata hai. Naya pehle dikhta hai.
function buildAnnouncementHtml() {
  var list = getAnnouncements();
  var html = "";

  // Peeche se loop chalao, taake naye announcement pehle aayein
  for (var i = list.length - 1; i >= 0; i--) {
    html += "<div class='ann-item'>" +
      "<strong>" + list[i].title + "</strong>" +
      "<p>" + list[i].message + "</p>" +
      "<span class='hint'>" + list[i].date + " - " + list[i].by + "</span>" +
      "</div>";
  }
  return html;
}

// Diye gaye box mein list dikhata hai.
// listId: jis div mein list jaye. noId: "koi nahi" wala message.
function showAnnouncementsIn(listId, noId) {
  var list = getAnnouncements();
  document.getElementById(listId).innerHTML = buildAnnouncementHtml();

  var noBox = document.getElementById(noId);
  if (list.length === 0) {
    noBox.classList.remove("hidden");
  } else {
    noBox.classList.add("hidden");
  }
}

// ================= Page shuru karna =================

// Admin ka page (annForm wala). Pehle access check, phir form ka event.
if (document.getElementById("annForm") !== null) {
  var annAdminSession = checkAccess("admin");

  if (annAdminSession !== null) {
    document.getElementById("annForm").addEventListener("submit", handlePostAnnouncement);
    showAnnouncementsIn("annAdminList", "noAnnAdmin");
  }
}

// Employee ka page (annEmpList wala). Sirf dikhana hai, post nahi.
if (document.getElementById("annEmpList") !== null) {
  var annEmpSession = checkAccess("employee");

  if (annEmpSession !== null) {
    showAnnouncementsIn("annEmpList", "noAnnEmp");
  }
}