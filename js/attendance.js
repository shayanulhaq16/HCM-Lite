// attendance.js
// Feature 6: employee check-in aur check-out, late aur half day ke rules.

// ================= Chhoti helper functions =================

// Number ko 2 digits mein karta hai. Jaise 5 ko "05" banata hai.
function pad2(number) {
  if (number < 10) {
    return "0" + number;
  }
  return String(number);
}

// Aaj ki date "YYYY-MM-DD" format mein (jaise "2026-10-25").
function getTodayDate() {
  var now = new Date();
  // getMonth() January ko 0 deta hai, isliye + 1 karte hain
  return now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate());
}

// Abhi ka time "HH:MM" format mein (jaise "09:15").
function getNowTime() {
  var now = new Date();
  return pad2(now.getHours()) + ":" + pad2(now.getMinutes());
}

// "09:15" ko minutes mein badalta hai: 9 x 60 + 15 = 555.
// Minutes mein compare karna asan hota hai.
function timeToMinutes(timeText) {
  var parts = timeText.split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

// Date text ("2026-10-25") se din ka number nikalta hai: 0 = Sunday ... 6 = Saturday.
function getDayNumber(dateText) {
  var parts = dateText.split("-");
  var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return date.getDay();
}

// Check karta hai ke ye date kaam ka din hai ya nahi (settings ke workingDays se).
function isWorkingDay(dateText) {
  var company = getCompany();
  var days = company.workingDays;
  if (days === undefined) {
    days = [1, 2, 3, 4, 5]; // default Mon se Fri
  }
  return listHasNumber(days, getDayNumber(dateText));
}

// Status ko user ke liye achhe naam mein badalta hai.
function statusLabel(status) {
  if (status === "late") {
    return "Late";
  }
  if (status === "half day") {
    return "Half day";
  }
  return "Present";
}

// ================= Attendance list (localStorage) =================

// Saara attendance list lo (hcm_attendance). Shuru mein khali list.
function getAttendanceList() {
  return getData("hcm_attendance", []);
}

// Saara attendance list save karo.
function saveAttendanceList(list) {
  saveData("hcm_attendance", list);
}

// Is user ka is date ka record list mein kis jagah hai. Nahi mila to -1.
function findRecordIndex(list, userId, date) {
  for (var i = 0; i < list.length; i++) {
    if (list[i].userId === userId && list[i].date === date) {
      return i;
    }
  }
  return -1;
}

// Page par message dikhata hai (jaise "Check-in ho gaya").
function showAttMessage(text) {
  document.getElementById("attendanceMsg").innerHTML = text;
}

// ================= Check-in =================

// Check-in button par chalta hai.
function handleCheckIn() {
  var session = getSession();
  var today = getTodayDate();
  var company = getCompany();

  // Rule: sirf kaam ke din check-in ho sakta hai
  if (!isWorkingDay(today)) {
    showAttMessage("Aaj kaam ka din nahi hai. Check-in nahi ho sakta.");
    return;
  }

  var list = getAttendanceList();

  // Rule: ek din mein sirf ek check-in
  if (findRecordIndex(list, session.id, today) !== -1) {
    showAttMessage("Aap aaj pehle hi check-in kar chuke hain.");
    return;
  }

  var nowTime = getNowTime();

  // Rule: late = check-in office start + grace minutes ke baad
  var lateLimit = timeToMinutes(company.startTime) + company.graceMinutes;
  var status = "present";
  if (timeToMinutes(nowTime) > lateLimit) {
    status = "late";
  }

  // Naya record list mein daal do
  list.push({
    id: newId(),
    userId: session.id,
    date: today,
    checkIn: nowTime,
    checkOut: "",     // abhi check-out nahi hua
    status: status
  });
  saveAttendanceList(list);

  var message = "Check-in ho gaya: " + nowTime;
  if (status === "late") {
    message += " (aap late hain)";
  }
  showAttMessage(message);
  refreshAttendancePage();
}

// ================= Check-out =================

// Check-out button par chalta hai.
function handleCheckOut() {
  var session = getSession();
  var today = getTodayDate();
  var list = getAttendanceList();

  var index = findRecordIndex(list, session.id, today);

  // Rule: check-out sirf check-in ke baad
  if (index === -1) {
    showAttMessage("Pehle check-in karein.");
    return;
  }

  var record = list[index];

  if (record.checkOut !== "") {
    showAttMessage("Aap aaj check-out kar chuke hain.");
    return;
  }

  var nowTime = getNowTime();
  var minutesWorked = timeToMinutes(nowTime) - timeToMinutes(record.checkIn);

  if (minutesWorked <= 0) {
    showAttMessage("Check-out check-in ke baad hona chahiye.");
    return;
  }

  var hoursWorked = minutesWorked / 60;

  record.checkOut = nowTime;

  // Rule: 5 ghante se kam kaam to half day
  if (hoursWorked < 5) {
    record.status = "half day";
  }

  list[index] = record; // record badal diya, ab list mein wapas rakho
  saveAttendanceList(list);

  showAttMessage("Check-out ho gaya. Aap ne " + hoursWorked.toFixed(1) + " ghante kaam kiya.");
  refreshAttendancePage();
}

// ================= Screen ko update karna =================

// Aaj ka status, buttons aur history ko current data ke hisaab se dikhata hai.
function refreshAttendancePage() {
  var session = getSession();
  var today = getTodayDate();
  var list = getAttendanceList();
  var index = findRecordIndex(list, session.id, today);

  var statusText = document.getElementById("todayStatus");
  var inBtn = document.getElementById("checkInBtn");
  var outBtn = document.getElementById("checkOutBtn");

  if (index === -1) {
    // Aaj ka record nahi: sirf check-in ho sakta hai
    statusText.innerHTML = "Aaj abhi check-in nahi hua.";
    inBtn.disabled = false;
    outBtn.disabled = true;
  } else {
    var record = list[index];

    if (record.checkOut === "") {
      // Check-in ho gaya, check-out baaki hai
      statusText.innerHTML = "Check-in: " + record.checkIn +
        " (" + statusLabel(record.status) + "). Check-out abhi baaki hai.";
      inBtn.disabled = true;
      outBtn.disabled = false;
    } else {
      // Dono ho chuke hain
      statusText.innerHTML = "Check-in: " + record.checkIn +
        ", Check-out: " + record.checkOut +
        " (" + statusLabel(record.status) + ")";
      inBtn.disabled = true;
      outBtn.disabled = true;
    }
  }

  showHistory(session.id);

  showMySummary(); 
  
}

// Employee ki apni attendance ki table banata hai (naya pehle).
function showHistory(userId) {
  var list = getAttendanceList();
  var html = "";
  var count = 0;

  // Peeche se loop chala kar naye records pehle dikhate hain
  for (var i = list.length - 1; i >= 0; i--) {
    if (list[i].userId === userId) {
      var record = list[i];
      var outText = record.checkOut === "" ? "-" : record.checkOut;

      html += "<tr>" +
        "<td>" + record.date + "</td>" +
        "<td>" + record.checkIn + "</td>" +
        "<td>" + outText + "</td>" +
        "<td>" + statusLabel(record.status) + "</td>" +
        "</tr>";
      count++;
    }
  }

  document.getElementById("attendanceBody").innerHTML = html;

  var noRecords = document.getElementById("noAttendance");
  if (count === 0) {
    noRecords.classList.remove("hidden");
  } else {
    noRecords.classList.add("hidden");
  }
}

// ================= Page shuru karna =================

// Ye sirf employee.html par chalega (jahan check-in button hai).
if (document.getElementById("checkInBtn") !== null) {
  var employeeSession = checkAccess("employee"); // sirf employee, Admin ko admin.html par bhejta hai

  if (employeeSession !== null) {
    document.getElementById("logoutBtn").addEventListener("click", logout);
    document.getElementById("checkInBtn").addEventListener("click", handleCheckIn);
    document.getElementById("checkOutBtn").addEventListener("click", handleCheckOut);
    refreshAttendancePage();
  }
}

////////////
// ================= Dashboard (Feature 8) =================

// Check karta hai ke ye user aaj (date) approved leave par hai ya nahi.
function isOnLeaveOn(leaveList, userId, date) {
  for (var i = 0; i < leaveList.length; i++) {
    var leave = leaveList[i];
    // Date text "YYYY-MM-DD" hai, isliye seedha string compare kar sakte hain
    if (leave.userId === userId && leave.status === "approved") {
      if (date >= leave.from && date <= leave.to) {
        return true;
      }
    }
  }
  return false;
}

// Admin dashboard: totals, aaj ki table aur sab records bharta hai.
function showAdminDashboard() {
  var users = getUsers();
  var today = getTodayDate();
  var attList = getAttendanceList();
  var leaveList = getLeaveList();

  // Totals ke liye counters
  var totalEmployees = 0;
  var checkedIn = 0;
  var lateToday = 0;
  var onLeave = 0;
  var pending = 0;
  var todayHtml = "";

  // Pehle sab users ka loop: sirf employees ginte hain
  for (var i = 0; i < users.length; i++) {
    var user = users[i];

    if (user.role === "employee") {
      totalEmployees++;

      var index = findRecordIndex(attList, user.id, today);
      var checkInText = "-";
      var checkOutText = "-";
      var statusText = "Abhi check-in nahi";

      if (index !== -1) {
        // Aaj ka record mila
        var record = attList[index];
        checkedIn++;
        checkInText = record.checkIn;
        if (record.checkOut !== "") {
          checkOutText = record.checkOut;
        }
        statusText = statusLabel(record.status);
        if (record.status === "late") {
          lateToday++;
        }
      } else if (isOnLeaveOn(leaveList, user.id, today)) {
        // Record nahi aur approved leave hai
        onLeave++;
        statusText = "Chhutti (approved)";
      }

      todayHtml += "<tr>" +
        "<td>" + user.name + "</td>" +
        "<td>" + user.department + "</td>" +
        "<td>" + checkInText + "</td>" +
        "<td>" + checkOutText + "</td>" +
        "<td>" + statusText + "</td>" +
        "</tr>";
    }
  }

  // Pending leaves ginna
  for (var j = 0; j < leaveList.length; j++) {
    if (leaveList[j].status === "pending") {
      pending++;
    }
  }

  // Totals screen par likho
  document.getElementById("statEmployees").innerHTML = totalEmployees;
  document.getElementById("statPresent").innerHTML = checkedIn;
  document.getElementById("statLate").innerHTML = lateToday;
  document.getElementById("statLeave").innerHTML = onLeave;
  document.getElementById("statPending").innerHTML = pending;

  // Aaj ki table
  document.getElementById("todayBody").innerHTML = todayHtml;

  // Sab attendance records (naye pehle)
  var allHtml = "";
  var users2 = getUsers(); // naam dhoondne ke liye
  for (var k = attList.length - 1; k >= 0; k--) {
    var rec = attList[k];
    var outText = rec.checkOut === "" ? "-" : rec.checkOut;

    allHtml += "<tr>" +
      "<td>" + findUserName(users2, rec.userId) + "</td>" +
      "<td>" + rec.date + "</td>" +
      "<td>" + rec.checkIn + "</td>" +
      "<td>" + outText + "</td>" +
      "<td>" + statusLabel(rec.status) + "</td>" +
      "</tr>";
  }
  document.getElementById("allAttendanceBody").innerHTML = allHtml;
}

// Employee ki is mahine ki summary (present, late, half day ginti).
function showMySummary() {
  var session = getSession();
  var month = getTodayDate().substring(0, 7); // "2026-10" jaisa text
  var list = getAttendanceList();

  var present = 0;
  var late = 0;
  var half = 0;

  for (var i = 0; i < list.length; i++) {
    var rec = list[i];
    // Sirf meri, aur is mahine ke records
    if (rec.userId === session.id && rec.date.substring(0, 7) === month) {
      if (rec.status === "present") {
        present++;
      } else if (rec.status === "late") {
        late++;
      } else if (rec.status === "half day") {
        half++;
      }
    }
  }

  document.getElementById("mySummary").innerHTML =
    "Is mahine: <strong>" + present + "</strong> present, " +
    "<strong>" + late + "</strong> late, " +
    "<strong>" + half + "</strong> half day.";
}

// Admin dashboard page par chalao (sirf jab stat boxes ho)
if (document.getElementById("statEmployees") !== null) {
  var dashAdminSession = checkAccess("admin");

  if (dashAdminSession !== null) {
    document.getElementById("logoutBtn").addEventListener("click", logout);
    showAdminDashboard();
  }
}

// Employee summary (sirf jab mySummary element ho)
if (document.getElementById("mySummary") !== null) {
  var dashEmpSession = checkAccess("employee");

  if (dashEmpSession !== null) {
    showMySummary();
  }
}

////////////////////////
// ================= Payslip (Feature 9) =================

// User ki id se user object dhoondta hai. Nahi mila to null.
function findUserById(users, id) {
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === id) {
      return users[i];
    }
  }
  return null;
}

