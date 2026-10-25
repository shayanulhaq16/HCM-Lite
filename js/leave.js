// leave.js
// Feature 7: employee leave apply karta hai, admin approve ya reject karta hai.

// ================= Leave list (localStorage) =================

// Saari leave requests lo (hcm_leaves). Shuru mein khali list.
function getLeaveList() {
  return getData("hcm_leaves", []);
}

// Saari leave requests save karo.
function saveLeaveList(list) {
  saveData("hcm_leaves", list);
}

// Leave ki id se uska index list mein dhoondo. Nahi mila to -1.
function findLeaveIndex(list, id) {
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      return i;
    }
  }
  return -1;
}

// ================= Dates aur working days =================

// Do dates ke beech ke kaam ke din ginta hai (dono dates shamil hain).
// Kaam ke din wo hain jo settings mein chune gaye hain.
function countWorkingDays(fromText, toText) {
  var company = getCompany();
  var days = company.workingDays;
  if (days === undefined) {
    days = [1, 2, 3, 4, 5]; // default Mon se Fri
  }

  // "2026-10-25" ko Date banao
  var a = fromText.split("-");
  var b = toText.split("-");
  var start = new Date(Number(a[0]), Number(a[1]) - 1, Number(a[2]));
  var end = new Date(Number(b[0]), Number(b[1]) - 1, Number(b[2]));

  // Dono ke beech kitne din hain (ek din = 86400000 milliseconds)
  var totalDays = Math.round((end - start) / 86400000);

  var count = 0;
  // Start se end tak har din check karo
  for (var i = 0; i <= totalDays; i++) {
    var day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    if (listHasNumber(days, day.getDay())) {
      count++;
    }
  }
  return count;
}

// Check karta hai ke ye user ki kisi aur leave (rejected ko chhod kar) se overlap to nahi.
// Dates "YYYY-MM-DD" format mein hain, isliye seedha string compare kar sakte hain.
function leaveOverlaps(userId, from, to) {
  var list = getLeaveList();

  for (var i = 0; i < list.length; i++) {
    var leave = list[i];
    if (leave.userId === userId && leave.status !== "rejected") {
      // Dono ranges milti hain agar ek ka shuru doosre ke khatam hone se pehle ho
      if (from <= leave.to && to >= leave.from) {
        return true;
      }
    }
  }
  return false;
}

// Is saal kitne din leave use hue hain.
// includePending true ho to pending leaves bhi ginti mein aayengi.
function usedLeaveDays(userId, includePending) {
  var list = getLeaveList();
  var thisYear = new Date().getFullYear();
  var total = 0;

  for (var i = 0; i < list.length; i++) {
    var leave = list[i];
    var leaveYear = Number(leave.from.split("-")[0]);

    if (leave.userId === userId && leaveYear === thisYear) {
      if (leave.status === "approved") {
        total += leave.days;
      } else if (includePending && leave.status === "pending") {
        total += leave.days;
      }
    }
  }
  return total;
}

// Status ko user ke liye achhe naam mein badalta hai.
function leaveStatusText(status) {
  if (status === "approved") {
    return "Approved";
  }
  if (status === "rejected") {
    return "Rejected";
  }
  return "Pending";
}

// User ki id se naam dhoondta hai (admin ki table ke liye).
function findUserName(users, id) {
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === id) {
      return users[i].name;
    }
  }
  return "Unknown";
}

// Error messages khali karta hai (leave apply form ke)
function clearLeaveErrors() {
  var ids = ["errLeaveFrom", "errLeaveTo", "errLeaveReason"];
  for (var i = 0; i < ids.length; i++) {
    document.getElementById(ids[i]).innerHTML = "";
  }
}

// ================= Employee: leave apply =================

