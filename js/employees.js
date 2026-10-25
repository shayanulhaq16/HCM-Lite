// employees.js
// Feature 4: Admin employees ko add, edit, delete, search aur department filter karta hai.
// Joining date, security sawal aur admin password reset bhi yahin hai.

// Pehle check karo ke user Admin hai ya nahi.
// Agar Admin nahi hai to checkAccess (auth.js) khud usay uske dashboard par bhej dega.
var adminSession = checkAccess("admin");

// Agar Admin hai to page ka kaam shuru karo.
if (adminSession !== null) {
  setupEmployeesPage();
}

// Page ke buttons, form aur search par events lagata hai.
function setupEmployeesPage() {
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("employeeForm").addEventListener("submit", handleEmployeeSave);
  document.getElementById("cancelBtn").addEventListener("click", resetForm);
  document.getElementById("searchInput").addEventListener("input", showEmployees);
  document.getElementById("deptFilter").addEventListener("change", showEmployees);

  fillDepartmentFilter(); // department dropdown bharo
  showEmployees();        // employees ki list dikhao
}

// ================= Helper functions =================

// Sirf role "employee" wale users ki list banata hai (Admin is mein nahi aata).
function getEmployeeList() {
  var users = getUsers();
  var list = [];

  for (var i = 0; i < users.length; i++) {
    if (users[i].role === "employee") {
      list.push(users[i]);
    }
  }
  return list;
}

// Users list mein us id ka index dhoondta hai. Nahi mila to -1.
function findUserIndex(id) {
  var users = getUsers();

  for (var i = 0; i < users.length; i++) {
    if (users[i].id === id) {
      return i;
    }
  }
  return -1;
}

// Check karta hai ke email kisi aur user ke paas to nahi.
// ignoreId wale user ko chhod deta hai (edit ke waqt apni hi email rakhna theek hai).
function isEmailTakenExcept(email, ignoreId) {
  var users = getUsers();
  var target = email.toLowerCase();

  for (var i = 0; i < users.length; i++) {
    if (users[i].id !== ignoreId && users[i].email.toLowerCase() === target) {
      return true;
    }
  }
  return false;
}

// Form ke saare error messages khali karta hai.
function clearEmpErrors() {
  var ids = [
    "errEmpName",
    "errEmpEmail",
    "errEmpPassword",
    "errEmpDepartment",
    "errEmpSalary",
    "errEmpJoin",
    "errEmpSecAnswer"
  ];

  for (var i = 0; i < ids.length; i++) {
    document.getElementById(ids[i]).innerHTML = "";
  }
}

// Form ko naye employee ke liye tayyar karta hai (edit mode band).
function resetForm() {
  document.getElementById("employeeForm").reset();
  document.getElementById("editId").value = "";
  document.getElementById("formTitle").innerHTML = "Naya employee add karein";
  document.getElementById("saveBtn").innerHTML = "Save karein";
  document.getElementById("cancelBtn").classList.add("hidden");
  clearEmpErrors();
}

// ================= Save (add ya update) =================