// Kisi mahine (jaise "2026-10") ke kaam ke din kitne hain, ye ginta hai.
// Sirf wo din ginte hain jo aaj tak guzar chuke hain (ya poora mahina agar pichla hai).
// Mahine ke saare kaam ke din bhi return karta hai (per day nikalne ke liye).
function countWorkingDaysInMonth(monthText) {
  var company = getCompany();
  var days = company.workingDays;
  if (days === undefined) {
    days = [1, 2, 3, 4, 5]; // default Mon se Fri
  }

  var parts = monthText.split("-");
  var year = Number(parts[0]);
  var monthIndex = Number(parts[1]) - 1; // January = 0

  // Mahine ka aakhri din (day 0 agle mahine ka aakhri din hota hai, isliye trick)
  var lastDay = new Date(year, monthIndex + 1, 0).getDate();

  var total = 0;       // poore mahine ke kaam ke din
  var passed = 0;      // aaj tak guzre kaam ke din
  var todayMonth = getTodayDate().substring(0, 7);

  // Kitne din tak ginti karni hai
  var countUntil = 0;
  if (monthText < todayMonth) {
    countUntil = lastDay;        // pichla mahina: poora mahina
  } else if (monthText === todayMonth) {
    countUntil = Number(getTodayDate().substring(8, 10)); // is mahine: aaj tak
  }

  for (var d = 1; d <= lastDay; d++) {
    var dayNumber = new Date(year, monthIndex, d).getDay();
    if (listHasNumber(days, dayNumber)) {
      total++;
      if (d <= countUntil) {
        passed++;
      }
    }
  }

  return { total: total, passed: passed };
}

