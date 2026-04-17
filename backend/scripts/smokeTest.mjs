const base = "http://localhost:5000";
const email = "timetable.student01@erp.local";
const password = "Student@123";

function logStep(name, pass, details = "") {
  const status = pass ? "PASS" : "FAIL";
  console.log(`[${status}] ${name}`);
  if (details) console.log(`  ${details}`);
}

async function request(path, options = {}) {
  const res = await fetch(`${base}${path}`, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { res, data };
}

try {
  // 1) login
  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const token = login.data?.token;
  logStep("POST /api/auth/login", login.res.ok && !!token, `status=${login.res.status}`);
  if (!login.res.ok || !token) {
    throw new Error(`Login failed: ${JSON.stringify(login.data)}`);
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  // 2) catalog
  const catalog = await request("/api/courses/course-catalog?semester=Spring&year=2026", {
    headers: authHeaders,
  });
  const offerings = Array.isArray(catalog.data?.offerings) ? catalog.data.offerings : [];
  logStep(
    "GET /api/courses/course-catalog?semester=Spring&year=2026",
    catalog.res.ok && offerings.length > 0,
    `status=${catalog.res.status}, offerings=${offerings.length}`,
  );

  // 3) enroll
  const enrolledList = await request("/api/enrollments?status=Enrolled&semester=Spring&year=2026", {
    headers: authHeaders,
  });
  const enrolledIds = new Set(
    (enrolledList.data?.enrollments || [])
      .map((e) => e?.courseOfferingId?._id)
      .filter(Boolean),
  );

  let target = offerings.find((o) => o?.status === "Open" && !enrolledIds.has(o?._id));
  if (!target) target = offerings.find((o) => o?.status === "Open");

  let enrollPass = false;
  let enrollDetails = "";
  if (target?._id) {
    const enroll = await request(`/api/enrollments/enroll/${target._id}`, {
      method: "POST",
      headers: authHeaders,
    });
    const msg = String(enroll.data?.message || "").toLowerCase();
    enrollPass = enroll.res.status === 201 || (enroll.res.status === 409 && msg.includes("already"));
    enrollDetails = `status=${enroll.res.status}, offering=${target._id}, message=${enroll.data?.message || "n/a"}`;
  } else {
    enrollPass = false;
    enrollDetails = "no open offering found";
  }
  logStep("POST /api/enrollments/enroll/:id", enrollPass, enrollDetails);

  // 4) list enrollments
  const list = await request("/api/enrollments", { headers: authHeaders });
  const count = Array.isArray(list.data?.enrollments) ? list.data.enrollments.length : 0;
  logStep("GET /api/enrollments", list.res.ok, `status=${list.res.status}, enrollments=${count}`);

  // 5) timetable
  const tt = await request("/api/enrollments/timetable?semester=Spring&year=2026", {
    headers: authHeaders,
  });
  const weekly = tt.data?.weekly || {};
  const blockCount = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    .map((d) => (Array.isArray(weekly[d]) ? weekly[d].length : 0))
    .reduce((a, b) => a + b, 0);
  const conflicts = Array.isArray(tt.data?.conflicts) ? tt.data.conflicts.length : 0;
  logStep(
    "GET /api/enrollments/timetable?semester=Spring&year=2026",
    tt.res.ok && weekly,
    `status=${tt.res.status}, classBlocks=${blockCount}, conflicts=${conflicts}`,
  );

  console.log("\nSmoke test finished.");
} catch (error) {
  console.log("[FAIL] Smoke test aborted");
  console.log(`  ${error.message}`);
  process.exitCode = 1;
}