// Form submit hone par chalta hai. Add bhi karta hai aur edit bhi.
function handleEmployeeSave(event) {
  event.preventDefault(); // page reload roko

  clearEmpErrors();
  document.getElementById("empMessage").innerHTML = "";

  var editId = document.getElementById("editId").value;
  var isEditing = editId !== "";

  var name = document.getElementById("empName").value.trim();
  var email = document.getElementById("empEmail").value.trim();
  var password = document.getElementById("empPassword").value;
  var department = document.getElementById("empDepartment").value.trim();
  var salaryText = document.getElementById("empSalary").value;
  var salary = Number(salaryText);
  var joinDate = document.getElementById("empJoin").value; // "YYYY-MM-DD" ya khali

  // Security sawal: naye employee ke liye zaroori, edit mein khali chhod sakte hain
  var recovery = readRecovery("empSecQuestion", "empSecAnswer", "errEmpSecAnswer", !isEditing);

  var ignoreId = isEditing ? Number(editId) : -1;

  var hasError = false;

  if (name === "") {
    showError("errEmpName", "Naam likhna zaroori hai.");
    hasError = true;
  }

  if (!isValidEmail(email)) {
    showError("errEmpEmail", "Sahi email likhein (jaise abc@mail.com).");
    hasError = true;
  }

  if (!isEditing && password === "") {
    showError("errEmpPassword", "Password likhein.");
    hasError = true;
  } else if (password !== "" && password.length < 6) {
    showError("errEmpPassword", "Password kam se kam 6 characters ka ho.");
    hasError = true;
  }

  if (department === "") {
    showError("errEmpDepartment", "Department likhein.");
    hasError = true;
  }

  if (salaryText === "" || salary <= 0) {
    showError("errEmpSalary", "Salary 0 se zyada honi chahiye.");
    hasError = true;
  }

  // Joining date zaroori hai
  if (joinDate === "") {
    showError("errEmpJoin", "Joining date chunein.");
    hasError = true;
  }

  if (recovery === null) {
    hasError = true;
  }

  if (hasError) {
    return;
  }

  if (isEmailTakenExcept(email, ignoreId)) {
    showError("errEmpEmail", "Ye email pehle se use ho chuka hai.");
    return;
  }

  var users = getUsers();

  if (isEditing) {
    var index = findUserIndex(Number(editId));
    if (index === -1) {
      showError("errEmpName", "Employee nahi mila. Dobara koshish karein.");
      return;
    }

    users[index].name = name;
    users[index].email = email;
    users[index].department = department;
    users[index].salary = salary;
    users[index].joinDate = joinDate;

    // Password sirf tab badlo jab naya likha ho
    if (password !== "") {
      users[index].password = password;
    }

    // Security sawal sirf tab badlo jab naya jawab likha ho
    if (recovery.answer !== "") {
      users[index].securityQuestion = recovery.question;
      users[index].securityAnswer = recovery.answer;
    }

    saveUsers(users);
    document.getElementById("empMessage").innerHTML = "Employee ki maloomat update ho gayi.";
  } else {
    users.push({
      id: newId(),
      name: name,
      email: email,
      password: password,
      role: "employee",
      department: department,
      salary: salary,
      joinDate: joinDate,
      securityQuestion: recovery.question,
      securityAnswer: recovery.answer
    });

    saveUsers(users);
    document.getElementById("empMessage").innerHTML = "Naya employee add ho gaya.";
  }

  resetForm();
  fillDepartmentFilter();
  showEmployees();
}

// ================= Edit aur Delete =================

// Edit button par chalta hai. Employee ki maloomat form mein bhar deta hai.
function startEdit(id) {
  var index = findUserIndex(id);
  if (index === -1) {
    return;
  }

  var user = getUsers()[index];
  clearEmpErrors();

  document.getElementById("editId").value = user.id;
  document.getElementById("empName").value = user.name;
  document.getElementById("empEmail").value = user.email;
  document.getElementById("empPassword").value = "";
  document.getElementById("empDepartment").value = user.department;
  document.getElementById("empSalary").value = user.salary;
  document.getElementById("empJoin").value = user.joinDate || ""; // purane employees ke liye khali
  document.getElementById("empSecAnswer").value = ""; // jawab dikhate nahi

  document.getElementById("formTitle").innerHTML = "Employee edit karein";
  document.getElementById("saveBtn").innerHTML = "Update karein";
  document.getElementById("cancelBtn").classList.remove("hidden");
  document.getElementById("empMessage").innerHTML = "";

  window.scrollTo(0, 0);
}