// Apply leave form submit hone par chalta hai.
function handleApplyLeave(event) {
  event.preventDefault(); // page reload roko

  clearLeaveErrors();
  document.getElementById("leaveApplyMsg").innerHTML = "";

  var session = getSession();
  var type = document.getElementById("leaveType").value;
  var from = document.getElementById("leaveFrom").value;
  var to = document.getElementById("leaveTo").value;
  var reason = document.getElementById("leaveReason").value.trim();

  var hasError = false;

  // Khali fields check
  if (from === "") {
    showError("errLeaveFrom", "Shuru ki date chunein.");
    hasError = true;
  }
  if (to === "") {
    showError("errLeaveTo", "Aakhri date chunein.");
    hasError = true;
  }
  if (reason === "") {
    showError("errLeaveReason", "Wajah likhein.");
    hasError = true;
  }

  if (hasError) {
    return;
  }

    // Join month check: join month se pehle ki date par leave nahi
  var joinMonth = getJoinMonthOf(session.id);
  if (joinMonth !== "" && from.substring(0, 7) < joinMonth) {
    showError("errLeaveFrom", "Join month (" + joinMonth + ") se pehle ki date par leave nahi le sakte.");
    return;
  }
  if (joinMonth !== "" && to.substring(0, 7) < joinMonth) {
    showError("errLeaveTo", "Join month (" + joinMonth + ") se pehle ki date par leave nahi le sakte.");
    return;
  }

  // Rule: from date to date se pehle ya barabar ho
  if (from > to) {
    showError("errLeaveTo", "Aakhri date shuru ki date ke baad ya barabar honi chahiye.");
    return;
  }

  // Rule: sirf kaam ke din ginne hain
  var days = countWorkingDays(from, to);
  if (days === 0) {
    showError("errLeaveTo", "Is muddat mein koi kaam ka din nahi hai.");
    return;
  }

  // Rule: overlap nahi
  if (leaveOverlaps(session.id, from, to)) {
    showError("errLeaveFrom", "Is muddat mein aap ki pehle se leave hai.");
    return;
  }

  // Rule: quota se zyada nahi (pending bhi ginte hain)
  var quota = getCompany().leaveQuota;
  var remaining = quota - usedLeaveDays(session.id, true);
  if (days > remaining) {
    showError("errLeaveTo", "Aap ke paas sirf " + remaining + " din baaqi hain.");
    return;
  }

  // Sab theek hai: leave save karo (shuru mein pending)
  var list = getLeaveList();
  list.push({
    id: newId(),
    userId: session.id,
    type: type,
    from: from,
    to: to,
    days: days,
    reason: reason,
    status: "pending",
    comment: ""
  });
  saveLeaveList(list);

  document.getElementById("applyLeaveForm").reset();
  document.getElementById("leaveApplyMsg").innerHTML = "Leave apply ho gayi. Admin ki approval ka intezar karein.";
  refreshMyLeave();
}

// Employee ka balance aur apni leaves ki list dikhata hai.
function refreshMyLeave() {
  var session = getSession();
  var quota = getCompany().leaveQuota;
  var used = usedLeaveDays(session.id, true);
  var remaining = quota - used;

  document.getElementById("balanceText").innerHTML =
    "Saal ka quota: <strong>" + quota + "</strong> din. " +
    "Approved aur pending mila kar use: <strong>" + used + "</strong> din. " +
    "Baaqi: <strong>" + remaining + "</strong> din.";

  // Apni leaves, naayi pehle
  var list = getLeaveList();
  var html = "";
  var count = 0;

  for (var i = list.length - 1; i >= 0; i--) {
    var leave = list[i];
    if (leave.userId === session.id) {
      html += "<tr>" +
        "<td>" + leave.type + "</td>" +
        "<td>" + leave.from + " se " + leave.to + "</td>" +
        "<td>" + leave.days + "</td>" +
        "<td>" + leaveStatusText(leave.status) + "</td>" +
        "<td>" + (leave.comment === "" ? "-" : leave.comment) + "</td>" +
        "</tr>";
      count++;
    }
  }

  document.getElementById("myLeaveBody").innerHTML = html;

  var noLeaves = document.getElementById("noMyLeave");
  if (count === 0) {
    noLeaves.classList.remove("hidden");
  } else {
    noLeaves.classList.add("hidden");
  }
}