// Ek employee ke ek mahine ki pori calculation karta hai.
function calculatePayslip(userId, salary, monthText) {
  var workDays = countWorkingDaysInMonth(monthText);
  var attList = getAttendanceList();
  var leaveList = getLeaveList();

  var company = getCompany();
  var days = company.workingDays;
  if (days === undefined) {
    days = [1, 2, 3, 4, 5];
  }

  var parts = monthText.split("-");
  var year = Number(parts[0]);
  var monthIndex = Number(parts[1]) - 1;
  var lastDay = new Date(year, monthIndex + 1, 0).getDate();

  var present = 0; // poore din (present aur late)
  var half = 0;    // half day
  var absent = 0;  // absent din

  // Har din check karo
  for (var d = 1; d <= lastDay; d++) {
    var dateText = monthText + "-" + pad2(d);
    var dayNumber = new Date(year, monthIndex, d).getDay();

    // Sirf kaam ke din ginte hain
    if (!listHasNumber(days, dayNumber)) {
      continue; // is din ko chhod kar agle din par jao
    }

    // Abhi guzra nahi, is ko mat gino
    if (dateText > getTodayDate()) {
      continue;
    }

    var index = findRecordIndex(attList, userId, dateText);

    if (index !== -1) {
      // Record hai
      if (attList[index].status === "half day") {
        half++;
      } else {
        present++; // present ya late dono poora din
      }
    } else if (isOnLeaveOn(leaveList, userId, dateText)) {
      // Approved leave: absent nahi, ye paid hai
    } else {
      absent++; // na check-in, na leave: absent
    }
  }

  // Per day salary (mahine ke kaam ke din se bhaag do)
  var perDay = 0;
  if (workDays.total > 0) {
    perDay = salary / workDays.total;
  }

  var deduction = perDay * (absent + 0.5 * half);
  var net = salary - deduction;

  return {
    salary: salary,
    workDays: workDays.total,
    present: present,
    half: half,
    absent: absent,
    perDay: perDay,
    deduction: deduction,
    net: net
  };
}