// Delete button par chalta hai. Confirm karke employee ko list se hatata hai.
function deleteEmployee(id) {
  var sure = confirm("Kya aap is employee ko delete karna chahte hain?");
  if (sure === false) {
    return; // "Cancel" dabaya
  }

  var users = getUsers();
  var newList = [];

  // Sirf wo users rakho jinki id delete wali id se alag ho
  for (var i = 0; i < users.length; i++) {
    if (users[i].id !== id) {
      newList.push(users[i]);
    }
  }

  saveUsers(newList);

  // Agar yehi employee form mein edit ho raha tha to form khali karo
  if (document.getElementById("editId").value === String(id)) {
    resetForm();
  }

  document.getElementById("empMessage").innerHTML = "Employee delete ho gaya.";
  fillDepartmentFilter();
  showEmployees();
}

// Admin kisi employee ka password reset karta hai (employee bhool gaya ho to).
function resetEmployeePassword(id) {
  var newPass = prompt("Employee ka naya password likhein (kam se kam 6 characters):");

  if (newPass === null) {
    return; // Cancel dabaya
  }

  if (newPass.length < 6) {
    document.getElementById("empMessage").innerHTML = "Password kam se kam 6 characters ka ho.";
    return;
  }

  var users = getUsers();
  var index = findUserIndex(id);
  if (index === -1) {
    return;
  }

  users[index].password = newPass;
  saveUsers(users);
  document.getElementById("empMessage").innerHTML = "Employee ka password reset ho gaya.";
}

// ================= Search aur filter =================

// Department dropdown ko current employees ke departments se bharta hai.
function fillDepartmentFilter() {
  var list = getEmployeeList();
  var departments = []; // sirf unique department names

  for (var i = 0; i < list.length; i++) {
    if (departments.indexOf(list[i].department) === -1) {
      departments.push(list[i].department);
    }
  }

  var filter = document.getElementById("deptFilter");
  var current = filter.value; // pehle jo chuna tha wo yaad rakho

  // Pehla option "Sab departments" hoga
  var html = "<option value=''>Sab departments</option>";

  for (var j = 0; j < departments.length; j++) {
    html += "<option value='" + departments[j] + "'>" + departments[j] + "</option>";
  }

  filter.innerHTML = html;
  filter.value = current; // purana chuna hua wapas (agar ab bhi maujood hai)
}

// Employees ki table banata hai, search aur department filter ke hisaab se.
function showEmployees() {
  var search = document.getElementById("searchInput").value.trim().toLowerCase();
  var dept = document.getElementById("deptFilter").value;

  var list = getEmployeeList();
  var html = "";
  var count = 0; // kitne employees dikh rahe hain

  for (var i = 0; i < list.length; i++) {
    var emp = list[i];

    // Naam aur email ko ek saath chhote letters mein dekhte hain
    var text = (emp.name + " " + emp.email).toLowerCase();
    var matchSearch = search === "" || text.indexOf(search) !== -1;
    var matchDept = dept === "" || emp.department === dept;

    if (matchSearch && matchDept) {
      count++;

      html += "<tr>" +
        "<td>" + emp.name + "</td>" +
        "<td>" + emp.email + "</td>" +
        "<td>" + emp.department + "</td>" +
        "<td>" + emp.salary + "</td>" +
        "<td>" +
          "<button type='button' class='small-btn' onclick='startEdit(" + emp.id + ")'>Edit</button>" +
          "<button type='button' class='small-btn' onclick='resetEmployeePassword(" + emp.id + ")'>Reset</button>" +
          "<button type='button' class='small-btn danger-btn' onclick='deleteEmployee(" + emp.id + ")'>Delete</button>" +
        "</td>" +
        "</tr>";
    }
  }

  document.getElementById("employeeBody").innerHTML = html;
  document.getElementById("countText").innerHTML = "Dikh rahe hain: " + count;

  // Koi employee nahi mila to message dikhao
  var noResults = document.getElementById("noResults");
  if (count === 0) {
    noResults.classList.remove("hidden");
  } else {
    noResults.classList.add("hidden");
  }
}