// ================= Admin: approve ya reject =================

// Admin ki table: sab leaves, naayi pehle. Pending par buttons dikhte hain.
function showAllLeaves() {
  var list = getLeaveList();
  var users = getUsers();
  var html = "";
  var count = 0;

  for (var i = list.length - 1; i >= 0; i--) {
    var leave = list[i];
    var name = findUserName(users, leave.userId);
    var actions = "-";

    // Sirf pending leave par comment box aur buttons
    if (leave.status === "pending") {
      actions = "<input type='text' id='comment_" + leave.id + "' placeholder='Comment'>" +
        "<button type='button' class='small-btn' onclick='approveLeave(" + leave.id + ")'>Approve</button>" +
        "<button type='button' class='small-btn danger-btn' onclick='rejectLeave(" + leave.id + ")'>Reject</button>";
    }

    html += "<tr>" +
      "<td>" + name + "</td>" +
      "<td>" + leave.type + "</td>" +
      "<td>" + leave.from + " se " + leave.to + "</td>" +
      "<td>" + leave.days + "</td>" +
      "<td>" + leave.reason + "</td>" +
      "<td>" + leaveStatusText(leave.status) + "</td>" +
      "<td>" + (leave.comment === "" ? "-" : leave.comment) + "</td>" +
      "<td class='action-cell'>" + actions + "</td>" +
      "</tr>";
    count++;
  }

  document.getElementById("leaveAdminBody").innerHTML = html;

  var noLeaves = document.getElementById("noLeaves");
  if (count === 0) {
    noLeaves.classList.remove("hidden");
  } else {
    noLeaves.classList.add("hidden");
  }
}

// Pending leave ka comment box se comment lo
function readComment(id) {
  return document.getElementById("comment_" + id).value.trim();
}

// Leave approve karta hai (quota check ke saath)
function approveLeave(id) {
  var list = getLeaveList();
  var index = findLeaveIndex(list, id);
  if (index === -1) {
    return;
  }

  var leave = list[index];
  var quota = getCompany().leaveQuota;
  var usedApproved = usedLeaveDays(leave.userId, false);

  // Quota check: approve ke baad bhi quota ke andar ho
  if (usedApproved + leave.days > quota) {
    document.getElementById("leaveAdminMsg").innerHTML =
      "Is employee ka quota khatam ho chuka hai. Approve nahi ho sakti.";
    return;
  }

  leave.status = "approved";
  leave.comment = readComment(id); // comment optional hai
  list[index] = leave;
  saveLeaveList(list);

  document.getElementById("leaveAdminMsg").innerHTML = "Leave approve ho gayi.";
  showAllLeaves();
}

// Leave reject karta hai. Reject ke liye comment zaroori hai.
function rejectLeave(id) {
  var comment = readComment(id);
  if (comment === "") {
    document.getElementById("leaveAdminMsg").innerHTML =
      "Reject karne se pehle comment likhein.";
    return;
  }

  var list = getLeaveList();
  var index = findLeaveIndex(list, id);
  if (index === -1) {
    return;
  }

  list[index].status = "rejected";
  list[index].comment = comment;
  saveLeaveList(list);

  document.getElementById("leaveAdminMsg").innerHTML = "Leave reject ho gayi.";
  showAllLeaves();
}

// ================= Page shuru karna =================

// Admin ka leaves.html
if (document.getElementById("leaveAdminBody") !== null) {
  var leaveAdminSession = checkAccess("admin");

  if (leaveAdminSession !== null) {
    document.getElementById("logoutBtn").addEventListener("click", logout);
    showAllLeaves();
  }
}

// Employee ka employee.html (leave wala hissa)
if (document.getElementById("applyLeaveForm") !== null) {
  var leaveEmpSession = checkAccess("employee");

  if (leaveEmpSession !== null) {
    document.getElementById("applyLeaveForm").addEventListener("submit", handleApplyLeave);
    refreshMyLeave();
  }
}