// Screen par slip ka table banata hai.
function showPayslip() {
  var session = getSession();
  var monthText = document.getElementById("monthPicker").value;
  var body = document.getElementById("payslipBody");

  if (monthText === "") {
    body.innerHTML = "Mahina chunein.";
    return;
  }

  // Kis ki slip dikhani hai? Admin dropdown se, employee khud.
  var targetId = session.id;
  if (session.role === "admin") {
    var pick = document.getElementById("empSelect").value;
    if (pick === "") {
      body.innerHTML = "Pehle employee chunein.";
      return;
    }
    targetId = Number(pick);
  }

  var users = getUsers();
  var user = findUserById(users, targetId);
  if (user === null) {
    body.innerHTML = "Employee nahi mila.";
    return;
  }

  var slip = calculatePayslip(user.id, user.salary, monthText);

  // Numbers ko achha dikhane ke liye round karte hain
  var perDayText = Math.round(slip.perDay);
  var deductionText = Math.round(slip.deduction);
  var netText = Math.round(slip.net);

  body.innerHTML =
    "<h3>" + user.name + " (" + user.department + ")</h3>" +
    "<p class='hint'>Mahina: " + monthText + "</p>" +
    "<table>" +
      "<tbody>" +
        "<tr><td>Monthly salary</td><td>" + slip.salary + "</td></tr>" +
        "<tr><td>Kaam ke din (mahine ke)</td><td>" + slip.workDays + "</td></tr>" +
        "<tr><td>Present din</td><td>" + slip.present + "</td></tr>" +
        "<tr><td>Half day</td><td>" + slip.half + "</td></tr>" +
        "<tr><td>Absent din</td><td>" + slip.absent + "</td></tr>" +
        "<tr><td>Per day salary</td><td>" + perDayText + "</td></tr>" +
        "<tr><td>Deduction</td><td>" + deductionText + "</td></tr>" +
        "<tr class='net-row'><td><strong>Net salary</strong></td><td><strong>" + netText + "</strong></td></tr>" +
      "</tbody>" +
    "</table>";
}

// Admin ke dropdown mein sirf employees ke naam bharta hai.
function fillEmployeeDropdown() {
  var users = getUsers();
  var select = document.getElementById("empSelect");
  var html = "<option value=''>-- Employee chunein --</option>";

  for (var i = 0; i < users.length; i++) {
    if (users[i].role === "employee") {
      html += "<option value='" + users[i].id + "'>" + users[i].name + "</option>";
    }
  }
  select.innerHTML = html;
}

// Payslip page shuru karna
if (document.getElementById("payslipBody") !== null) {
  var paySession = getSession();

  // Login nahi hai to login page par bhejo
  if (paySession === null) {
    window.location.href = "index.html";
  } else {
    // Logout button
    document.getElementById("logoutBtn").addEventListener("click", logout);

    // Mahina: aaj ka mahina default
    document.getElementById("monthPicker").value = getTodayDate().substring(0, 7);
    document.getElementById("monthPicker").addEventListener("change", showPayslip);

    // Print button: browser ka print (yahan se PDF bhi save ho sakti hai)
    document.getElementById("printBtn").addEventListener("click", function () {
      window.print();
    });

    if (paySession.role === "admin") {
      // Admin: employee chunne ka dropdown dikhao
      document.getElementById("adminPick").classList.remove("hidden");
      document.getElementById("adminNavLinks").classList.remove("hidden");
      fillEmployeeDropdown();
      document.getElementById("empSelect").addEventListener("change", showPayslip);
    } else {
      // Employee: sirf apni slip
      document.getElementById("empNavLinks").classList.remove("hidden");
    }

    showPayslip();
  }
}